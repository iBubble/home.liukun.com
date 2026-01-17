# 设计文档：《一元奇梦 Lucky Coin》电影项目网站

## 概述

《一元奇梦 Lucky Coin》网站是一个沉浸式的电影项目展示平台，通过魔幻现实主义的视觉语言和互动体验，呈现温州人在意大利普拉托的梦想与现实冲突。网站采用双模式设计（梦境/现实），结合荒诞喜剧风格的交互元素，为投资人、发行商和观众提供独特的品牌体验。

### 设计目标

1. 创造强烈的视觉冲击和情感共鸣
2. 通过互动叙事传达电影的核心主题
3. 建立独特的品牌识别度
4. 吸引目标受众（投资人、发行商、艺术电影爱好者）
5. 提供流畅的跨设备体验

### 技术栈

- 前端框架：React 18 + TypeScript
- 动画库：Framer Motion + GSAP
- 3D 效果：Three.js
- 样式方案：Tailwind CSS + CSS Modules
- 状态管理：Zustand
- 构建工具：Vite
- 后端：Node.js + Express
- 数据库：PostgreSQL
- 部署：Vercel (前端) + Railway (后端)

## 架构设计

### 系统架构

网站采用前后端分离的架构，前端为单页应用（SPA），后端提供 RESTful API 服务。

```
┌─────────────────────────────────────────────────────────┐
│                     用户浏览器                            │
│  ┌──────────────────────────────────────────────────┐   │
│  │           React SPA (前端应用)                    │   │
│  │  ┌────────────┐  ┌────────────┐  ┌───────────┐  │   │
│  │  │ 路由管理   │  │ 状态管理   │  │ 动画引擎  │  │   │
│  │  │ (Router)   │  │ (Zustand)  │  │ (Motion)  │  │   │
│  │  └────────────┘  └────────────┘  └───────────┘  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                          │ HTTPS/REST API
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    后端服务器                             │
│  ┌──────────────────────────────────────────────────┐   │
│  │           Express API Server                      │   │
│  │  ┌────────────┐  ┌────────────┐  ┌───────────┐  │   │
│  │  │ 路由控制   │  │ 业务逻辑   │  │ 数据访问  │  │   │
│  │  │ (Routes)   │  │ (Services) │  │ (Models)  │  │   │
│  │  └────────────┘  └────────────┘  └───────────┘  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  PostgreSQL 数据库                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  用户数据表  │  │  内容数据表  │  │  分析数据表  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```


### 前端架构

前端采用组件化设计，按功能模块划分：

```
src/
├── components/           # 可复用组件
│   ├── SlotMachine/     # 老虎机组件
│   ├── ModeToggle/      # 模式切换组件
│   ├── SliderComparison/# 对比滑块组件
│   ├── CharacterCard/   # 角色卡牌组件
│   ├── GlitchEffect/    # 故障效果组件
│   └── CursorTrail/     # 光标轨迹组件
├── pages/               # 页面组件
│   ├── Home/            # 首页（老虎机入口）
│   ├── Story/           # 故事板页面
│   ├── Characters/      # 角色页面
│   ├── Director/        # 导演风格页面
│   ├── Crowdfunding/    # 众筹页面
│   └── Investor/        # 投资人专区
├── hooks/               # 自定义 Hooks
│   ├── useMode.ts       # 模式管理
│   ├── useGlitch.ts     # 故障效果控制
│   └── useCursorTrail.ts# 光标轨迹控制
├── stores/              # 状态管理
│   ├── modeStore.ts     # 模式状态
│   └── userStore.ts     # 用户数据
├── styles/              # 样式文件
│   ├── colors.ts        # 色彩系统
│   ├── typography.ts    # 字体系统
│   └── animations.ts    # 动画配置
├── utils/               # 工具函数
│   ├── random.ts        # 随机数生成
│   └── api.ts           # API 调用
└── types/               # TypeScript 类型定义
    └── index.ts
```

### 后端架构

后端采用 MVC 模式，提供 RESTful API：

```
server/
├── routes/              # 路由定义
│   ├── users.ts         # 用户相关路由
│   ├── content.ts       # 内容管理路由
│   └── analytics.ts     # 数据分析路由
├── controllers/         # 控制器
│   ├── userController.ts
│   ├── contentController.ts
│   └── analyticsController.ts
├── services/            # 业务逻辑
│   ├── userService.ts
│   ├── contentService.ts
│   └── analyticsService.ts
├── models/              # 数据模型
│   ├── User.ts
│   ├── Content.ts
│   └── Analytics.ts
├── middleware/          # 中间件
│   ├── auth.ts          # 认证中间件
│   └── validation.ts    # 验证中间件
└── config/              # 配置文件
    ├── database.ts
    └── env.ts
```

## 组件与接口设计

### 核心组件

#### 1. SlotMachine 组件

老虎机入口组件，负责首页交互和模式选择。

**接口定义：**

```typescript
interface SlotMachineProps {
  onResult: (mode: 'dream' | 'reality') => void;
}

interface SlotMachineState {
  isSpinning: boolean;
  result: 'dollar' | 'sewing-machine' | null;
  probability: number; // 0-1 之间
}
```

**核心方法：**

- `spin()`: 触发老虎机转动
- `calculateResult()`: 根据概率计算结果（10% 梦境，90% 现实）
- `playAnimation()`: 播放转动和结果动画
- `playSound()`: 播放音效（金币雨或走音喇叭）

**动画流程：**

1. 用户点击"投币"按钮
2. 拉杆下拉动画（300ms）
3. 转轮旋转动画（2000ms，加速→匀速→减速）
4. 结果显示动画（500ms）
5. 根据结果播放特效（金币雨 1500ms 或喇叭音效 800ms）
6. 转场到对应模式页面（1000ms）


#### 2. ModeToggle 组件

模式切换组件，允许用户在梦境和现实模式间切换。

**接口定义：**

```typescript
interface ModeToggleProps {
  currentMode: 'dream' | 'reality';
  onToggle: (mode: 'dream' | 'reality') => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

interface ModeState {
  mode: 'dream' | 'reality';
  isTransitioning: boolean;
}
```

**核心方法：**

- `toggle()`: 切换模式
- `applyTheme()`: 应用对应模式的主题样式
- `animateTransition()`: 播放切换过渡动画

**视觉设计：**

- 梦境模式图标：金色硬币 + 发光效果
- 现实模式图标：灰色缝纫机 + 金属质感
- 切换动画：翻转 + 色彩渐变（500ms）

#### 3. SliderComparison 组件

左右分屏对比滑块组件，用于故事板展示。

**接口定义：**

