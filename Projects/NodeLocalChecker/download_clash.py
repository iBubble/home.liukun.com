#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
通过 SOCKS5 代理下载 Clash 核心
"""

import sys
import os
import requests
import platform

# 代理配置
PROXY_HOST = "us.liukun.com"
PROXY_PORT = 1080
PROXY_USER = "Gemini"
PROXY_PASS = "Gl5181081"

# 配置代理
proxies = {
    'http': f'socks5://{PROXY_USER}:{PROXY_PASS}@{PROXY_HOST}:{PROXY_PORT}',
    'https': f'socks5://{PROXY_USER}:{PROXY_PASS}@{PROXY_HOST}:{PROXY_PORT}'
}

def get_arch():
    """获取系统架构"""
    machine = platform.machine().lower()
    if machine in ['x86_64', 'amd64']:
        return 'amd64'
    elif machine in ['aarch64', 'arm64']:
        return 'armv8'
    elif machine.startswith('armv7'):
        return 'armv7'
    else:
        raise Exception(f"不支持的架构: {machine}")

def download_file(url, output_path, desc=""):
    """下载文件"""
    print(f"\n正在下载: {desc}")
    print(f"URL: {url}")
    print(f"代理: {PROXY_HOST}:{PROXY_PORT}")
    
    try:
        response = requests.get(
            url,
            proxies=proxies,
            stream=True,
            timeout=300,
            allow_redirects=True
        )
        
        if response.status_code == 404:
            print(f"❌ 文件不存在 (404)")
            return False
        
        response.raise_for_status()
        
        total_size = int(response.headers.get('content-length', 0))
        print(f"文件大小: {total_size / 1024 / 1024:.2f} MB")
        
        downloaded = 0
        with open(output_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0:
                        percent = (downloaded / total_size) * 100
                        print(f"\r进度: {percent:.1f}% ({downloaded / 1024 / 1024:.2f} MB / {total_size / 1024 / 1024:.2f} MB)", end='')
        
        print(f"\n✅ 下载成功: {output_path}")
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"\n❌ 下载失败: {e}")
        return False

def main():
    print("=" * 50)
    print("下载 Clash 核心")
    print("=" * 50)
    
    # 检测架构
    try:
        arch = get_arch()
        print(f"\n系统架构: {platform.machine()} -> Clash架构: {arch}")
    except Exception as e:
        print(f"❌ {e}")
        sys.exit(1)
    
    # 创建 bin 目录
    os.makedirs('bin', exist_ok=True)
    
    # 下载列表（按优先级）
    downloads = [
        {
            'name': 'Mihomo (Clash Meta)',
            'url': f'https://github.com/MetaCubeX/mihomo/releases/download/v1.18.0/mihomo-linux-{arch}-v1.18.0.gz',
            'output': 'bin/clash.gz'
        },
        {
            'name': 'Clash Premium',
            'url': f'https://github.com/Dreamacro/clash/releases/download/premium/clash-linux-{arch}-2023.08.17.gz',
            'output': 'bin/clash.gz'
        }
    ]
    
    # 尝试下载
    success = False
    for item in downloads:
        if download_file(item['url'], item['output'], item['name']):
            success = True
            break
    
    if not success:
        print("\n❌ 所有下载源都失败了")
        print("请手动下载 Clash 并放置到 bin/clash")
        sys.exit(1)
    
    # 解压
    print("\n正在解压...")
    import gzip
    import shutil
    
    try:
        with gzip.open('bin/clash.gz', 'rb') as f_in:
            with open('bin/clash', 'wb') as f_out:
                shutil.copyfileobj(f_in, f_out)
        
        # 设置执行权限
        os.chmod('bin/clash', 0o755)
        
        # 删除压缩文件
        os.remove('bin/clash.gz')
        
        print("✅ 解压成功")
        
        # 验证
        if os.path.exists('bin/clash'):
            size = os.path.getsize('bin/clash')
            print(f"\n✅ Clash 安装成功")
            print(f"文件大小: {size / 1024 / 1024:.2f} MB")
            print(f"路径: {os.path.abspath('bin/clash')}")
            
            # 测试版本
            import subprocess
            try:
                result = subprocess.run(['./bin/clash', '-v'], capture_output=True, text=True, timeout=5)
                print(f"\n版本信息:")
                print(result.stdout)
            except:
                pass
        else:
            print("❌ 安装失败")
            sys.exit(1)
            
    except Exception as e:
        print(f"❌ 解压失败: {e}")
        sys.exit(1)
    
    print("\n" + "=" * 50)
    print("安装完成！")
    print("=" * 50)

if __name__ == '__main__':
    main()
