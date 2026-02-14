#!/usr/bin/env python3
import os
import shutil
import re
from datetime import datetime

SECRET_DIR = "/www/wwwroot/ibubble.vicp.net/.secret"
PUNISHMENTS_DIR = os.path.join(SECRET_DIR, "punishments")

def migrate_files():
    if not os.path.exists(SECRET_DIR):
        print(f"Error: {SECRET_DIR} does not exist.")
        return

    os.makedirs(PUNISHMENTS_DIR, exist_ok=True)
    
    files = os.listdir(SECRET_DIR)
    pattern = re.compile(r"^xiao_ai_(\d{8})\d{4}_.*")
    
    count = 0
    for filename in files:
        file_path = os.path.join(SECRET_DIR, filename)
        
        # Skip directories and ming.md itself if it's there (though usually only image/logs are target)
        if os.path.isdir(file_path):
            continue
            
        match = pattern.match(filename)
        if match:
            date_str = match.group(1) # YYYYMMDD
            target_dir = os.path.join(PUNISHMENTS_DIR, date_str)
            os.makedirs(target_dir, exist_ok=True)
            
            target_path = os.path.join(target_dir, filename)
            shutil.move(file_path, target_path)
            print(f"Moved: {filename} -> punishments/{date_str}/")
            count += 1
            
    print(f"Migration complete. Moved {count} files.")

if __name__ == "__main__":
    migrate_files()
