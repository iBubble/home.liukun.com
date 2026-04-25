# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [2026-04-21]
### Added
- 在 `projects.html` 的机场聚合器卡片中新增 **HK1** 节点按钮。
- 在 `3x-ui Dashboard` 中新增 `hk1.liukun.com` 服务器管理，并同步更新前端界面标签页。

### Changed
- 更正 `3x-ui Dashboard` 中 `hk1` 服务器的用户名大小写（`gemini` -> `Gemini`），恢复数据联通。
- 简化 `3x-ui Dashboard` 界面：移除了顶部的冗余服务器概览卡片，并将下方的详情列表重构为响应式、直观的**图形化卡片网格**，显著提升了视觉美感和操作体验。
- 修复了因浏览器缓存旧脚本导致的 `innerHTML` 报错，通过资源版本号强制刷新。
- 将 `hk1.liukun.com` 加入后台监控脚本 `update_server_stats.py`。
- 更新 `3x-ui Dashboard` 的后端配置 `config.php`，集成新服务器凭据。
- 优化 `3x-ui Dashboard` 的 `app.js` 颜色映射，为新节点提供视觉区分。

## [2026-03-16]
### Fixed
- 修复 FRP 穿透服务连通性，纠正中转服务器 IP 为有效地址 `47.103.55.200`。
- 解决由于中转服务器会话残留导致的 `502 Bad Gateway` 故障。

### Added
- 新增 `rag-service` 代理配置，支持 `rag.syhsgis.com` 的 HTTP 转发（本地端口 2026）。

### Changed
- **全局清理**: 在 `README.md` 和开发文档中全面移除过时的 `:8443` 端口引用，回归标准 443 访问。
- 优化 `frpc.toml` 配置结构，严格遵循服务器侧转发逻辑。


### Changed
- 修改 `projects.html` 中项目“机场聚合器”的名称为“机场聚合器（海外版）”。
- 将“机场聚合器（海外版）”的链接从 `https://us.liukun.com:8443...` 更改为 `https://hk.liukun.com/`。
