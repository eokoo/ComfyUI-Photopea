import { app } from "../../../scripts/app.js";
import { api } from "../../../scripts/api.js";

if (!window._PhotopeaManager) {
    window._PhotopeaManager = {
        container: null,
        iframe: null,
        currentNode: null,
        iframeActive: false,
        isFullscreen: false,
        
        init() {
            if (this.container) return;

            this.container = document.createElement("div");
            this.container.id = "photopea-global-container";
            
            this.container.style.cssText = `
                position: fixed;
                display: none;
                z-index: 1000;
                background: #1a1a1a;
                flex-direction: column;
                overflow: hidden;
                pointer-events: auto;
                box-sizing: border-box;
                transform-origin: top left;
                will-change: transform, top, left, width, height;
            `;

            const btnBar = document.createElement("div");
            btnBar.style.cssText = "display:flex; gap:10px; padding:5px 10px; background:#222; align-items:center; flex-shrink:0; height:35px;";

            const saveBtn = document.createElement("button");
            saveBtn.innerText = "💾 保存图像";
            saveBtn.style.cursor = "pointer";
            saveBtn.onclick = () => this.currentNode?.prepareOutput();

            const fullscreenBtn = document.createElement("button");
            fullscreenBtn.innerText = "🖥️ 全屏模式";
            fullscreenBtn.style.cursor = "pointer";
            fullscreenBtn.style.marginLeft = "auto";
            
            fullscreenBtn.onclick = () => {
                this.isFullscreen = !this.isFullscreen;
                if (this.isFullscreen) {
                    this.container.style.top = "0";
                    this.container.style.left = "0";
                    this.container.style.width = "100vw";
                    this.container.style.height = "100vh";
                    this.container.style.transform = "none";
                    this.container.style.border = "none";
                    fullscreenBtn.innerText = "✖ 退出全屏";
                } else {
                    fullscreenBtn.innerText = "🖥️ 全屏模式";
                    this.syncPositionWithNode(true); 
                }
            };

            const closeBtn = document.createElement("button");
            closeBtn.innerText = "✕ 隐藏";
            closeBtn.style.cssText = "padding: 3px 8px; cursor: pointer; background:#822; color:white; border:none;";
            closeBtn.onclick = () => {
                this.container.style.display = "none";
                this.iframeActive = false;
                this.currentNode = null;
            };

            this.iframe = document.createElement("iframe");
            this.iframe.src = "https://www.photopea.com#%7B%22fullScreen%22%3Atrue%7D";
            this.iframe.style.cssText = "flex:1; border:none; width:100%; height:100%;";

            btnBar.appendChild(saveBtn);
            btnBar.appendChild(fullscreenBtn);
            btnBar.appendChild(closeBtn);
            this.container.appendChild(btnBar);
            this.container.appendChild(this.iframe);
            document.body.appendChild(this.container);
        },

        // 修改后的同步逻辑：整体下移 20px
        syncPositionWithNode(force = false) {
            if (!this.currentNode || !this.container || (!this.iframeActive && !force) || this.isFullscreen) return;

            const ds = app.canvas.ds;
            const scale = ds.scale;
            
            const margin = 20; 
            const titleBarHeight = 35;
            const extraTopOffset = 20; // 额外向下移动的 20px

            // 计算位置：在原有基础上再加 extraTopOffset
            const clientX = (this.currentNode.pos[0] + ds.offset[0] + margin) * scale;
            const clientY = (this.currentNode.pos[1] + ds.offset[1] + titleBarHeight + margin + extraTopOffset) * scale;

            // 计算高度：因为整体下移了，高度需要再减去 extraTopOffset 以防超出底部
            const innerW = this.currentNode.size[0] - (margin * 2);
            const innerH = this.currentNode.size[1] - titleBarHeight - (margin * 2) - extraTopOffset;

            this.container.style.display = "flex";
            this.container.style.left = `${clientX}px`;
            this.container.style.top = `${clientY}px`;
            this.container.style.width = `${innerW}px`;
            this.container.style.height = `${innerH}px`;
            this.container.style.transform = `scale(${scale})`;
            this.container.style.border = "none";
        }
    };
    window._PhotopeaManager.init();
}

app.registerExtension({
    name: "Comfy.PhotopeaEmbedded.FinalCorrected",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name === "PhotopeaNode") {
            
            nodeType.prototype.onNodeCreated = function () {
                const filenameWidget = this.widgets.find(w => w.name === "photopea_filename");
                if (filenameWidget) filenameWidget.type = "hidden";
                
                const placeholder = document.createElement("div");
                placeholder.style.cssText = "width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#555; font-size:14px;";
                placeholder.innerHTML = "点击节点标题激活编辑器";
                
                this.addDOMWidget("photopea_ui", "editor", placeholder);
                this.size = [1000, 800]; 
            };

            nodeType.prototype.onSelected = function() {
                if (window._PhotopeaManager.currentNode !== this) {
                    window._PhotopeaManager.currentNode = this;
                    window._PhotopeaManager.iframeActive = true;
                    window._PhotopeaManager.syncPositionWithNode(true);
                }
            };

            nodeType.prototype.onDrawForeground = function() {
                if (window._PhotopeaManager.currentNode === this) {
                    window._PhotopeaManager.syncPositionWithNode();
                }
            };

            nodeType.prototype.onRemoved = function() {
                if (window._PhotopeaManager.currentNode === this) {
                    window._PhotopeaManager.container.style.display = "none";
                    window._PhotopeaManager.iframeActive = false;
                    window._PhotopeaManager.currentNode = null;
                }
            };

            nodeType.prototype.prepareOutput = async function() {
                const requestData = new Promise((resolve) => {
                    const handler = (e) => {
                        if (e.data instanceof ArrayBuffer) {
                            window.removeEventListener("message", handler);
                            resolve(e.data);
                        }
                    };
                    window.addEventListener("message", handler);
                });

                window._PhotopeaManager.iframe.contentWindow.postMessage('app.activeDocument.saveToOE("png");', "*");
                const buffer = await requestData;
                const blob = new Blob([buffer], { type: "image/png" });
                const filename = `photopea_${Date.now()}.png`;
                
                const formData = new FormData();
                formData.append("image", blob, filename);
                formData.append("type", "output"); 
                
                const resp = await api.fetchApi("/upload/image", { method: "POST", body: formData });
                if (resp.status === 200) {
                    const result = await resp.json();
                    const widget = this.widgets.find(w => w.name === "photopea_filename");
                    if (widget) {
                        widget.value = result.name; 
                        app.canvas.setDirty(true);
                    }
                }
            };
        }
    }
});