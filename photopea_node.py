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

    RETURN_TYPES = ("IMAGE", "MASK")
    FUNCTION = "execute_photopea"
    CATEGORY = "image/edit"

    def execute_photopea(self, photopea_filename):
        if not photopea_filename:
            return (torch.zeros([1, 64, 64, 3]), torch.zeros([1, 64, 64]))

        # --- 修改点：路径直接指向标准的 input 根目录 ---
        input_dir = folder_paths.get_input_directory()
        img_path = os.path.join(input_dir, photopea_filename)

        if not os.path.exists(img_path):
            print(f"Photopea: 找不到文件 {img_path}")
            return (torch.zeros([1, 64, 64, 3]), torch.zeros([1, 64, 64]))

        img = Image.open(img_path).convert("RGBA")
        image_np = np.array(img).astype(np.float32) / 255.0
        
        # 提取 RGB 图像
        rgb_tensor = torch.from_numpy(image_np[:, :, :3])[None,]
        
        # 提取 Mask (Alpha)
        mask_np = image_np[:, :, 3]
        mask_tensor = 1.0 - torch.from_numpy(mask_np)

        return (rgb_tensor, mask_tensor)

NODE_CLASS_MAPPINGS = {
    "PhotopeaNode": PhotopeaNode
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "PhotopeaNode": "ww Photopea"
}