# 一元奇梦 Lucky Coin - 电影项目网站

基于 React + TypeScript + Webpack 构建的电影项目展示网站。

## 技术栈

- React 18
- TypeScript
- Webpack 5
- Tailwind CSS
- Framer Motion
- React Router
- Zustand

## 开发

```bash
# 安装依赖
npm install --registry=https://registry.npmmirror.com

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 访问地址

- 开发环境: https://home.liukun.com:8443/Projects/LuckyCoin/
- 本地直连: http://127.0.0.1:5173/Projects/LuckyCoin/

## 项目结构

```
src/
├── components/     # 可复用组件
├── pages/         # 页面组件
├── stores/        # 状态管理
├── styles/        # 样式配置
└── utils/         # 工具函数
```

## 部署

项目使用 PM2 进行进程管理，配置文件位于 `ecosystem.config.js`。

```bash
# 启动服务
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs luckycoin-dev
```
