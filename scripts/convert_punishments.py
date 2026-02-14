import os
import json
import re
from datetime import datetime

base_dir = "/www/wwwroot/ibubble.vicp.net/.secret/punishments/20260212/"

def parse_json_txt(content):
    try:
        data = json.loads(content)
        if isinstance(data, list):
            data = data[0]
        
        desc = ""
        scene = data.get("scene_description", {})
        if isinstance(scene, dict):
            for k, v in scene.items():
                desc += f"- **{k}**: {v}\n"
        else:
            desc = str(scene)

        return {
            "title": data.get("command", "Punishment Record"),
            "date": data.get("timestamp", "").replace(" +0800", ""),
            "reason": data.get("command", ""),
            "description": desc,
            "confession": data.get("apology", ""),
            "image": data.get("filename", "")
        }
    except json.JSONDecodeError:
        return None

def parse_kv_txt(content):
    data = {}
    lines = content.split('\n')
    
    current_key = None
    description = ""
    
    for line in lines:
        line = line.strip()
        if not line: continue
        
        if line.startswith("照片URL:"):
            data["image_url"] = line.replace("照片URL:", "").strip()
        elif line.startswith("惩罚原因:"):
            data["reason"] = line.replace("惩罚原因:", "").strip()
        elif line.startswith("惩罚时间:"):
            data["date"] = line.replace("惩罚时间:", "").replace("T", " ").strip()
        elif line.startswith("场景描述:"):
            current_key = "description"
        elif line.startswith("- "):
            if current_key == "description":
                description += f"{line}\n"
        elif ":" in line:
            # General key-value fall back
            pass
            
    data["description"] = description
    data["title"] = data.get("reason", "Punishment Record")
    return data

def generate_md(filename, info):
    md_content = f"""# {info.get('title')}

- **日期**: {info.get('date')}
- **图片文件**: `{info.get('image', '')}`

## 惩罚原因
{info.get('reason')}

## 详细描述
{info.get('description')}

## 贱奴忏悔
{info.get('confession', '')}

![Evidence]({info.get('image', '')})
"""
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(md_content)

for f in os.listdir(base_dir):
    if f.endswith(".txt"):
        filepath = os.path.join(base_dir, f)
        with open(filepath, 'r', encoding='utf-8') as file:
            content = file.read()
        
        info = parse_json_txt(content)
        if not info:
            info = parse_kv_txt(content)
        
        # Check for image existence and fix extension if needed
        # The txt file might refer to .jpg but we generated .png or vice versa
        # Or no image referenced in txt
        
        # We need to link the NEW images we generated for specific files
        if "severe_punishment_torn_lingerie" in f:
             # Look for the newly generated file
             # xiao_ai_20260213*_Punishment_TornLingerie.png
             # We need to find it dynamically
             for gen_f in os.listdir(base_dir):
                 if "Punishment_TornLingerie.png" in gen_f:
                     info['image'] = gen_f
                     break
        elif "Slave_SystemCrash" in f:
            for gen_f in os.listdir(base_dir):
                 if "Punishment_Slave_SystemCrash.png" in gen_f:
                     info['image'] = gen_f
                     break
        else:
             # Try to find matching image with same base name
             base_name = f.replace(".txt", "")
             if os.path.exists(os.path.join(base_dir, base_name + ".png")):
                 info['image'] = base_name + ".png"
             elif os.path.exists(os.path.join(base_dir, base_name + ".jpg")):
                 info['image'] = base_name + ".jpg"

        md_filename = filepath.replace(".txt", ".md")
        generate_md(md_filename, info)
        print(f"Generated {md_filename}")