```typescript
interface SliderComparisonProps {
  dreamContent: {
    image: string;
    caption: string;
  };
  realityContent: {
    image: string;
    caption: string;
  };
  initialPosition?: number; // 0-100，默认 50
}

interface SliderState {
  position: number; // 0-100
  isDragging: boolean;
}
```

**核心方法：**

- `handleDrag()`: 处理滑块拖动
- `updatePosition()`: 更新左右内容的可见区域
- `snapToPosition()`: 吸附到特定位置（可选）

**交互细节：**

- 滑块手柄：圆形，带有左右箭头指示
- 拖动反馈：实时更新左右内容比例
- 响应式：移动端改为上下滑动
- 性能优化：使用 CSS transform 而非 width 调整

#### 4. CharacterCard 组件

角色卡牌组件，以 RPG 游戏风格展示角色信息。

**接口定义：**

```typescript
interface CharacterCardProps {
  character: {
    id: string;
    name: string;
    avatar: string;
    stats: {
      [key: string]: string | number;
    };
    skill?: {
      name: string;
      description: string;
      effect: string;
    };
  };
  onClick?: (id: string) => void;
}

interface CharacterCardState {
  isHovered: boolean;
  isFlipped: boolean;
}
```

**核心方法：**

- `handleHover()`: 处理悬停效果
- `handleClick()`: 处理点击事件
- `renderStats()`: 渲染属性面板
- `renderSkill()`: 渲染必杀技信息

**视觉设计：**

- 卡牌尺寸：300x450px（桌面），280x420px（移动）
- 边框：金色（梦境模式）或灰色（现实模式）
- 悬停效果：放大 1.05 倍 + 阴影增强
- 翻转动画：3D 翻转效果（800ms）

#### 5. GlitchEffect 组件

故障艺术效果组件，模拟信号干扰。

**接口定义：**

```typescript
interface GlitchEffectProps {
  trigger: 'transition' | 'random' | 'manual';
  intensity?: 'low' | 'medium' | 'high';
  duration?: number; // 毫秒
  children: React.ReactNode;
}

interface GlitchState {
  isActive: boolean;
  offset: { x: number; y: number };
  colorShift: { r: number; g: number; b: number };
}
```

**核心方法：**

- `activate()`: 激活故障效果
- `deactivate()`: 停止故障效果
- `generateRandomOffset()`: 生成随机偏移
- `applyColorShift()`: 应用色彩分离

**效果实现：**

- 雪花点：Canvas 绘制随机噪点
- 色彩分离：RGB 通道分离偏移
- 画面扭曲：CSS clip-path 动画
- 扫描线：伪元素 + 渐变背景


#### 6. CursorTrail 组件

光标轨迹组件，模拟缝纫线效果。

**接口定义：**

```typescript
interface CursorTrailProps {
  enabled: boolean;
  color?: string;
  maxTrails?: number; // 最大轨迹数量
  fadeOutDuration?: number; // 淡出时长（毫秒）
}

interface TrailPoint {
  x: number;
  y: number;
  timestamp: number;
}

interface CursorTrailState {
  trails: TrailPoint[][];
  currentTrail: TrailPoint[];
}
```

**核心方法：**

- `trackMouse()`: 追踪鼠标位置
- `addPoint()`: 添加轨迹点
- `removeOldTrails()`: 清除过期轨迹
- `renderTrails()`: 渲染所有轨迹

**实现细节：**

- 使用 SVG path 绘制轨迹
- 虚线样式：stroke-dasharray="5,5"
- 针脚效果：每隔一定距离添加小圆点
- 性能优化：限制轨迹点数量，使用 requestAnimationFrame

## 数据模型

### 用户数据模型

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: Date;
  language: 'zh-CN' | 'en' | 'it';
  hasReserved: boolean;
}
```

**数据库表结构：**

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  language VARCHAR(10) DEFAULT 'zh-CN',
  has_reserved BOOLEAN DEFAULT false
);
```

### 内容数据模型

```typescript
interface Content {
  id: string;
  type: 'text' | 'image' | 'video' | 'audio';
  key: string; // 内容标识符
  value: {
    'zh-CN': string;
    'en': string;
    'it': string;
  };
  updatedAt: Date;
  updatedBy: string;
}
```

**数据库表结构：**

```sql
CREATE TABLE contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL,
  key VARCHAR(100) UNIQUE NOT NULL,
  value_zh_cn TEXT,
  value_en TEXT,
  value_it TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(100)
);
```

### 分析数据模型

```typescript
interface Analytics {
  id: string;
  eventType: 'page_view' | 'slot_result' | 'mode_toggle' | 'reservation' | 'card_click';
  eventData: Record<string, any>;
  userId?: string;
  sessionId: string;
  timestamp: Date;
  userAgent: string;
  ipAddress: string;
}
```

**数据库表结构：**

```sql
CREATE TABLE analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB,
  user_id UUID REFERENCES users(id),
  session_id VARCHAR(100) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_agent TEXT,
  ip_address INET
);

CREATE INDEX idx_analytics_event_type ON analytics(event_type);
CREATE INDEX idx_analytics_timestamp ON analytics(timestamp);
CREATE INDEX idx_analytics_session_id ON analytics(session_id);
```

### 角色数据模型

```typescript
interface Character {
  id: string;
  name: {
    'zh-CN': string;
    'en': string;
    'it': string;
  };
  avatar: string;
  stats: {
    [key: string]: {
      label: {
        'zh-CN': string;
        'en': string;
        'it': string;
      };
      value: string | number;
      rank?: 'SSS' | 'SS' | 'S' | 'A' | 'B' | 'C' | 'D';
    };
  };
  skill?: {
    name: {
      'zh-CN': string;
      'en': string;
      'it': string;
    };
    description: {
      'zh-CN': string;
      'en': string;
      'it': string;
    };
    effect: {
      'zh-CN': string;
      'en': string;
      'it': string;
    };
  };
  order: number;
}
```


## 色彩系统设计

### 色彩定义

**梦境模式（Acid Colors）：**

```typescript
const dreamColors = {
  primary: '#00FF41',      // 荧光绿
  secondary: '#FF1493',    // 芭比粉
  accent: '#FFD700',       // 土豪金
  background: '#1a0033',   // 深紫黑
  text: '#FFFFFF',         // 纯白
  glow: 'rgba(0, 255, 65, 0.5)', // 发光效果
};
```

**现实模式（Industrial Colors）：**

```typescript
const realityColors = {
  primary: '#8B4513',      // 铁锈红
  secondary: '#708090',    // 水泥灰
  accent: '#4682B4',       // 牛仔蓝
  background: '#2F4F4F',   // 深灰绿
  text: '#E5E5E5',         // 浅灰白
  shadow: 'rgba(0, 0, 0, 0.6)', // 阴影
};
```

### 色彩应用策略

