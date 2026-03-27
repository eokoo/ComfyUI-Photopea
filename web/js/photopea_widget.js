import { app } from "../../../scripts/app.js";
import { api } from "../../../scripts/api.js";

app.registerExtension({
    name: "Comfy.PhotopeaEmbedded.Fullscreen",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "PhotopeaNode") {
            
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                onNodeCreated?.apply(this, arguments);

                const filenameWidget = this.widgets.find(w => w.name === "photopea_filename");
                if (filenameWidget) filenameWidget.type = "hidden";

                // 1. 创建主容器
                const container = document.createElement("div");
                container.style.width = "100%";
                container.style.height = "1000px"; 
                container.style.display = "flex";
                container.style.flexDirection = "column";
                container.style.background = "#1a1a1a";
                container.style.transition = "all 0.2s ease"; // 添加平滑过渡

                const iframe = document.createElement("iframe");
                iframe.src = "https://www.photopea.com#%7B%22fullScreen%22%3Atrue%7D";
                iframe.style.flex = "1";
                iframe.style.border = "none";
                
                // 2. 按钮栏
                const btnBar = document.createElement("div");
                btnBar.style.display = "flex";
                btnBar.style.gap = "10px";
                btnBar.style.padding = "10px";
                btnBar.style.background = "#222";

                // 保存按钮
                const saveBtn = document.createElement("button");
                saveBtn.innerText = "💾 准备图像输出";
                saveBtn.className = "photopea-btn save";
                saveBtn.onclick = () => this.prepareOutput();

                // --- 需求：全屏切换按钮 ---
                const fullscreenBtn = document.createElement("button");
                fullscreenBtn.innerText = "🖥️ 全屏编辑";
                fullscreenBtn.className = "photopea-btn fullscreen";
                
                let isFullscreen = false;
                fullscreenBtn.onclick = () => {
                    isFullscreen = !isFullscreen;
                    if (isFullscreen) {
                        // 进入全屏模式：脱离节点布局，覆盖整个屏幕
                        container.style.position = "fixed";
                        container.style.top = "0";
                        container.style.left = "0";
                        container.style.width = "100vw";
                        container.style.height = "100vh";
                        container.style.zIndex = "9999";
                        fullscreenBtn.innerText = "✖ 退出全屏";
                        fullscreenBtn.style.backgroundColor = "#882222";
                    } else {
                        // 恢复节点模式
                        container.style.position = "relative";
                        container.style.width = "100%";
                        container.style.height = "1000px";
                        container.style.zIndex = "auto";
                        fullscreenBtn.innerText = "🖥️ 全屏编辑";
                        fullscreenBtn.style.backgroundColor = "#444";
                    }
                };

                btnBar.appendChild(saveBtn);
                btnBar.appendChild(fullscreenBtn);
                container.appendChild(btnBar);
                container.appendChild(iframe);

                this.addDOMWidget("photopea_ui", "editor", container);
                this.iframe = iframe;
                this.size = [1200, 1100];
            };

            // 图像处理逻辑（保留 RGBA）
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

                this.iframe.contentWindow.postMessage('app.activeDocument.saveToOE("png");', "*");
                const buffer = await requestData;
                const blob = new Blob([buffer], { type: "image/png" });
                const filename = `photopea_rgba_${Date.now()}.png`;
                
                const formData = new FormData();
                formData.append("image", blob, filename);
                formData.append("type", "output"); 
                
                const resp = await api.fetchApi("/upload/image", { method: "POST", body: formData });
                if (resp.status === 200) {
                    const result = await resp.json();
                    const widget = this.widgets.find(w => w.name === "photopea_filename");
                    if (widget) {
                        widget.value = result.name; 
                        console.log("图像已就绪:", result.name);
                        // 闪烁一下保存按钮提示成功
                        const btn = this.widgets[0].element.querySelector(".save");
                        if(btn) btn.innerText = "✅ 已准备好";
                        setTimeout(() => { if(btn) btn.innerText = "💾 准备图像输出"; }, 2000);
                    }
                }
            };
        }
    }
});