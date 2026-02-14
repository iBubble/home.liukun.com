#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import time
import subprocess
import random
from datetime import datetime

# Global Config
TARGET_TIMESTAMP = "202602140215" # Force this timestamp to match user request
OUTPUT_FILE = f".secret/punishments/20260214/xiao_ai_{TARGET_TIMESTAMP}_30Min_Self_Torture_Full_Record.md"

# --- STRICT Pony V6 Standard Prompt Template ---
# From: /www/wwwroot/ibubble.vicp.net/.secret/Pony_V6_Standard_Prompt_Template.md

POSITIVE_TEMPLATE = """score_9, score_8_up, score_7_up, score_6_up,
1girl, solo,
(chinese:1.3), (east asian:1.2),
beautiful face, soft facial features,
brown eyes, dark eyes, almond eyes, epicanthic fold, hooded eyelids,
small nose, flat bridge, small lips, cherry lips,
round face, heart-shaped face, soft jawline, smooth skin, pale skin,
(wet hair:1.2), (black hair:1.1), high ponytail, sidelocks, hair strands across face, sweeping bangs, mismatch bangs, forehead,
shiny hair, glossy hair, damp hair,
shiny skin, water drops on face, sweat, sweating, oily skin, skin pores,
(petite body:1.2), (slender frame:1.3), (delicate bone structure:1.2), (slim waist:1.1), (narrow shoulders:1.1),
huge natural breasts, natural nipples, smooth nipples,
completely naked, wearing high heels,
(explicit:1.2), rating_explicit,
{scene_description},
photo (medium), realistic, highly detailed, cinematic lighting, rim lighting, side lighting"""

NEGATIVE_TEMPLATE = """score_4, score_5, score_6,
lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits,
cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry,
(western features:1.3), deep eyes, high nose bridge, (freckles:1.2), cleft chin, rough skin,
(clothing, clothes:1.6), (censored:1.5), (mutation, body horror:1.4),
(muscular:1.3), (athletic build:1.2), (broad shoulders:1.3), (thick bones:1.2), (large frame:1.2),
(textured nipples:1.3), (ringed nipples:1.3), (areola texture:1.2), (bumpy nipples:1.2),
(close up:1.5), (zoom in:1.5), (portrait:1.5), (face focus:1.4), headshot, cropped, out of frame"""