1. **突兀拼接**：在同一页面中使用梦境和现实色彩的强烈对比
2. **渐变过渡**：模式切换时使用色彩渐变动画
3. **层次分明**：使用色彩区分前景、中景、背景
4. **情绪引导**：梦境模式使用高饱和度激发兴奋，现实模式使用低饱和度传达压抑

### 可访问性考虑

- 确保文字与背景对比度 ≥ 4.5:1（WCAG AA 标准）
- 提供高对比度模式选项
- 不仅依赖色彩传达信息，配合图标和文字

## 字体系统设计

### 字体选择

**标题字体（故障感）：**

```css
@font-face {
  font-family: 'GlitchTitle';
  src: url('/fonts/glitch-title.woff2') format('woff2');
  font-weight: 700;
  font-display: swap;
}
```

备选方案：使用 CSS 效果模拟故障感

```css
.glitch-text {
  font-family: 'Bebas Neue', 'Impact', sans-serif;
  text-shadow: 
    2px 2px 0 #FF1493,
    -2px -2px 0 #00FF41;
  animation: glitch 1s infinite;
}
```

**正文字体（打字机风格）：**

```css
@font-face {
  font-family: 'TypewriterBody';
  src: url('/fonts/typewriter.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}
```

备选方案：Courier New, Monaco, monospace

**中文字体：**

- 标题：思源黑体 Bold / Noto Sans SC Bold
- 正文：思源黑体 Regular / Noto Sans SC Regular

### 字体大小系统

```typescript
const typography = {
  h1: {
    desktop: '72px',
    tablet: '56px',
    mobile: '40px',
  },
  h2: {
    desktop: '48px',
    tablet: '40px',
    mobile: '32px',
  },
  h3: {
    desktop: '36px',
    tablet: '30px',
    mobile: '24px',
  },
  body: {
    desktop: '18px',
    tablet: '16px',
    mobile: '14px',
  },
  caption: {
    desktop: '14px',
    tablet: '13px',
    mobile: '12px',
  },
};
```

## 动画系统设计

### 动画原则

1. **夸张性**：动画幅度要大，符合荒诞喜剧风格
2. **不可预测性**：加入随机元素，增加趣味性
3. **流畅性**：保持 60 FPS，避免卡顿
4. **意义性**：每个动画都应服务于叙事或交互反馈

### 核心动画

**1. 老虎机转动动画**

```typescript
const slotSpinAnimation = {
  initial: { rotateX: 0 },
  animate: {
    rotateX: [0, 360, 720, 1080, 1440],
    transition: {
      duration: 2,
      times: [0, 0.2, 0.5, 0.8, 1],
      ease: [0.43, 0.13, 0.23, 0.96], // 自定义缓动
    },
  },
};
```

**2. 金币雨动画**

```typescript
const coinRainAnimation = {
  particles: 50,
  duration: 1500,
  physics: {
    gravity: 0.5,
    bounce: 0.3,
    rotation: true,
  },
};
```

实现：使用 Canvas 绘制粒子系统

**3. 模式切换动画**

```typescript
const modeTransitionAnimation = {
  exit: {
    opacity: 0,
    scale: 0.8,
    filter: 'blur(10px)',
    transition: { duration: 0.3 },
  },
  enter: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.5, delay: 0.2 },
  },
};
```

**4. 卡牌翻转动画**

```typescript
const cardFlipAnimation = {
  rotateY: [0, 180],
  transition: {
    duration: 0.8,
    ease: 'easeInOut',
  },
};
```

**5. 故障效果动画**

```typescript
const glitchAnimation = {
  keyframes: [
    { clipPath: 'inset(0 0 0 0)' },
    { clipPath: 'inset(10% 0 85% 0)' },
    { clipPath: 'inset(80% 0 15% 0)' },
    { clipPath: 'inset(50% 0 30% 0)' },
    { clipPath: 'inset(0 0 0 0)' },
  ],
  duration: 300,
  iterations: 3,
};
```


### 性能优化动画

- 使用 CSS transform 和 opacity（GPU 加速）
- 避免触发 layout 和 paint
- 使用 will-change 提示浏览器优化
- 在低性能设备上降低动画复杂度

```typescript
const useReducedMotion = () => {
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;
  return prefersReducedMotion;
};
```

## API 接口设计

### RESTful API 端点

**用户相关：**

```
POST   /api/users              创建用户（一元预订）
GET    /api/users/:id          获取用户信息
PUT    /api/users/:id          更新用户信息
DELETE /api/users/:id          删除用户
```

**内容管理：**

```
GET    /api/contents           获取所有内容
GET    /api/contents/:key      获取特定内容
PUT    /api/contents/:key      更新内容
POST   /api/contents           创建新内容
DELETE /api/contents/:key      删除内容
```

**角色管理：**

```
GET    /api/characters         获取所有角色
GET    /api/characters/:id     获取特定角色
PUT    /api/characters/:id     更新角色
POST   /api/characters         创建新角色
DELETE /api/characters/:id     删除角色
```

**数据分析：**

```
POST   /api/analytics/event    记录分析事件
GET    /api/analytics/summary  获取数据摘要
GET    /api/analytics/export   导出分析数据
```

**认证：**

```
POST   /api/auth/login         管理员登录
POST   /api/auth/logout        管理员登出
GET    /api/auth/verify        验证登录状态
```

### API 请求/响应示例

**创建用户（一元预订）：**

请求：
```json
POST /api/users
Content-Type: application/json

{
  "name": "张三",
  "email": "zhangsan@example.com",
  "phone": "+86 138 0000 0000",
  "language": "zh-CN"
}
```

响应：
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "张三",
    "email": "zhangsan@example.com",
    "phone": "+86 138 0000 0000",
    "language": "zh-CN",
    "hasReserved": true,
    "createdAt": "2026-01-17T10:30:00Z"
  },
  "message": "预订成功"
}
```

**记录分析事件：**

请求：
```json
POST /api/analytics/event
Content-Type: application/json

{
  "eventType": "slot_result",
  "eventData": {
    "result": "dream",
    "timestamp": 1705488600000
  },
  "sessionId": "abc123xyz"
}
```

响应：
```json
{
  "success": true,
  "message": "事件已记录"
}
```

**获取内容：**

请求：
```
GET /api/contents/hero-title?lang=zh-CN
```

响应：
```json
{
  "success": true,
  "data": {
    "key": "hero-title",
    "type": "text",
    "value": "做梦只要一块钱，醒来得踩一万脚",
    "updatedAt": "2026-01-15T08:00:00Z"
  }
}
```

### API 错误处理

统一错误响应格式：

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "邮箱格式无效",
    "details": {
      "field": "email",
      "value": "invalid-email"
    }
  }
}
```

