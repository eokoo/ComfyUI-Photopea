### 节点版photopea

直接在comfyui节点上界面上编辑图像，使用在线photopea嵌入节点，随时编辑修改图像传入后续节点。

### 使用方法

1，拖入图像到此处。

<img width="3421" height="1499" alt="屏幕截图 2026-03-27 184717" src="https://github.com/user-attachments/assets/b1e0caee-6a72-4054-9479-af10c715435e" />


2，编辑完成后，点击【准备图像输出】即可，此时编辑后的图像已经在后台准备好传入下个节点。

<img width="1678" height="1586" alt="ScreenShot_2026-03-27_201107_964" src="https://github.com/user-attachments/assets/39b62169-b219-444d-82f9-21bfb37ba5ba" />


### 安装方法

```
cd ComfyUI/custom_nodes
git clone https://github.com/eokoo/ComfyUI-Photopea.git
```
##### 已知bug

切换其他工作流时，该节点会重置