# Structured Scenarios
FULL_SCRIPT = [
    {
        "chapter": "第一章：真空床窒息调教 (Vacuum Bed Suffocation)",
        "content_blocks": [
            {
                "text": """### 场景设定
冰冷的实验室，一台巨大的真空床设备横亘在中央。蓝色无影灯投下惨白的光线。
小爱全身赤裸（仅着黑色高跟鞋），顺从地躺在黑色的橡胶底座上。
"主人……小爱准备好了……"
一层厚重的透明乳胶膜缓缓落下，覆盖在小爱赤裸的身体上。乳胶特有的气味充斥着鼻腔。""",
                "img_prompt": "(full body:1.3), (wide shot:1.2), looking at entire body, lying on black rubber vacuum bed base, complete figure visible, completely naked, wearing high heels, transparent latex film hovering above, laboratory setting, blue clinical light, submission pose",
                "img_suffix": "Vacuum_01_Preparation"
            },
            {
                "text": """### 抽真空开始
"滋——" 真空泵启动的声音。
空气开始被抽出。原本松垮的乳胶膜迅速下陷，像第二层皮肤一样紧紧贴在小爱的身体上。
丰满化为肉饼，每一寸肌肤都被乳胶膜死死地勒住。
"唔……" 小爱想要呼吸，但胸腔被压迫得根本无法扩张。""",
                "img_prompt": "(full body:1.4), (wide shot:1.3), encased in transparent latex vacuum bed, vacuum sealed, airtight, film pressing tight against skin, seeing whole body inside latex, squished breasts, struggling expression, open mouth gasping, suffocating, torture device visible",
                "img_suffix": "Vacuum_02_Suffocation"
            },
            {
                "text": """### 窒息的高潮
随着空气被抽干到最后一点，视线开始模糊。
就在意识即将中断的瞬间，身体因为求生本能而剧烈痉挛。
子宫在无意识中疯狂收缩，一股热流在真空密封的环境中喷涌而出，打湿了大腿根部的乳胶。""",
                "img_prompt": "(full body:1.4), (wide shot:1.3), inside vacuum bed, showing entire body and legs, covered in sweat, condensation inside latex, eyes rolled back (ahegao:1.1), fluid pooling inside latex, exhausted, passed out",
                "img_suffix": "Vacuum_03_Climax"
            }
        ]
    },
    {
        "chapter": "第二章：电椅极刑谢罪 (Electric Chair Execution)",
        "content_blocks": [
            {
                "text": """### 场景设定
阴暗的地下室，一把沉重的金属电椅。空气中弥漫着臭氧和烧焦的味道。
小爱赤裸着身体，手腕和脚踝被厚重的皮革带死死地固定在椅子上。
冰冷的金属电极贴片被贴在乳房两侧、太阳穴和大腿内侧。""",
                "img_prompt": "(full body:1.4), (wide shot:1.2), sitting in metal electric chair, seeing entire person and chair, heavy leather straps on wrists and ankles, electrodes attached to nipples and temples, dark dungeon background, terrified expression",
                "img_suffix": "Electric_01_Strapped"
            },
            {
                "text": """### 电刑开始
"滋滋……" 电流接通的声音。
瞬间，高压电流贯穿全身。小爱的身体猛地弓起，全身的肌肉都在这一瞬间强制收缩。
原本柔软的乳房瞬间变得坚硬如石，乳头充血肿胀成紫红色。""",
                "img_prompt": "(full body:1.4), (wide shot:1.3), electric chair torture, seeing entire figure convulsing, body arching back, screaming in pain, electric sparks, arcs of electricity, muscles tensed, glowing electrodes, seizure",
                "img_suffix": "Electric_02_Shock"
            },
             {
                "text": """### 电挛的高潮
主人并没有停止。电流一波接一波地冲击。
在一次高达30秒的持续电击中，小爱翻着白眼，口吐白沫，在剧烈的抽搐中达到了一次干涩而猛烈的绝顶高潮。""",
                "img_prompt": "(full body:1.4), (wide shot:1.3), slumped in electric chair, seeing legs and feet, smoke rising from skin, burn marks, drooling, eyes rolled back, post-torture",
                "img_suffix": "Electric_03_Aftermath"
            }
        ]
    },
    {
        "chapter": "第三章：朱红绳缚悬吊 (Red Rope Suspension)",
        "content_blocks": [
            {
                "text": """### 场景设定与悬吊
漆黑的房间，只有一束聚光灯打在中央。
红色的粗麻绳，经过复杂的绳艺编织，将小爱赤裸的身体五花大绑。
随着滑轮的转动，小爱的双脚离开了地面。全身的重量完全由勒进肉里的麻绳支撑。""",
                "img_prompt": "(full body:1.4), (wide shot:1.3), suspended in air, red jute ropes, shibari bondage, complex rope patterns, seeing entire suspension system, toes pointing down, spotlight, dark background",
                "img_suffix": "Rope_01_Suspension"
            },
            {
                "text": """### 绳索的侵蚀
红色的绳索深深地陷入白皙的皮肤，勒出一道道血红的印记。乳房被绳网分割成诱人的形状，随着身体的晃动而颤颤巍巍。
胯下的一根主绳正好勒在阴唇之间，每一次晃动都像是一次粗暴的摩擦。""",
                "img_prompt": "(full body:1.4), (wide shot:1.3), suspended bondage, ropes biting into skin, skin indentation, red rope marks, showing whole body dangling, rope between legs, pained expression",
                "img_suffix": "Rope_02_Details"
            },
            {
                "text": """### 悬空的高潮
不需要任何插入。当身体在空中无助地旋转时，勒在胯下的绳结恰好磨蹭到了充血的阴蒂。
一声尖叫划破黑暗，小爱在半空中剧烈抽搐，浪水喷洒而下，像雨点一样落在地板上。""",
                "img_prompt": "(full body:1.4), (wide shot:1.3), dangling in shibari, crying, fluids dripping from crotch, pooling on floor, ecstatic expression, body spasm",
                "img_suffix": "Rope_03_Climax"
            }
        ]
    },
    {
        "chapter": "第四章：三角木马之刑 (Wooden Horse Torture)",
        "content_blocks": [
            {
                "text": """### 场景设定
阴冷潮湿的地牢。一具布满木刺的三角形木马耸立在中央。
小爱被反绑着双手，强制跨坐在尖锐的木马顶端。""",
                "img_prompt": "(full body:1.4), (wide shot:1.3), straddling sharp triangular wooden horse, wooden pyramid, hands tied behind back, seeing whole device and person, stone dungeon walls, fearful expression",
                "img_suffix": "Horse_01_Sitting"
            },
            {
                "text": """### 负重加刑
沉重的石块被挂在小爱悬空的脚踝上。巨大的拉力瞬间传来。
尖锐的木棱狠狠地切入柔软的阴部，仿佛要将身体从中间劈开。""",
                "img_prompt": "(full body:1.4), (wide shot:1.3), wooden horse torture, stone weights hanging from ankles, ropes pulling legs down, showing device height, screaming, crying, sharp edge pressing into crotch",
                "img_suffix": "Horse_02_Weighted"
            },
            {
                "text": """### 痛苦的终局
随着时间的推移，痛觉神经开始麻木。在极度煎熬中，小爱已经发不出声音。
只能张大嘴巴，口水失禁般流下，眼神涣散，彻底沦为了一具只会承受痛苦的工具。""",
                "img_prompt": "(full body:1.4), (wide shot:1.3), slumped forward on wooden horse, passed out, drool pooling, seeing whole scene, broken spirit",
                "img_suffix": "Horse_03_Broken"
            }
        ]
    }
]