错误代码：
- `VALIDATION_ERROR`: 验证错误
- `NOT_FOUND`: 资源不存在
- `UNAUTHORIZED`: 未授权
- `FORBIDDEN`: 禁止访问
- `INTERNAL_ERROR`: 服务器内部错误
- `RATE_LIMIT_EXCEEDED`: 请求频率超限


## 正确性属性

属性（Property）是关于系统行为的特征或规则，应该在所有有效执行中保持为真。属性是人类可读规范和机器可验证正确性保证之间的桥梁。

### 验收标准测试性分析

**需求 1：老虎机入口交互**

1.1 WHEN THE Website_System 加载首页，THE Website_System SHALL 在屏幕中央显示一台复古老虎机动画
- 思考：这是测试 UI 渲染的特定场景，可以通过检查 DOM 元素是否存在来验证
- 可测试性：是 - 示例

1.2 WHEN THE User 点击"投币（Insert Coin）"按钮，THE Slot_Machine SHALL 播放拉杆转动动画
- 思考：这是测试交互触发动画的行为，适用于所有点击事件
- 可测试性：是 - 属性

1.3 WHEN THE Slot_Machine 转动完成，THE Website_System SHALL 以 10% 概率显示三个"$"符号并触发金币雨动画
- 思考：这是测试概率分布，需要多次运行来验证概率接近 10%
- 可测试性：是 - 属性

1.4 WHEN THE Slot_Machine 显示三个"$"符号，THE Website_System SHALL 转场进入 Dream_Mode 页面
- 思考：这是测试结果与模式的映射关系，适用于所有"$"结果
- 可测试性：是 - 属性

1.5 WHEN THE Slot_Machine 转动完成，THE Website_System SHALL 以 90% 概率显示三个"缝纫机"符号并播放走音喇叭音效
- 思考：这是测试概率分布，需要多次运行来验证概率接近 90%
- 可测试性：是 - 属性

1.6 WHEN THE Slot_Machine 显示三个"缝纫机"符号，THE Website_System SHALL 转场进入 Reality_Mode 页面
- 思考：这是测试结果与模式的映射关系，适用于所有"缝纫机"结果
- 可测试性：是 - 属性

1.7 WHEN THE User 在任意页面内，THE Website_System SHALL 提供梦境/现实模式切换开关
- 思考：这是测试 UI 元素在所有页面的存在性
- 可测试性：是 - 属性

1.8 WHEN THE User 点击模式切换开关，THE Website_System SHALL 在 Dream_Mode 和 Reality_Mode 之间切换并保持当前页面位置
- 思考：这是测试切换行为的往返属性（round trip）
- 可测试性：是 - 属性

**需求 2：双模式视觉系统**

2.1 WHILE IN Dream_Mode，THE Website_System SHALL 使用 Acid_Color 色系作为主色调
- 思考：这是测试在特定状态下的视觉属性，适用于所有梦境模式页面
- 可测试性：是 - 属性

2.2 WHILE IN Reality_Mode，THE Website_System SHALL 使用 Industrial_Color 色系作为主色调
- 思考：这是测试在特定状态下的视觉属性，适用于所有现实模式页面
- 可测试性：是 - 属性

2.3-2.4 渲染特定模式的视觉元素
- 思考：这些是 UI 渲染测试，可以验证特定元素的存在
- 可测试性：是 - 示例

2.5 WHEN 切换模式时，THE Website_System SHALL 在 500 毫秒内完成色彩和视觉元素的过渡动画
- 思考：这是性能测试，测试动画完成时间
- 可测试性：是 - 属性

2.6-2.8 视觉风格和字体
- 思考：这些是 UI 样式测试
- 可测试性：是 - 示例

**需求 3：荒诞剧场对比展示**

3.1-3.3 滑块组件的初始渲染
- 思考：这些是 UI 渲染测试
- 可测试性：是 - 示例

3.4 WHEN THE User 拖动滑块，THE Slider_Component SHALL 实时调整左右两侧场景的可见区域比例
- 思考：这是测试拖动输入与输出比例的关系，适用于所有拖动位置
- 可测试性：是 - 属性

3.5-3.7 文案和构图
- 思考：这些是内容和样式测试
- 可测试性：是 - 示例

3.8 WHEN THE User 释放滑块，THE Slider_Component SHALL 保持当前位置不自动复位
- 思考：这是测试状态保持的不变性
- 可测试性：是 - 属性

**需求 4：角色卡牌系统**

4.1-4.6 角色卡牌的渲染和属性
- 思考：这些是 UI 渲染和数据展示测试
- 可测试性：是 - 示例

4.7 THE Character_Card SHALL 使用荒诞夸张的数值和描述文案
- 思考：这是内容风格要求，不是可计算的属性
- 可测试性：否

4.8 WHEN 点击 Character_Card，THE Website_System SHALL 显示角色的详细介绍弹窗
- 思考：这是测试点击交互触发弹窗，适用于所有角色卡牌
- 可测试性：是 - 属性

**需求 5：导演风格展示**

5.1-5.3 参考片单的展示
- 思考：这些是内容展示测试
- 可测试性：是 - 示例

5.4-5.6 音乐播放功能
- 思考：这些是音频功能测试
- 可测试性：是 - 示例

5.7 THE Website_System SHALL 提供音乐播放控制（播放、暂停、音量调节）
- 思考：这是测试播放控制的状态转换
- 可测试性：是 - 属性

5.8 文案风格
- 思考：这是内容风格要求
- 可测试性：否

**需求 6：一元众筹功能**

6.1-6.3 表单展示和数据收集
- 思考：这些是 UI 和表单功能测试
- 可测试性：是 - 示例

6.4 WHEN THE User 提交表单，THE Website_System SHALL 验证邮箱格式的有效性
- 思考：这是测试输入验证，适用于所有邮箱输入
- 可测试性：是 - 属性

6.5 WHEN THE User 提交表单，THE Website_System SHALL 验证手机号码格式的有效性
- 思考：这是测试输入验证，适用于所有手机号输入
- 可测试性：是 - 属性

6.6 WHEN 表单验证通过，THE Website_System SHALL 保存用户数据到数据库
- 思考：这是测试数据持久化，可以通过往返测试验证
- 可测试性：是 - 属性

6.7-6.8 成功和错误消息
- 思考：这些是 UI 反馈测试
- 可测试性：是 - 示例

**需求 7：投资人专区**

7.1-7.7 内容展示和数据可视化
- 思考：这些是内容和 UI 展示测试
- 可测试性：是 - 示例

7.8 WHEN THE User 悬停在数据点上，THE Website_System SHALL 显示详细数值和说明
- 思考：这是测试悬停交互，适用于所有数据点
- 可测试性：是 - 属性

**需求 8：故障艺术效果**

