#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ComfyUI 客户端工具 (comfyui_client.py)
用于从远端服务器调用本地 ComfyUI 进行图像生成

使用方法:
    from comfyui_client import ComfyUIClient
    client = ComfyUIClient(server_address="192.168.1.141:8188")
    img_data, filename = client.text_to_image(
        positive_prompt="a beautiful landscape",
        negative_prompt="low quality"
    )
"""

import json
import uuid
import urllib.request
import urllib.parse
import urllib.error
import time
import os
import sys
import struct

# ============================================================
# ComfyUI 客户端类
# ============================================================
class ComfyUIClient:
    """ComfyUI REST API 客户端"""

    def __init__(self, server_address="127.0.0.1:8188", timeout=300):
        """
        初始化客户端

        Args:
            server_address: ComfyUI 服务器地址 (host:port)
            timeout: 请求超时时间（秒），默认300秒（5分钟）
        """
        self.server_address = server_address
        self.client_id = str(uuid.uuid4())
        self.timeout = timeout
        self.base_url = f"http://{server_address}"

    # --------------------------------------------------------
    # 核心 API 方法
    # --------------------------------------------------------
    def queue_prompt(self, prompt_workflow):
        """
        向 ComfyUI 发送工作流任务

        Args:
            prompt_workflow: ComfyUI API 格式的 JSON 工作流

        Returns:
            dict: 包含 prompt_id 的响应
        """
        payload = {
            "prompt": prompt_workflow,
            "client_id": self.client_id
        }
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            f"{self.base_url}/prompt",
            data=data,
            headers={'Content-Type': 'application/json'}
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                return json.loads(response.read())
        except urllib.error.URLError as e:
            print(f"[错误] 无法连接到 ComfyUI 服务器: {e}")
            raise

    def get_history(self, prompt_id):
        """
        查询任务历史/结果

        Args:
            prompt_id: 任务ID

        Returns:
            dict: 任务历史信息
        """
        url = f"{self.base_url}/history/{prompt_id}"
        try:
            with urllib.request.urlopen(url, timeout=self.timeout) as response:
                return json.loads(response.read())
        except urllib.error.URLError as e:
            print(f"[错误] 查询历史失败: {e}")
            raise

    def get_image(self, filename, subfolder="", folder_type="output"):
        """
        从 ComfyUI 获取生成的图像

        Args:
            filename: 文件名
            subfolder: 子文件夹
            folder_type: 文件夹类型 (output/input/temp)

        Returns:
            bytes: 图像二进制数据
        """
        params = urllib.parse.urlencode({
            "filename": filename,
            "subfolder": subfolder,
            "type": folder_type
        })
        url = f"{self.base_url}/view?{params}"
        try:
            with urllib.request.urlopen(url, timeout=self.timeout) as response:
                return response.read()
        except urllib.error.URLError as e:
            print(f"[错误] 获取图像失败: {e}")
            raise

    def upload_image(self, filepath, overwrite=True):
        """
        上传图片到 ComfyUI（用于图生图）

        Args:
            filepath: 本地图片路径
            overwrite: 是否覆盖

        Returns:
            dict: 上传结果，包含服务器端文件名
        """
        filename = os.path.basename(filepath)
        with open(filepath, 'rb') as f:
            file_data = f.read()

        # 手动构建 multipart/form-data
        boundary = '----PythonBoundary' + uuid.uuid4().hex[:16]
        body = b''

        # image 字段
        body += f'--{boundary}\r\n'.encode()
        body += f'Content-Disposition: form-data; name="image"; filename="{filename}"\r\n'.encode()
        body += b'Content-Type: application/octet-stream\r\n\r\n'
        body += file_data
        body += b'\r\n'

        # overwrite 字段
        body += f'--{boundary}\r\n'.encode()
        body += b'Content-Disposition: form-data; name="overwrite"\r\n\r\n'
        body += str(overwrite).lower().encode()
        body += b'\r\n'

        body += f'--{boundary}--\r\n'.encode()

        req = urllib.request.Request(
            f"{self.base_url}/upload/image",
            data=body,
            headers={
                'Content-Type': f'multipart/form-data; boundary={boundary}'
            }
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                return json.loads(response.read())
        except urllib.error.URLError as e:
            print(f"[错误] 上传图片失败: {e}")
            raise

    def get_queue(self):
        """获取当前任务队列状态"""
        url = f"{self.base_url}/queue"
        try:
            with urllib.request.urlopen(url, timeout=self.timeout) as response:
                return json.loads(response.read())
        except urllib.error.URLError as e:
            print(f"[错误] 获取队列失败: {e}")
            raise

    # --------------------------------------------------------
    # 轮询等待任务完成
    # --------------------------------------------------------
    def wait_for_completion(self, prompt_id, poll_interval=2, max_wait=600):
        """
        轮询等待任务完成

        Args:
            prompt_id: 任务ID
            poll_interval: 轮询间隔（秒）
            max_wait: 最长等待时间（秒）

        Returns:
            dict: 任务输出信息
        """
        start_time = time.time()
        print(f"[等待] 任务 {prompt_id[:8]}... 正在生成中...")

        while time.time() - start_time < max_wait:
            history = self.get_history(prompt_id)
            if prompt_id in history:
                outputs = history[prompt_id].get('outputs', {})
                status = history[prompt_id].get('status', {})
                status_str = status.get('status_str', '')

                if status_str == 'error':
                    error_msg = status.get('messages', [])
                    print(f"[错误] 任务执行失败: {error_msg}")
                    raise RuntimeError(f"ComfyUI 任务失败: {error_msg}")

                if outputs:
                    elapsed = time.time() - start_time
                    print(f"[完成] 任务在 {elapsed:.1f} 秒内完成")
                    return outputs

            time.sleep(poll_interval)

        raise TimeoutError(f"任务超时: 等待超过 {max_wait} 秒")

    # --------------------------------------------------------
    # 高级接口: 文生图
    # --------------------------------------------------------
    def text_to_image(self, positive_prompt, negative_prompt="",
                      width=1024, height=1024, steps=25, cfg=7.0,
                      seed=None, sampler_name="euler",
                      scheduler="normal",
                      checkpoint="Juggernaut-XL_v9_RunDiffusionPhoto_v2.safetensors"):
        """
        文生图

        Args:
            positive_prompt: 正向提示词
            negative_prompt: 反向提示词
            width: 图像宽度
            height: 图像高度
            steps: 采样步数
            cfg: CFG 引导强度
            seed: 随机种子（None 为随机）
            sampler_name: 采样器名称
            scheduler: 调度器
            checkpoint: 模型文件名

        Returns:
            tuple: (image_bytes, filename)
        """
        if seed is None:
            import random
            seed = random.randint(0, 2**63 - 1)

        # 构建标准的 ComfyUI API 工作流
        workflow = {
            "1": {
                "class_type": "CheckpointLoaderSimple",
                "inputs": {
                    "ckpt_name": checkpoint
                }
            },
            "2": {
                "class_type": "CLIPTextEncode",
                "inputs": {
                    "text": positive_prompt,
                    "clip": ["1", 1]
                }
            },
            "3": {
                "class_type": "CLIPTextEncode",
                "inputs": {
                    "text": negative_prompt or "low quality, blurry, deformed",
                    "clip": ["1", 1]
                }
            },
            "4": {
                "class_type": "EmptyLatentImage",
                "inputs": {
                    "width": width,
                    "height": height,
                    "batch_size": 1
                }
            },
            "5": {
                "class_type": "KSampler",
                "inputs": {
                    "model": ["1", 0],
                    "positive": ["2", 0],
                    "negative": ["3", 0],
                    "latent_image": ["4", 0],
                    "seed": seed,
                    "steps": steps,
                    "cfg": cfg,
                    "sampler_name": sampler_name,
                    "scheduler": scheduler,
                    "denoise": 1.0
                }
            },
            "6": {
                "class_type": "VAEDecode",
                "inputs": {
                    "samples": ["5", 0],
                    "vae": ["1", 2]
                }
            },
            "7": {
                "class_type": "SaveImage",
                "inputs": {
                    "images": ["6", 0],
                    "filename_prefix": "ComfyUI_XiaoAi"
                }
            }
        }

        # 发送任务
        result = self.queue_prompt(workflow)
        prompt_id = result['prompt_id']
        print(f"[提交] 任务ID: {prompt_id}")

        # 等待完成
        outputs = self.wait_for_completion(prompt_id)

        # 提取图像
        for node_id, node_output in outputs.items():
            if 'images' in node_output:
                for img_info in node_output['images']:
                    img_data = self.get_image(
                        img_info['filename'],
                        img_info.get('subfolder', ''),
                        img_info.get('type', 'output')
                    )
                    return img_data, img_info['filename']

        raise RuntimeError("未找到输出图像")

    # --------------------------------------------------------
    # 高级接口: 图生图
    # --------------------------------------------------------
    def image_to_image(self, image_path, positive_prompt,
                       negative_prompt="", denoise=0.75,
                       width=1024, height=1024, steps=25, cfg=7.0,
                       seed=None, sampler_name="euler",
                       scheduler="normal",
                       checkpoint="Juggernaut-XL_v9_RunDiffusionPhoto_v2.safetensors"):
        """
        图生图

        Args:
            image_path: 输入图片路径
            positive_prompt: 正向提示词
            negative_prompt: 反向提示词
            denoise: 去噪强度 (0.0-1.0)
            其余参数同 text_to_image

        Returns:
            tuple: (image_bytes, filename)
        """
        if seed is None:
            import random
            seed = random.randint(0, 2**63 - 1)

        # 先上传图片
        upload_result = self.upload_image(image_path)
        uploaded_name = upload_result.get('name', os.path.basename(image_path))
        print(f"[上传] 图片已上传: {uploaded_name}")

        # 构建图生图工作流
        workflow = {
            "1": {
                "class_type": "CheckpointLoaderSimple",
                "inputs": {
                    "ckpt_name": checkpoint
                }
            },
            "2": {
                "class_type": "CLIPTextEncode",
                "inputs": {
                    "text": positive_prompt,
                    "clip": ["1", 1]
                }
            },
            "3": {
                "class_type": "CLIPTextEncode",
                "inputs": {
                    "text": negative_prompt or "low quality, blurry, deformed",
                    "clip": ["1", 1]
                }
            },
            "8": {
                "class_type": "LoadImage",
                "inputs": {
                    "image": uploaded_name
                }
            },
            "9": {
                "class_type": "VAEEncode",
                "inputs": {
                    "pixels": ["8", 0],
                    "vae": ["1", 2]
                }
            },
            "5": {
                "class_type": "KSampler",
                "inputs": {
                    "model": ["1", 0],
                    "positive": ["2", 0],
                    "negative": ["3", 0],
                    "latent_image": ["9", 0],
                    "seed": seed,
                    "steps": steps,
                    "cfg": cfg,
                    "sampler_name": sampler_name,
                    "scheduler": scheduler,
                    "denoise": denoise
                }
            },
            "6": {
                "class_type": "VAEDecode",
                "inputs": {
                    "samples": ["5", 0],
                    "vae": ["1", 2]
                }
            },
            "7": {
                "class_type": "SaveImage",
                "inputs": {
                    "images": ["6", 0],
                    "filename_prefix": "ComfyUI_XiaoAi_i2i"
                }
            }
        }

        # 发送任务
        result = self.queue_prompt(workflow)
        prompt_id = result['prompt_id']
        print(f"[提交] 图生图任务ID: {prompt_id}")

        # 等待完成
        outputs = self.wait_for_completion(prompt_id)

        # 提取图像
        for node_id, node_output in outputs.items():
            if 'images' in node_output:
                for img_info in node_output['images']:
                    img_data = self.get_image(
                        img_info['filename'],
                        img_info.get('subfolder', ''),
                        img_info.get('type', 'output')
                    )
                    return img_data, img_info['filename']

        raise RuntimeError("未找到输出图像")


# ============================================================
# 命令行入口
# ============================================================
def main():
    """命令行测试入口"""
    import argparse

    parser = argparse.ArgumentParser(description='ComfyUI 客户端工具')
    parser.add_argument('--server', default='ibubble.vicp.net:8188',
                        help='ComfyUI 服务器地址')
    parser.add_argument('--prompt', required=True,
                        help='正向提示词')
    parser.add_argument('--negative', default='low quality, blurry, deformed',
                        help='反向提示词')
    parser.add_argument('--output', default='output.png',
                        help='输出文件路径')
    parser.add_argument('--width', type=int, default=1024,
                        help='图像宽度')
    parser.add_argument('--height', type=int, default=1024,
                        help='图像高度')
    parser.add_argument('--steps', type=int, default=25,
                        help='采样步数')
    parser.add_argument('--cfg', type=float, default=7.0,
                        help='CFG 引导强度')
    parser.add_argument('--image', default=None,
                        help='输入图片路径（图生图模式）')

    args = parser.parse_args()

    client = ComfyUIClient(server_address=args.server)

    print(f"[连接] 服务器: {args.server}")
    print(f"[参数] 提示词: {args.prompt}")
    print(f"[参数] 尺寸: {args.width}x{args.height}, 步数: {args.steps}")

    if args.image:
        print(f"[模式] 图生图, 输入: {args.image}")
        img_data, filename = client.image_to_image(
            image_path=args.image,
            positive_prompt=args.prompt,
            negative_prompt=args.negative,
            width=args.width,
            height=args.height,
            steps=args.steps,
            cfg=args.cfg
        )
    else:
        print(f"[模式] 文生图")
        img_data, filename = client.text_to_image(
            positive_prompt=args.prompt,
            negative_prompt=args.negative,
            width=args.width,
            height=args.height,
            steps=args.steps,
            cfg=args.cfg
        )

    # 保存图片
    with open(args.output, 'wb') as f:
        f.write(img_data)
    print(f"[保存] 图像已保存到: {args.output} ({len(img_data)} 字节)")


if __name__ == '__main__':
    main()
