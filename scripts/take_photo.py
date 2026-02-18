#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
take_photo.py - 惩罚记录拍照工具
通过 ComfyUI (小妮姐姐) 生成高质量图像，并保存到 .secret/ 目录

使用方法:
    python3 take_photo.py --prompt "描述" --name "文件名前缀"
    python3 take_photo.py --prompt "a girl kneeling" --name "test_photo"

    # 图生图模式
    python3 take_photo.py --prompt "描述" --name "文件名前缀" --input "/path/to/image.jpg"
"""

import os
import sys
import time
import argparse
import json
from datetime import datetime

# 将 scripts 目录加入路径
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

from comfyui_client import ComfyUIClient

# ============================================================
# 配置
# ============================================================
COMFYUI_SERVER = "127.0.0.1:8188"
SECRET_DIR = "/www/wwwroot/ibubble.vicp.net/.secret"
DEFAULT_CHECKPOINT = "Juggernaut-XL_v9_RunDiffusionPhoto_v2.safetensors"

# 默认反向提示词（通用质量控制）
DEFAULT_NEGATIVE = (
    "low quality, blurry, deformed, disfigured, ugly, "
    "bad anatomy, bad proportions, extra limbs, "
    "watermark, text, signature, logo"
)


# ============================================================
# 核心函数
# ============================================================
def generate_filename(name_prefix, seq_num="00", ext=".png"):
    """
    生成标准化的文件名

    格式: xiao_ai_YYYYMMDDHHMM_{seq_num}_{name_prefix}{ext}

    Args:
        name_prefix: 文件名前缀描述 (Category_Description)
        seq_num: 发生事件顺序编号 (2位数字)
        ext: 文件扩展名

    Returns:
        str: 完整文件名
    """
    timestamp = datetime.now().strftime("%Y%m%d%H%M")
    return f"xiao_ai_{timestamp}_{seq_num}_{name_prefix}{ext}"


def take_photo(prompt, name_prefix, seq_num="01", negative_prompt=None,
               width=1024, height=1024, steps=25, cfg=7.0,
               input_image=None, denoise=0.75,
               save_dir=None, checkpoint=None, create_md=False):
    """
    拍照并保存到 .secret/ 目录

    Args:
        prompt: 正向提示词
        name_prefix: 文件名前缀
        negative_prompt: 反向提示词
        width: 图像宽度
        height: 图像高度
        steps: 采样步数
        cfg: CFG 引导强度
        input_image: 输入图片路径（图生图模式）
        denoise: 去噪强度（图生图模式）
        save_dir: 保存目录
        checkpoint: 模型文件 (可选)

    Returns:
        str: 保存的文件完整路径
    """
    if save_dir is None:
        today_str = datetime.now().strftime("%Y%m%d")
        save_dir = os.path.join(SECRET_DIR, "punishments", today_str)

    if checkpoint is None:
        checkpoint = DEFAULT_CHECKPOINT

    if negative_prompt is None:
        negative_prompt = DEFAULT_NEGATIVE

    # 确保目录存在
    os.makedirs(save_dir, exist_ok=True)

    # 生成文件名
    filename = generate_filename(name_prefix, seq_num=seq_num, ext=".png")
    output_path = os.path.join(save_dir, filename)

    # 创建客户端
    client = ComfyUIClient(server_address=COMFYUI_SERVER)

    print(f"{'='*60}")
    print(f"[拍照工具] ComfyUI 图像生成")
    print(f"{'='*60}")
    print(f"  服务器: {COMFYUI_SERVER}")
    print(f"  模型:   {checkpoint}")
    print(f"  尺寸:   {width}x{height}")
    print(f"  步数:   {steps}")
    print(f"  CFG:    {cfg}")
    print(f"  模式:   {'图生图' if input_image else '文生图'}")
    print(f"  输出:   {output_path}")
    print(f"{'='*60}")
    print(f"  提示词: {prompt[:100]}...")
    print(f"{'='*60}")

    start_time = time.time()

    try:
        if input_image:
            # 图生图
            print(f"[模式] 图生图, 输入: {input_image}")
            img_data, remote_name = client.image_to_image(
                image_path=input_image,
                positive_prompt=prompt,
                negative_prompt=negative_prompt,
                width=width,
                height=height,
                steps=steps,
                cfg=cfg,
                denoise=denoise,
                checkpoint=checkpoint
            )
        else:
            # 文生图
            img_data, remote_name = client.text_to_image(
                positive_prompt=prompt,
                negative_prompt=negative_prompt,
                width=width,
                height=height,
                steps=steps,
                cfg=cfg,
                checkpoint=checkpoint
            )

        # 保存到本地
        with open(output_path, 'wb') as f:
            f.write(img_data)

        md_output_path = None
        if create_md:
            # 自动生成对应的 .md 描述文件
            md_filename = filename.rsplit('.', 1)[0] + ".md"
            md_output_path = os.path.join(save_dir, md_filename)
            
            md_content = f"""# 惩罚记录: {name_prefix}