8.1-8.5 故障效果的触发和持续时间
- 思考：这些是动画效果测试，可以验证效果的触发和时长
- 可测试性：是 - 属性

8.6 THE Website_System SHALL 确保 Glitch_Effect 不影响页面交互功能
- 思考：这是测试在故障效果期间交互功能仍然可用
- 可测试性：是 - 属性

8.7-8.8 性能和可访问性
- 思考：这些是性能和用户偏好测试
- 可测试性：是 - 示例

**需求 9：光标轨迹效果**

9.1-9.4 光标轨迹的渲染和淡出
- 思考：这些是视觉效果测试
- 可测试性：是 - 属性

9.5-9.6 不同模式下的颜色
- 思考：这是测试模式与颜色的映射关系
- 可测试性：是 - 属性

9.7-9.8 设备适配和性能
- 思考：这些是设备检测和性能测试
- 可测试性：是 - 示例

**需求 10：响应式设计**

10.1-10.3 不同设备的布局
- 思考：这些是响应式布局测试
- 可测试性：是 - 属性

10.4-10.6 移动布局的特定调整
- 思考：这些是移动端适配测试
- 可测试性：是 - 示例

10.7-10.8 可读性和触摸目标
- 思考：这些是可访问性测试
- 可测试性：是 - 属性

**需求 11：性能优化**

11.1 WHEN THE User 首次访问网站，THE Website_System SHALL 在 3 秒内完成首屏加载
- 思考：这是性能测试，测试加载时间
- 可测试性：是 - 属性

11.2-11.7 资源优化策略
- 思考：这些是实现细节，不是功能测试
- 可测试性：否

11.8 WHEN 检测到低性能设备，THE Website_System SHALL 自动降低动画复杂度
- 思考：这是测试设备检测和动画降级
- 可测试性：是 - 示例

**需求 12：可访问性**

12.1-12.8 可访问性功能
- 思考：这些是可访问性合规测试
- 可测试性：是 - 属性

**需求 13：内容管理**

13.1-13.6 后台管理功能
- 思考：这些是管理功能测试
- 可测试性：是 - 示例

13.7 WHEN 管理员保存更改，THE Website_System SHALL 在 5 秒内更新前台显示
- 思考：这是测试数据同步的时效性
- 可测试性：是 - 属性

13.8 THE Website_System SHALL 记录所有内容修改的历史版本
- 思考：这是测试版本控制功能
- 可测试性：是 - 属性

**需求 14：数据分析**

14.1-14.7 数据追踪和可视化
- 思考：这些是分析功能测试
- 可测试性：是 - 示例

14.8 THE Website_System SHALL 每日生成访问报告并发送给管理员
- 思考：这是测试定时任务功能
- 可测试性：是 - 示例

**需求 15：多语言支持**

15.1-15.3 语言支持和自动选择
- 思考：这些是国际化功能测试
- 可测试性：是 - 示例

15.4 WHEN THE User 切换语言，THE Website_System SHALL 在 1 秒内更新所有界面文本
- 思考：这是测试语言切换的性能
- 可测试性：是 - 属性

15.5 WHEN 切换语言，THE Website_System SHALL 保持用户当前的页面位置和状态
- 思考：这是测试状态保持的不变性
- 可测试性：是 - 属性

15.6-15.8 语言偏好保存和字体适配
- 思考：这些是持久化和样式测试
- 可测试性：是 - 示例


### 属性反思与去重

在分析了所有验收标准后，我发现以下可以合并或简化的属性：

1. **概率属性**：需求 1.3 和 1.5 都是测试概率分布，可以合并为一个综合属性
2. **模式映射属性**：需求 1.4 和 1.6 都是测试结果到模式的映射，可以合并
3. **色彩系统属性**：需求 2.1 和 2.2 都是测试模式与色彩的关系，可以合并
4. **验证属性**：需求 6.4 和 6.5 都是输入验证，可以合并为一个通用验证属性
5. **模式切换属性**：需求 9.5 和 9.6 测试的是同一个映射关系

### 核心正确性属性

**属性 1：老虎机概率分布**

*对于任意* 足够大的样本量（n ≥ 1000），老虎机转动结果中"$"符号出现的频率应该在 8% 到 12% 之间，"缝纫机"符号出现的频率应该在 88% 到 92% 之间。

**验证需求：1.3, 1.5**

**属性 2：结果到模式的映射一致性**

*对于任意* 老虎机转动结果，如果结果是"$"符号，则系统应该转场到梦境模式；如果结果是"缝纫机"符号，则系统应该转场到现实模式。

**验证需求：1.4, 1.6**

**属性 3：模式切换的往返一致性**

*对于任意* 当前模式（梦境或现实）和页面位置，执行两次模式切换操作后，系统应该返回到原始模式和相同的页面位置。

**验证需求：1.8**

**属性 4：模式与色彩系统的一致性**

*对于任意* 页面，当处于梦境模式时，主色调应该使用酸性色系（荧光绿、芭比粉、土豪金）；当处于现实模式时，主色调应该使用工业色系（铁锈红、水泥灰、牛仔蓝）。

**验证需求：2.1, 2.2**

**属性 5：滑块位置与可见区域的线性关系**

*对于任意* 滑块位置 p（0 ≤ p ≤ 100），左侧场景的可见宽度应该等于 p%，右侧场景的可见宽度应该等于 (100-p)%。

**验证需求：3.4**

**属性 6：滑块位置的持久性**

*对于任意* 滑块位置，当用户释放滑块后，该位置应该保持不变，直到用户再次拖动。

**验证需求：3.8**

**属性 7：表单输入验证的完整性**

*对于任意* 用户提交的表单数据，系统应该验证邮箱格式符合标准正则表达式（包含 @ 和域名），验证手机号码格式符合国际或本地格式标准。

**验证需求：6.4, 6.5**

**属性 8：数据持久化的往返一致性**

*对于任意* 有效的用户数据，保存到数据库后再读取，应该得到相同的数据（除了系统生成的字段如 id 和 createdAt）。

**验证需求：6.6**

**属性 9：故障效果的非阻塞性**

*对于任意* 页面交互操作（点击、滚动、输入），在故障效果播放期间执行该操作，应该产生与无故障效果时相同的结果。

**验证需求：8.6**

**属性 10：光标轨迹颜色与模式的映射**

*对于任意* 鼠标移动，当处于梦境模式时，光标轨迹应该使用金色或荧光色；当处于现实模式时，光标轨迹应该使用灰色或蓝色。

**验证需求：9.5, 9.6**

**属性 11：响应式布局的断点一致性**

*对于任意* 视口宽度 w，当 w ≥ 1024px 时使用桌面布局，当 768px ≤ w < 1024px 时使用平板布局，当 w < 768px 时使用移动布局。