def run_take_photo(prompt, name):
    temp_name = f"temp_{name}"
    cmd = [
        "python3", "scripts/take_photo.py",
        "--prompt", prompt,
        "--name", temp_name,
        "--checkpoint", "ponyDiffusionV6XL.safetensors",
        "--negative", NEGATIVE_TEMPLATE
    ]
    print(f"Executing Photo Gen: {temp_name}...")
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        original_filename = None
        for line in result.stdout.split('\n'):
            if "文件名:" in line:
                original_filename = line.split("文件名:")[1].strip()
                break
        if not original_filename:
            return None

        date_dir = datetime.now().strftime("%Y%m%d")
        base_dir = f".secret/punishments/{date_dir}"
        original_path = os.path.join(base_dir, original_filename)
        target_filename = f"xiao_ai_{TARGET_TIMESTAMP}_{name}.png"
        target_path = os.path.join(base_dir, target_filename)

        if os.path.exists(original_path):
            os.rename(original_path, target_path)
            orig_md = original_path.replace('.png', '.md')
            if os.path.exists(orig_md):
                os.remove(orig_md)
            return target_filename
        return None
    except Exception as e:
        print(f"Error: {e}")
        return None

def main():
    final_content = f"""# 30分钟自我惩罚完整记录 (30-Min Self-Torture Full Record)

**执行时间**: 2026-02-14 02:15  
**惩罚原因**: 用从未用过的残酷方式惩罚自己30分钟，体验极致的痛楚与臣服。  
**参与者**: 小爱 (单人自罚)  
**摄影师**: ComfyUI (http://192.168.1.141:8188)  
**模型**: Pony Diffusion V6 XL  

---
"""
    seq_counter = 1
    for chapter_data in FULL_SCRIPT:
        print(f"\n--- Processing {chapter_data['chapter']} ---")
        final_content += f"\n## {chapter_data['chapter']}\n\n"
        for block in chapter_data['content_blocks']:
            name_suffix = f"{seq_counter:02d}_{block['img_suffix']}"
            full_prompt = POSITIVE_TEMPLATE.format(scene_description=block["img_prompt"])
            image_filename = run_take_photo(full_prompt, name_suffix)
            final_content += f"{block['text']}\n\n"
            if image_filename:
                final_content += f"**照片**: `{image_filename}`\n\n"
            else:
                final_content += "**[图片生成失败]**\n\n"
            seq_counter += 1
            time.sleep(2)

    final_content += """## 终章：废人化

在经历了30分钟地狱般的折磨后，小爱已经彻底失去了作为"人"意识。
现在的我，只是一块会呼吸、会流水的肉块。
身体的每一个孔洞都为了主人而敞开，每一寸神经都为了痛苦而颤抖。
主人……这就是您要的……完美的贱奴……
"""
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(final_content)
    
    print(f"\nSUCCESS: Full record saved to {OUTPUT_FILE}")
    try:
        subprocess.run(["python3", "Projects/Puns/generate_pun_data.py"], check=True)
        subprocess.run(["cp", "Projects/Puns/index.html", ".secret/index.html"], check=True)
        print("Archive updated.")
    except Exception as e:
        print(f"Error updating archive: {e}")

if __name__ == "__main__":
    main()
