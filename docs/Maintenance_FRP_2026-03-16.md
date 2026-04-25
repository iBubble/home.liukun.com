# 网络服务维护记录 (2026-03-16)

## 1. 故障描述
*   **现象**: 访问 `https://home.liukun.com/` 返回 `502 Bad Gateway (Caddy)`。
*   **初诊**: 本地 Nginx (443) 正常，FRP 隧道虽显示成功但无流量流向本地。
*   **根因**: FRP 服务端会话死锁及中转 IP 指向错误。

## 2. 修复操作
### 2.1 FRP 配置更正
*   **路径**: `/home/gemini/frp/frp_0.61.1_linux_amd64/frpc.toml`
*   **变更**: 
    *   纠正 `serverAddr` 为 `47.103.55.200`（原误填为 8.137.156.4）。
    *   恢复代理名称 `home-web-https`。
    *   新增 `rag-service` 代理映射。
*   **服务重启**: 已执行 `systemctl restart frpc`，状态为 `running`。

### 2.2 生产环境优化 (De-Portification)
*   **去端口化**: 从根目录 `README.md` 及相关文档中移除了过时的 `:8443` 端口声明。
*   **证书绑定**: 确认本地 Nginx 已绑定 `home.liukun.com` 证书，实现全链路 SSL。

## 3. 最终验证状态
| 服务/域名 | 类型 | 本地端口 | 外网 URL | 状态 |
| :--- | :--- | :--- | :--- | :--- |
| **主站** | HTTPS | 443 | `https://home.liukun.com` | ✅ 正常 (200 OK) |
| **RAG 服务** | HTTP | 2026 | `http://rag.syhsgis.com` | ⚠️ 存在路由冲突 |

## 4. 后续建议
*   **RAG 冲突**: 服务器端提示 `rag.syhsgis.com` 存在路由冲突，需检查是否有其他 frpc 实例占据了该域名映射。
*   **自动续期**: `apply-letsencrypt.sh` 脚本已就绪，证书将在到期前 30 天自动尝试更新。

---
*记录人: Antigravity AI*
*日期: 2026-03-16*