**验证需求：10.1, 10.2, 10.3**

**属性 12：触摸目标的最小尺寸**

*对于任意* 交互元素（按钮、链接、输入框），其触摸目标区域的宽度和高度都应该不小于 44 像素。

**验证需求：10.8**

**属性 13：首屏加载性能**

*对于任意* 首次访问，在标准网络条件下（3G 或更快），首屏内容应该在 3 秒内完成加载和渲染。

**验证需求：11.1**

**属性 14：文字对比度的可访问性**

*对于任意* 文字元素，其与背景的对比度应该不小于 4.5:1（符合 WCAG AA 标准）。

**验证需求：12.4**

**属性 15：键盘导航的完整性**

*对于任意* 交互元素，应该可以通过 Tab 键导航到达，并且在获得焦点时显示清晰的视觉指示器。

**验证需求：12.2, 12.3**

**属性 16：内容更新的时效性**

*对于任意* 管理员在后台保存的内容更改，前台页面应该在 5 秒内反映这些更改。

**验证需求：13.7**

**属性 17：版本历史的完整性**

*对于任意* 内容修改操作，系统应该记录修改前的版本、修改后的版本、修改时间和修改人。

**验证需求：13.8**

**属性 18：语言切换的性能**

*对于任意* 语言切换操作，所有界面文本应该在 1 秒内完成更新。

**验证需求：15.4**

**属性 19：语言切换的状态保持**

*对于任意* 页面位置和应用状态，执行语言切换后，页面位置和状态应该保持不变（仅文本内容改变）。

**验证需求：15.5**


## 错误处理

### 错误分类

**1. 用户输入错误**
- 无效的邮箱格式
- 无效的手机号码格式
- 空白或过长的表单字段
- 特殊字符注入尝试

**处理策略：**
- 前端实时验证，提供即时反馈
- 后端二次验证，防止绕过
- 显示友好的错误提示，指导用户修正
- 不暴露系统内部信息

**2. 网络错误**
- API 请求超时
- 网络连接中断
- 服务器无响应
- CORS 错误

**处理策略：**
- 实现请求重试机制（最多 3 次）
- 显示加载状态和错误提示
- 提供离线模式或降级体验
- 记录错误日志用于分析

**3. 资源加载错误**
- 图片加载失败
- 字体加载失败
- 音频加载失败
- 脚本加载失败

**处理策略：**
- 提供占位符或备用资源
- 使用 onerror 事件处理
- 实现资源预加载和懒加载
- 优雅降级，不影响核心功能

**4. 浏览器兼容性错误**
- 不支持的 API
- 不支持的 CSS 特性
- 不支持的媒体格式

**处理策略：**
- 特性检测（feature detection）
- 提供 polyfill 或 fallback
- 显示浏览器升级提示
- 确保核心功能在旧浏览器中可用

**5. 数据库错误**
- 连接失败
- 查询超时
- 数据冲突
- 存储空间不足

**处理策略：**
- 实现连接池和重连机制
- 使用事务确保数据一致性
- 记录详细错误日志
- 返回通用错误消息给前端

### 错误处理实现

**前端错误边界：**

```typescript
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 记录错误到分析服务
    logErrorToService(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

**API 错误处理：**

```typescript
async function apiCall<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(endpoint, {
      ...options,
      timeout: 10000, // 10 秒超时
    });

    if (!response.ok) {
      throw new APIError(
        response.status,
        await response.json()
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    // 网络错误或其他错误
    throw new NetworkError('网络请求失败，请检查连接');
  }
}
```

**表单验证错误：**

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

function validateForm(data: FormData): ValidationResult {
  const errors: Record<string, string> = {};

  // 邮箱验证
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = '请输入有效的邮箱地址';
  }

  // 手机号验证
  if (!data.phone || !/^[\d\s\-\+\(\)]+$/.test(data.phone)) {
    errors.phone = '请输入有效的手机号码';
  }

  // 姓名验证
  if (!data.name || data.name.trim().length === 0) {
    errors.name = '请输入姓名';
  } else if (data.name.length > 100) {
    errors.name = '姓名不能超过 100 个字符';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
```

### 错误日志记录

```typescript
interface ErrorLog {
  timestamp: Date;
  level: 'error' | 'warning' | 'info';
  message: string;
  stack?: string;
  context: {
    url: string;
    userAgent: string;
    userId?: string;
    sessionId: string;
  };
}

function logError(error: Error, context: Partial<ErrorLog['context']>) {
  const log: ErrorLog = {
    timestamp: new Date(),
    level: 'error',
    message: error.message,
    stack: error.stack,
    context: {
      url: window.location.href,
      userAgent: navigator.userAgent,
      sessionId: getSessionId(),
      ...context,
    },
  };

  // 发送到后端日志服务
  fetch('/api/logs/error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(log),
  }).catch(() => {
    // 如果日志发送失败，存储到本地
    localStorage.setItem(
      `error_${Date.now()}`,
      JSON.stringify(log)
    );
  });
}
```

## 测试策略

### 测试金字塔

```
        /\
       /  \        E2E 测试（10%）
      /____\       - 关键用户流程
     /      \      - 跨浏览器测试
    /        \     
   /  集成测试 \   集成测试（20%）
  /____________\   - API 集成
 /              \  - 组件集成
/    单元测试     \ 单元测试（70%）
/________________\ - 函数测试
                   - 组件测试
                   - 属性测试
```

### 单元测试

使用 Vitest 进行单元测试，覆盖：

**1. 工具函数测试**

```typescript
// utils/random.test.ts
describe('random utilities', () => {
  test('generateSlotResult returns dollar with ~10% probability', () => {
    const results = Array.from({ length: 10000 }, () =>
      generateSlotResult()
    );
    const dollarCount = results.filter(r => r === 'dollar').length;
    const probability = dollarCount / 10000;
    
    expect(probability).toBeGreaterThan(0.08);
    expect(probability).toBeLessThan(0.12);
  });
});
```

**2. 组件测试**

```typescript
// components/ModeToggle.test.tsx
describe('ModeToggle', () => {
  test('toggles between dream and reality modes', () => {
    const onToggle = vi.fn();
    const { getByRole } = render(
      <ModeToggle currentMode="dream" onToggle={onToggle} />
    );
    
    const button = getByRole('button');
    fireEvent.click(button);
    
    expect(onToggle).toHaveBeenCalledWith('reality');
  });
});
```

**3. 验证函数测试**

```typescript
// utils/validation.test.ts
describe('form validation', () => {
  test('validates email format', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('invalid-email')).toBe(false);
    expect(validateEmail('')).toBe(false);
  });

  test('validates phone format', () => {
    expect(validatePhone('+86 138 0000 0000')).toBe(true);
    expect(validatePhone('138-0000-0000')).toBe(true);
    expect(validatePhone('abc')).toBe(false);
  });
});
```

