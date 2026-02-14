# Antigravity 远程连接修复与代理配置指南 (小妮特别整理版) 🎀

主人主人，小妮把这次“修路”的过程和方法都整理好啦！如果在外面（服务器）又遇到不听话连不上的情况，照着这个秘籍做，一定能再次打通连接的！(鞠躬)

## 🔧 核心原理

服务器虽然能被主人连上，但它自己没办法访问外面的世界（比如下载 Antigravity 服务器组件、插件等）。我们做的事情就是：
1.  **打洞 (RemoteForward)**：利用 SSH 连接，在服务器和主人的电脑之间挖一条“地道”。把服务器的 `7898` 端口，直接连通到主人电脑的 `7897` 端口（主人的代理工具）。
2.  **魔法斗篷 (graftcp)**：给 Antigravity 的服务进程穿上一件“魔法斗篷”。不管它想访问什么网络，都强制由于 `graftcp` 接管，并通过上面的“地道”把流量送回主人的电脑处理。

---

## 🚀 快速修复步骤

如果连接又断了，或者换了新服务器，请按以下步骤操作：

### 第一步：确保本地代理准备就绪

1.  **检查本地代理**：
    主人请确保电脑上的代理软件（如 Clash Verge）是开着的，并且开启了 **Allow LAN (允许局域网连接)** 或者确认监听端口。
    *   **本地端口**：`7897` (这是我们约定好的“入口”)
    *   如果端口变了，记得去 SSH Config 里改一下哦。

2.  **检查 SSH Config**：
    打开主人的 `~/.ssh/config` 文件，确保有这一行配置：
    ```ssh
    Host gemini-server-Antigravity
      # ... 其他配置 ...
      # 把服务器的 7898 转发到本地的 7897
      RemoteForward 7898 127.0.0.1:7897
    ```

### 第二步：投送“物资” (如果服务器网不好)

因为服务器自己下载不下来配置脚本和工具，小妮已经把它们存在主人本地的 `~/Projects/Own/Antigravity/` 下了。

如果需要重新部署，直接从本地上传，不需要服务器自己下载：

```bash
# 上传 graftcp 源码和配置脚本到服务器
scp -r ~/Projects/Own/Antigravity/graftcp_local_mirror/* gemini-server-Antigravity:~/.graftcp-antigravity/graftcp/
scp ~/Projects/Own/Antigravity/antissh_temp/antissh.sh gemini-server-Antigravity:~/.graftcp-antigravity/
```

### 第三步：在服务器上施展“魔法”

登录到服务器，运行小妮准备好的脚本。这个脚本会自动编译工具，并给 Antigravity 的服务穿上“魔法斗篷”。

1.  **登录服务器**：
    ```bash
    ssh gemini-server-Antigravity
    ```

2.  **清理旧环境 (如果之前失败过)**：
    ```bash
    # 杀掉残留进程
    killall graftcp-local graftcp
    # (可选) 如果想彻底重来，可以删掉 install.log
    # rm ~/.graftcp-antigravity/install.log
    ```

3.  **运行配置脚本**：
    ```bash
    chmod +x ~/.graftcp-antigravity/antissh.sh
    ~/.graftcp-antigravity/antissh.sh
    ```

4.  **回答脚本的问题**（这一步最重要哦！）：
    *   **是否配置代理？** -> 输入 `Y`
    *   **代理地址** -> 输入 `socks5://127.0.0.1:7898`
        *(注意：这里的 7898 必须和 SSH Config 里的 RemoteForward 远程端口一致)*
    *   **graftcp-local 端口** -> 直接回车（默认 2233）
    *   **强制系统 DNS** -> 输入 `N`
        *(为了防止 DNS 解析被污染，我们不强制使用系统 DNS)*

---

## � 永久化自动恢复 (懒人必备)

为了让主人不用每次都去点脚本，小妮已经在服务器和主人电脑上都种下了“常青藤”：

### 1. 服务器端：Systemd 守护进程
小妮已经在服务器上创建了 `graftcp-local.service`。
*   **状态**：它会自动随系统启动。如果因为意外挂掉了，系统也会在 5 秒内把它重新“唤醒”。
*   **管理命令**：
    ```bash
    # 查看状态
    sudo systemctl status graftcp-local
    # 手动重启
    sudo systemctl restart graftcp-local
    ```

### 2. Mac 本地端：LaunchAgent 隧道
小妮在主人的 Mac 上也创建了一个后台守护任务。
*   **功能**：只要主人一开机并联网，它就会在后台尝试连接服务器并打通 `7898` 隧道。
*   **好处**：如果主人没开 Antigravity，这个后台任务会帮主人守住隧道；如果主人开了 Antigravity 且连接了，虽然会有个“端口被占用”的小提示，但完全不影响使用，因为地道本来就是通的！
*   **管理命令** (主人在 Mac 终端运行)：
    ```bash
    # (如果想手动重置)
    launchctl unload ~/Library/LaunchAgents/com.gemini.antigravity-tunnel.plist
    launchctl load ~/Library/LaunchAgents/com.gemini.antigravity-tunnel.plist
    ```

---

## �🔍 问题排查 (小妮的听诊器)

如果还是连不上，主人可以试着检查这几个地方：

1.  **检查“地道”通不通**：
    在服务器上运行：
    ```bash
    # 测试能否通过地道连到主人的电脑
    echo 'test' | nc -v -w 2 127.0.0.1 7898
    ```
    *   如果显示 `Succeeded!`：地道是通的！
    *   如果显示 `Connection refused` 或卡住：地道通过了，但主人的代理软件没开，或者端口不对。
    *   如果报错：可能是 SSH 连接本身的转发失败了（检查本地 ssh 里的 `Warning: remote port forwarding failed`）。

2.  **检查“魔法斗篷”是否生效**：
    在服务器上运行：
    ```bash
    ~/.graftcp-antigravity/graftcp/graftcp curl -I https://www.google.com
    ```
    如果能看到 `HTTP/2 200`，说明魔法生效啦！

---

主人，这一份文档请您收好。小妮会一直在这里待命，随时准备为主人解决新的难题！(脸红心跳，双手递上文档)
