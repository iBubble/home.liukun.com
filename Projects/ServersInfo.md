# 🌐 Antigravity ServerManager - 跨国服务集群架构与维护总览

本仓库 (`ServerManager`) 负责维护和管理底层跨国代理集群。以下为主机配置和核心服务系统的详情清单，基于最新文档生成。

## 🖥 1. 主机资产清单 (Server Inventory)

当前集群由三台主要服务器构成，所有节点 SSH 端口均为 **22**，且默认启用了全站 HTTPS 安全证书。

| 节点代码 | 地区标识 | 公网入口 (Domain) | 主力普通账号 | Root 超级账号 |
| :--- | :--- | :--- | :--- | :--- |
| **HK** | 香港主机 | `hk.liukun.com` | `Gl5181081` | `Gl5181081@tc` |
| **SG** | 新加坡主机 | `sg.liukun.com` | `Gl5181081` | `Gl5181081@tc` |
| **US** | 美国主机 | `us.liukun.com` | `Gl5181081` | `Gl5181081@tc` |

> ⚠️ **关键路径兼容性警告 (Path Warning)**：
> 香港节点（HK）的业务工作目录为大写的 `/home/Gemini/`；而新加坡（SG）和美国（US）节点已修正为小写 `/home/gemini/`。涉及跨机联动的运维脚本在执行时，必须包含 `[ -d "/home/Gemini" ]` 的兼容性分支探测。

## 🛠 2. 核心存活服务体系 (Core Services)

目前所有主机的安全证书由 Let's Encrypt 统一签发（证书存储路径为 `/etc/letsencrypt/live/<domain>/`）。承载的外网核心应用架构如下：

1. **聚合任务系统 (Aggregator)**
   - **底层驱动**：Node.js 20.x + PM2 并发守护进程；
   - **通信与防护**：系统内部监听 TCP `3000` 端口，通过 Nginx 开启的反向代理并通过 `https://<domain>` 对外服务。
   - **前端看板与访问量追踪**：前端副标题已动态接入轻量级 **不蒜子 (Busuanzi)** 探针，各个国家维度的节点（独立 Domain）将自适应展示独立的 `• Visits: <PV统计数>` 客观指标。
   - **日志切片**：已介入 `pm2-logrotate`，单文件 10MB 分片，最多抛弃至只留 5 份 Gzip。
2. **节点中枢管理系统 (3x-ui)**
   - **底层驱动**：基于 Docker 容器运行，且开启了 Host 模式的网络穿透以实现最高效率；
   - **访问路由**：面版管理端口为 `9528` (`https://<domain>:9528/admin_3x/`)；节点的底层订阅流量统一暴露于 TCP `2096` 端口。
3. **网络性能监测双擎 (Speedtests)**
   - **前端 Web 版 (OpenSpeedTest)**：基于 Docker，公网安全测速入口为 `https://<domain>:8989`；
   - **网络协议级测速 (iperf3)**：后台通过 `systemd` 常驻，客户端通过外部指令调用 TCP/UDP 协议口 `5201` 测试极限互联。
4. **图形化安全远控基座 (GUI & xRDP)**
   - 依赖 `xfce4` 和 xRDP 支持 `3389` 直连，并内设受控隔离的 Chrome/Firefox ESR 以兼顾远程 GUI 排查。

## 🧰 3. 系统级核武性能榨取记录 (System Tuning)

针对目前云主机的 2GB 内存配额，底层系统级别已实施了深度调优，**后续环境重构及维护脚本需严格禁止盲目覆盖以下核心配置**：
- **IO 虚拟化与资源阻断**：划分了 `2GB Swapfile`，系统参数 `vm.swappiness` 被强力压制至 `10`，以保底物理内存利用率，不到绝境不扫盘。
- **高并发上限解禁**：系统内核启用 `net.ipv4.tcp_tw_reuse = 1`，并将 Nginx 的 `worker_connections` 扩容至 `4096`。
- **网络传输极速压缩**：在 Nginx 配置层开启 Gzip (Level 6) 以针对流数据或 JSON API 狂暴提速。
- **内核级 BBR 拥塞控制**：底层网络模块已替换为 `BBR + fq`，并调通系统的 `UFW` 放行核心应用端口白名单以对抗海外专线的各类丢包问题。

## 🤖 4. AI 维护与日常联调命令指引

如果需要针对系统的配置开展升级或其他联调需求，须重点遵循如下安全及维护红线：

1. **配置下发阻断**：避免使用不可逆的 `sed` 直接在远端篡改文件，必须在本地 (`Antigravity`) 主控端梳理好 patch 脚本后，通过 `scp` 安全地下发与替换执行。
2. **容器与面板数据库操控**：当 `3x-ui` 流量需要归零或维护数据时，应通过 `sqlite3 /opt/3x-ui/x-ui.db` 注入 SQL 指令，例如：
   `UPDATE inbounds SET up = 0, down = 0, all_time = 0;` (注意：执行此类命令前必须先停止 Docker 进程以防造成死锁)。
3. **安全防坠毁策略**：底层 Certbot 已默认挂载于计划任务，若检测到 3x-ui 提取配置假死，只需强制执行那句 SQL 证书路径注入命令即可解决。

## ⏱ 5. 跨集群定时巡检与自愈任务 (Cron & Self-Healing)

为了保证主节点外其他云端从机的高可用性，跨集群的三台服务器（HK、SG、US）统一部署了基于操作系统底层 (`root crontab`) 的自动化脚本机制：

1. **每天凌晨 05:00 - SSL 证书自愈巡检**
   - **执行路径**：`/usr/local/bin/check_ssl.sh`
   - **策略逻辑**：通过模拟 `openssl` 探针检查 Nginx 绑定的 Let's Encrypt 证书的实时健康度。如果发觉证书剩余有效期**低于 60 天**，脚本会自动判定存在过早脱机风险，并强制发起 `certbot renew --force-renewal` 或 `acme.sh --renew --force` 操作进行无痛续签。完成后执行 `systemctl reload nginx` 重载配置。
   - **日志沉淀**：`/var/log/ssl_cron.log`

2. **每天早晨 06:30 - 全网节点强制风暴采集**
   - **策略逻辑**：跳出 Node 进程内部计时器可能因 PM2 重启而丢进度的限制，在系统顶层通过固定时间注入发起强制采集动作。
   - **命令机制**：`30 6 * * * curl -X POST -s http://127.0.0.1:3000/api/fetch_all >/dev/null 2>&1`
   - 该接口将直接调动 Aggregator 携带内核启动 Clash 子进程，对全球公网代理池进行真机并发验证洗牌，确证高可用资源入库。

3. **每天凌晨 06:00 - 集群物理节点例行重启与战后自愈**
   - **执行路径**：`0 6 * * * /sbin/reboot` 以及 `@reboot /usr/local/bin/check_services.sh`
   - **策略逻辑**：所有云端节点固定于系统时间 06:00 进行物理层重启，强制清空内存碎片和僵尸句柄。重启伴随 `check_services.sh` 守护程序（延时 60 秒触发），严格巡检三项核心指标：
     1. **Aggregator (Node.js)**：强制探测 `pm2 jlist` 状态，若无在线实例则以无代码侵入方式跨用户自激活。
     2. **3x-ui (Docker)**：查验 `docker ps`，防范容器假死或引擎起停失败，一经发现立刻拉起引擎并重载容器。
     3. **图形界面 (xRDP)**：探测 `systemd` 中 `xrdp` 服务活动指标，拦截偶发的 GUI 会话服务启动故障。
   - **日志沉淀**：`/var/log/service_check_reboot.log`
