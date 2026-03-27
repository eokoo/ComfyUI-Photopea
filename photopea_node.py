import torch
import numpy as np
from PIL import Image
import folder_paths
import os

class PhotopeaNode:
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "photopea_filename": ("STRING", {"default": ""}),
            },
        }

    # 输出类型保持为 IMAGE
    RETURN_TYPES = ("IMAGE", "MASK")
    FUNCTION = "execute_photopea"
    CATEGORY = "image/edit"

    def execute_photopea(self, photopea_filename):
        if not photopea_filename:
            return (torch.zeros([1, 64, 64, 4]), torch.zeros([1, 64, 64]))

        output_dir = folder_paths.get_output_directory()
        img_path = os.path.join(output_dir, photopea_filename)

        if not os.path.exists(img_path):
            return (torch.zeros([1, 64, 64, 4]), torch.zeros([1, 64, 64]))

        # 1. 核心修改：使用 RGBA 模式保留透明度
        img = Image.open(img_path).convert("RGBA")
        
        # 转换为 ComfyUI 标准的 [B, H, W, C] Tensor
        image_np = np.array(img).astype(np.float32) / 255.0
        image_tensor = torch.from_numpy(image_np)[None,]
        
        # 提取 Mask (Alpha 通道)
        if img.mode == 'RGBA':
            mask = 1.0 - image_tensor[:, :, :, 3] # ComfyUI Mask 逻辑通常是 1 为遮罩
        else:
            mask = torch.zeros([1, img.height, img.width])

        return (image_tensor, mask)

NODE_CLASS_MAPPINGS = {
    "PhotopeaNode": PhotopeaNode
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "PhotopeaNode": "ww Photopea"
}