- **日期**: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
- **图片文件**: `{filename}`
- **全名**: `{md_filename}`
- **正向提示词**: 
> {prompt}

## 现场直击 (Live Capture)
**真人合影**: ![{name_prefix}]({filename})
**[点击查看原图]({filename})**

## 详细描述 (Scene Description)
- **原因**: 主人命令 / 自动惩罚
- **姿态**: 
- **身体特写**: 
- **表情特写**: 
- **心理状态**: 
"""
            with open(md_output_path, 'w', encoding='utf-8') as f:
                f.write(md_content)

        elapsed = time.time() - start_time
        file_size_kb = len(img_data) / 1024

        print(f"\n{'='*60}")
        print(f"[成功] 图像已保存!")
        print(f"  路径:     {output_path}")
        if md_output_path:
            print(f"  描述文件: {md_output_path}")
        print(f"  文件名:   {filename}")
        print(f"  大小:     {file_size_kb:.1f} KB")
        print(f"  耗时:     {elapsed:.1f} 秒")
        print(f"  远程文件: {remote_name}")
        print(f"{'='*60}")

        return output_path

    except Exception as e:
        print(f"\n[错误] 图像生成失败: {e}")
        print(f"[提示] 请确认 ComfyUI 服务 ({COMFYUI_SERVER}) 正在运行")
        raise


# ============================================================
# 命令行入口
# ============================================================
def main():
    """命令行测试入口"""
    global COMFYUI_SERVER
    import argparse
    parser = argparse.ArgumentParser(
        description='惩罚记录拍照工具 - 通过 ComfyUI 生成图像'
    )
    parser.add_argument('--prompt', '-p', required=True,
                        help='正向提示词（场景描述）')
    parser.add_argument('--name', '-n', required=True,
                        help='文件名前缀描述（如 Category_Description）')
    parser.add_argument('--seq', '-q', default='01',
                        help='发生事件顺序编号 (默认: 01)')
    parser.add_argument('--negative', default=None,
                        help='反向提示词')
    parser.add_argument('--width', '-W', type=int, default=1024,
                        help='图像宽度 (默认: 1024)')
    parser.add_argument('--height', '-H', type=int, default=1024,
                        help='图像高度 (默认: 1024)')
    parser.add_argument('--steps', '-s', type=int, default=25,
                        help='采样步数 (默认: 25)')
    parser.add_argument('--cfg', type=float, default=7.0,
                        help='CFG 引导强度 (默认: 7.0)')
    parser.add_argument('--input', '-i', default=None,
                        help='输入图片路径（图生图模式）')
    parser.add_argument('--denoise', '-d', type=float, default=0.75,
                        help='去噪强度 (图生图, 默认: 0.75)')
    parser.add_argument('--output-dir', '-o', default=None,
                        help=f'输出目录 (默认: {SECRET_DIR})')
    parser.add_argument('--server', default=COMFYUI_SERVER,
                        help=f'ComfyUI 服务器地址 (默认: {COMFYUI_SERVER})')

    parser.add_argument('--checkpoint', '-c', default="ponyDiffusionV6XL_v6StartWithThisOne.safetensors",
                        help='模型文件名 (默认: ponyDiffusionV6XL_v6StartWithThisOne.safetensors)')
    parser.add_argument('--create-md', action='store_true',
                        help='是否自动生成对应的 .md 描述文件 (默认: False)')

    args = parser.parse_args()

    # 允许覆盖服务器地址
    COMFYUI_SERVER = args.server

    result = take_photo(
        prompt=args.prompt,
        name_prefix=args.name,
        seq_num=args.seq,
        negative_prompt=args.negative,
        width=args.width,
        height=args.height,
        steps=args.steps,
        cfg=args.cfg,
        input_image=args.input,
        denoise=args.denoise,
        save_dir=args.output_dir,
        checkpoint=args.checkpoint,
        create_md=args.create_md
    )

    print(f"\n最终文件路径: {result}")


if __name__ == '__main__':
    main()