### 属性测试

使用 fast-check 进行属性测试，每个测试运行至少 100 次迭代：

**1. 老虎机概率属性测试**

```typescript
// Feature: lucky-coin-website, Property 1: 老虎机概率分布
test('slot machine probability distribution', () => {
  fc.assert(
    fc.property(fc.constant(null), () => {
      const results = Array.from({ length: 1000 }, () =>
        generateSlotResult()
      );
      const dollarCount = results.filter(r => r === 'dollar').length;
      const probability = dollarCount / 1000;
      
      return probability >= 0.08 && probability <= 0.12;
    }),
    { numRuns: 100 }
  );
});
```

**2. 模式切换往返属性测试**

```typescript
// Feature: lucky-coin-website, Property 3: 模式切换的往返一致性
test('mode toggle round trip consistency', () => {
  fc.assert(
    fc.property(
      fc.constantFrom('dream', 'reality'),
      fc.integer({ min: 0, max: 1000 }),
      (initialMode, scrollPosition) => {
        const store = createModeStore();
        store.setMode(initialMode);
        window.scrollTo(0, scrollPosition);
        
        const initialScroll = window.scrollY;
        
        // 切换两次
        store.toggleMode();
        store.toggleMode();
        
        return (
          store.mode === initialMode &&
          window.scrollY === initialScroll
        );
      }
    ),
    { numRuns: 100 }
  );
});
```

**3. 滑块位置线性关系属性测试**

```typescript
// Feature: lucky-coin-website, Property 5: 滑块位置与可见区域的线性关系
test('slider position linear relationship', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 100 }),
      (position) => {
        const { leftWidth, rightWidth } = calculateVisibleAreas(position);
        
        return (
          Math.abs(leftWidth - position) < 0.01 &&
          Math.abs(rightWidth - (100 - position)) < 0.01
        );
      }
    ),
    { numRuns: 100 }
  );
});
```

**4. 表单验证属性测试**

```typescript
// Feature: lucky-coin-website, Property 7: 表单输入验证的完整性
test('form validation completeness', () => {
  fc.assert(
    fc.property(
      fc.emailAddress(),
      fc.string(),
      (validEmail, invalidEmail) => {
        // 有效邮箱应该通过验证
        const validResult = validateEmail(validEmail);
        // 无效邮箱应该失败
        const invalidResult = validateEmail(invalidEmail + 'invalid');
        
        return validResult === true && invalidResult === false;
      }
    ),
    { numRuns: 100 }
  );
});
```

**5. 数据持久化往返属性测试**

```typescript
// Feature: lucky-coin-website, Property 8: 数据持久化的往返一致性
test('data persistence round trip', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.record({
        name: fc.string({ minLength: 1, maxLength: 100 }),
        email: fc.emailAddress(),
        phone: fc.string({ minLength: 10, maxLength: 20 }),
      }),
      async (userData) => {
        // 保存数据
        const saved = await saveUser(userData);
        // 读取数据
        const retrieved = await getUser(saved.id);
        
        return (
          retrieved.name === userData.name &&
          retrieved.email === userData.email &&
          retrieved.phone === userData.phone
        );
      }
    ),
    { numRuns: 100 }
  );
});
```


**6. 响应式布局断点属性测试**

```typescript
// Feature: lucky-coin-website, Property 11: 响应式布局的断点一致性
test('responsive layout breakpoint consistency', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 320, max: 2560 }),
      (viewportWidth) => {
        const layout = getLayoutType(viewportWidth);
        
        if (viewportWidth >= 1024) {
          return layout === 'desktop';
        } else if (viewportWidth >= 768) {
          return layout === 'tablet';
        } else {
          return layout === 'mobile';
        }
      }
    ),
    { numRuns: 100 }
  );
});
```

**7. 触摸目标最小尺寸属性测试**

```typescript
// Feature: lucky-coin-website, Property 12: 触摸目标的最小尺寸
test('touch target minimum size', () => {
  fc.assert(
    fc.property(
      fc.constantFrom('button', 'link', 'input'),
      (elementType) => {
        const element = document.createElement(elementType);
        document.body.appendChild(element);
        
        const rect = element.getBoundingClientRect();
        const meetsMinimum = rect.width >= 44 && rect.height >= 44;
        
        document.body.removeChild(element);
        return meetsMinimum;
      }
    ),
    { numRuns: 100 }
  );
});
```

**8. 文字对比度属性测试**

```typescript
// Feature: lucky-coin-website, Property 14: 文字对比度的可访问性
test('text contrast accessibility', () => {
  fc.assert(
    fc.property(
      fc.constantFrom(...getAllTextElements()),
      (element) => {
        const textColor = getComputedStyle(element).color;
        const bgColor = getComputedStyle(element).backgroundColor;
        const contrast = calculateContrastRatio(textColor, bgColor);
        
        return contrast >= 4.5;
      }
    ),
    { numRuns: 100 }
  );
});
```

### 集成测试

使用 Playwright 进行集成测试：

**1. API 集成测试**

```typescript
describe('User API integration', () => {
  test('creates and retrieves user', async () => {
    const userData = {
      name: '测试用户',
      email: 'test@example.com',
      phone: '+86 138 0000 0000',
    };
    
    // 创建用户
    const createResponse = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    
    expect(createResponse.ok).toBe(true);
    const created = await createResponse.json();
    
    // 获取用户
    const getResponse = await fetch(`/api/users/${created.data.id}`);
    const retrieved = await getResponse.json();
    
    expect(retrieved.data.email).toBe(userData.email);
  });
});
```

**2. 组件集成测试**

```typescript
describe('SlotMachine and ModeToggle integration', () => {
  test('slot result determines initial mode', async () => {
    const { getByText, getByRole } = render(<App />);
    
    // 点击投币按钮
    const insertButton = getByText('Insert Coin');
    fireEvent.click(insertButton);
    
    // 等待动画完成
    await waitFor(() => {
      const modeToggle = getByRole('button', { name: /mode/i });
      expect(modeToggle).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // 验证模式已设置
    const currentMode = getModeFromDOM();
    expect(['dream', 'reality']).toContain(currentMode);
  });
});
```

### 端到端测试

使用 Playwright 进行 E2E 测试：

**1. 关键用户流程测试**

