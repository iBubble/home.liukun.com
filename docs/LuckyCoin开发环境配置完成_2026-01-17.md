# LuckyCoin 项目开发环境配置完成

**日期**: 2026-01-17  
**状态**: ✅ 完成

## 问题描述

LuckyCoin 项目通过 https://home.liukun.com:8443/Projects/LuckyCoin/ 访问时显示空白页面，React 应用未能正确渲染。

## 根本原因

1. **HTML 模板问题**: 原始 Vite 模板中包含了不必要的 `<script type="module" src="/src/main.tsx"></script>`，与 webpack 构建冲突
2. **路径配置问题**: webpack 的 `publicPath` 和 `devMiddleware.publicPath` 未正确配置子路径
3. **React Router 配置**: `BrowserRouter` 缺少 `basename` 配置
4. **Nginx 优先级问题**: 全局的 `location ~ .*\.(js|css)?$` 规则优先级高于 `/Projects/LuckyCoin/` 前缀匹配，导致 JS/CSS 文件未被代理到 webpack-dev-server

## 解决方案

### 1. 修复 HTML 模板
**文件**: `Projects/LuckyCoin/lucky-coin-website/index.html`

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>一元奇梦 Lucky Coin</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

移除了 Vite 的 module script 标签，让 webpack 自动注入构建后的脚本。

### 2. 配置 webpack publicPath
**文件**: `Projects/LuckyCoin/lucky-coin-website/webpack.config.cjs`

```javascript
output: {
  path: path.resolve(__dirname, 'dist'),
  filename: isDevelopment ? '[name].js' : '[name].[contenthash].js',
  clean: true,
  publicPath: '/Projects/LuckyCoin/',  // 设置子路径
},

devServer: {
  static: {
    directory: path.join(__dirname, 'public'),
  },
  compress: true,
  port: 5173,
  hot: true,
  historyApiFallback: {
    index: '/Projects/LuckyCoin/index.html',  // 指定回退路径
  },
  open: false,
  devMiddleware: {
    publicPath: '/Projects/LuckyCoin/',  // 开发服务器的公共路径
  },
},
```

### 3. 配置 React Router basename
**文件**: `Projects/LuckyCoin/lucky-coin-website/src/App.tsx`

```typescript
export default function App() {
  return (
    <BrowserRouter basename="/Projects/LuckyCoin">
      <Routes>
        {/* ... */}
      </Routes>
    </BrowserRouter>
  );
}
```

### 4. 修复 Nginx 配置优先级
**文件**: `/www/server/panel/vhost/nginx/ibubble.vicp.net.conf`

```nginx
location ^~ /Projects/LuckyCoin/ {
    proxy_pass http://127.0.0.1:5173;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host localhost:5173;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 86400;
}
```

关键修改：使用 `location ^~` 前缀匹配修饰符，提高优先级，阻止正则表达式 location 的匹配。

## 验证结果

1. **HTML 正确返回**:
   ```bash
   curl -k -s https://home.liukun.com:8443/Projects/LuckyCoin/
   ```
   返回正确的 HTML，包含 `/Projects/LuckyCoin/vendors.js` 和 `/Projects/LuckyCoin/main.js`

2. **JavaScript 文件正确加载**:
   ```bash
   curl -k -s -I https://home.liukun.com:8443/Projects/LuckyCoin/vendors.js
   ```
   返回 HTTP/2 200

3. **开发服务器运行正常**:
   - 端口: 5173
   - 进程: npm run dev (ProcessId: 13)
   - 编译状态: webpack 5.104.1 compiled successfully

## 访问地址

- **开发环境**: https://home.liukun.com:8443/Projects/LuckyCoin/
- **本地直连**: http://127.0.0.1:5173/Projects/LuckyCoin/

## 下一步

根据 `Projects/LuckyCoin/.kiro/specs/lucky-coin-website/tasks.md` 继续开发：
- 任务 11.1: 实现首页布局（已完成基础结构）
- 任务 11.2: 编写首页渲染单元测试
- 后续任务: 实现其他页面和功能

## 技术要点

1. **Nginx location 优先级**:
   - `location =` (精确匹配) > `location ^~` (前缀匹配，不检查正则) > `location ~` (正则匹配) > `location /` (普通前缀匹配)
   
2. **webpack publicPath**:
   - 开发环境和生产环境都需要设置正确的 publicPath
   - devMiddleware.publicPath 控制开发服务器的路径

3. **React Router basename**:
   - 部署在子路径时必须设置 basename
   - 所有路由都会自动添加这个前缀

## 相关文件

- `Projects/LuckyCoin/lucky-coin-website/index.html`
- `Projects/LuckyCoin/lucky-coin-website/webpack.config.cjs`
- `Projects/LuckyCoin/lucky-coin-website/src/App.tsx`
- `/www/server/panel/vhost/nginx/ibubble.vicp.net.conf`