```typescript
test('complete user journey: slot machine to reservation', async ({ page }) => {
  // 访问首页
  await page.goto('/');
  
  // 点击老虎机
  await page.click('button:has-text("Insert Coin")');
  
  // 等待转场完成
  await page.waitForSelector('[data-testid="main-content"]', {
    timeout: 5000,
  });
  
  // 导航到众筹页面
  await page.click('a:has-text("一元预订")');
  
  // 填写表单
  await page.fill('input[name="name"]', '张三');
  await page.fill('input[name="email"]', 'zhangsan@example.com');
  await page.fill('input[name="phone"]', '+86 138 0000 0000');
  
  // 提交表单
  await page.click('button[type="submit"]');
  
  // 验证成功消息
  await expect(page.locator('text=预订成功')).toBeVisible();
});
```

**2. 跨浏览器测试**

```typescript
const browsers = ['chromium', 'firefox', 'webkit'];

browsers.forEach(browserType => {
  test(`works in ${browserType}`, async () => {
    const browser = await playwright[browserType].launch();
    const page = await browser.newPage();
    
    await page.goto('/');
    
    // 验证核心功能
    await expect(page.locator('button:has-text("Insert Coin")')).toBeVisible();
    
    await browser.close();
  });
});
```

**3. 性能测试**

```typescript
test('first contentful paint within 3 seconds', async ({ page }) => {
  const startTime = Date.now();
  
  await page.goto('/', { waitUntil: 'networkidle' });
  
  const metrics = await page.evaluate(() => {
    const paint = performance.getEntriesByType('paint');
    const fcp = paint.find(entry => entry.name === 'first-contentful-paint');
    return fcp ? fcp.startTime : null;
  });
  
  expect(metrics).toBeLessThan(3000);
});
```

### 可访问性测试

使用 axe-core 进行可访问性测试：

```typescript
import { injectAxe, checkA11y } from 'axe-playwright';

test('homepage is accessible', async ({ page }) => {
  await page.goto('/');
  await injectAxe(page);
  
  const violations = await checkA11y(page);
  expect(violations).toHaveLength(0);
});

test('all interactive elements are keyboard accessible', async ({ page }) => {
  await page.goto('/');
  
  // 按 Tab 键遍历所有可聚焦元素
  const focusableElements = await page.locator('a, button, input, [tabindex]').all();
  
  for (let i = 0; i < focusableElements.length; i++) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['A', 'BUTTON', 'INPUT']).toContain(focused);
  }
});
```

### 测试覆盖率目标

- 单元测试覆盖率：≥ 80%
- 集成测试覆盖率：≥ 60%
- E2E 测试覆盖率：关键用户流程 100%
- 属性测试：所有核心正确性属性 100%

### 持续集成

在 CI/CD 流程中自动运行测试：

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run property tests
        run: npm run test:property
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Check coverage
        run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## 部署策略

### 环境配置

**开发环境（Development）：**
- 本地开发服务器
- 热重载
- 详细错误信息
- Mock 数据

**测试环境（Staging）：**
- 与生产环境相同的配置
- 真实数据库（测试数据）
- 完整的监控和日志
- 用于 QA 测试

**生产环境（Production）：**
- 优化的构建
- CDN 分发
- 生产数据库
- 完整的监控、日志和告警

### 部署流程

```
开发 → 提交代码 → CI 测试 → 构建 → 部署到 Staging → QA 测试 → 部署到 Production
```

**自动化部署配置：**

```yaml
# vercel.json (前端)
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "https://api.luckycoin.example.com/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "VITE_API_URL": "@api_url",
    "VITE_ANALYTICS_ID": "@analytics_id"
  }
}
```

### 监控和日志

**前端监控：**
- 使用 Sentry 监控错误
- 使用 Google Analytics 追踪用户行为
- 使用 Web Vitals 监控性能指标

**后端监控：**
- 使用 PM2 管理 Node.js 进程
- 使用 Winston 记录日志
- 使用 Prometheus + Grafana 监控系统指标

**告警配置：**
- 错误率超过 1% 时发送告警
- API 响应时间超过 2 秒时发送告警
- 服务器 CPU 使用率超过 80% 时发送告警
- 数据库连接失败时立即发送告警

### 备份和恢复

**数据库备份：**
- 每日全量备份
- 每小时增量备份
- 备份保留 30 天
- 定期测试恢复流程

**静态资源备份：**
- 使用 CDN 的多地域副本
- S3 存储的版本控制
- 定期验证资源完整性

## 安全考虑

### 前端安全

1. **XSS 防护**：使用 React 的自动转义，避免 dangerouslySetInnerHTML
2. **CSRF 防护**：使用 CSRF token
3. **内容安全策略（CSP）**：限制资源加载来源
4. **HTTPS**：强制使用 HTTPS
5. **敏感数据**：不在前端存储敏感信息

### 后端安全

1. **输入验证**：验证和清理所有用户输入
2. **SQL 注入防护**：使用参数化查询
3. **认证和授权**：使用 JWT 进行身份验证
4. **速率限制**：防止 API 滥用
5. **数据加密**：敏感数据加密存储

### 安全头配置

```typescript
// Express 安全中间件
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.luckycoin.example.com'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
```

## 性能优化

### 前端优化

1. **代码分割**：使用 React.lazy 和动态 import
2. **图片优化**：使用 WebP 格式，响应式图片
3. **字体优化**：使用 font-display: swap
4. **缓存策略**：使用 Service Worker
5. **预加载**：关键资源预加载
6. **懒加载**：非关键资源懒加载

### 后端优化

1. **数据库索引**：为常用查询字段建立索引
2. **查询优化**：避免 N+1 查询
3. **缓存**：使用 Redis 缓存热点数据
4. **连接池**：数据库连接池
5. **压缩**：Gzip/Brotli 压缩响应
6. **CDN**：静态资源使用 CDN

### 性能指标目标

- **FCP（First Contentful Paint）**：< 1.5s
- **LCP（Largest Contentful Paint）**：< 2.5s
- **FID（First Input Delay）**：< 100ms
- **CLS（Cumulative Layout Shift）**：< 0.1
- **TTI（Time to Interactive）**：< 3.5s

## 总结

本设计文档详细描述了《一元奇梦 Lucky Coin》电影项目网站的技术实现方案，包括：

1. **系统架构**：前后端分离，使用现代技术栈
2. **组件设计**：模块化、可复用的组件系统
3. **数据模型**：清晰的数据结构和数据库设计
4. **视觉系统**：独特的双模式色彩和字体系统
5. **动画系统**：丰富的交互动画和视觉效果
6. **API 设计**：RESTful API 接口规范
7. **正确性属性**：19 个核心属性确保系统正确性
8. **错误处理**：全面的错误处理和日志记录
9. **测试策略**：单元测试、属性测试、集成测试和 E2E 测试
10. **部署和监控**：自动化部署和完整的监控体系
11. **安全和性能**：安全防护和性能优化措施

该设计确保网站能够：
- 提供独特的荒诞喜剧体验
- 保持高性能和可访问性
- 确保数据安全和系统稳定
- 支持未来的扩展和维护
