# 需求文档：《一元奇梦 Lucky Coin》电影项目网站

## 简介

《一元奇梦 Lucky Coin》是一个魔幻现实主义风格的电影项目网站，展示荒诞喜剧电影的独特美学。网站通过强烈的视觉冲突、互动式叙事和黑色幽默，呈现温州人在意大利普拉托的梦想与现实对比，吸引投资人、发行商和观众。

核心调性：魔幻现实主义 + 温州土酷  
核心口号："做梦只要一块钱，醒来得踩一万脚（缝纫机）"

## 术语表

- **Website_System**: 《一元奇梦》电影项目网站系统
- **Slot_Machine**: 老虎机交互组件，作为网站入口
- **Dream_Mode**: 梦境版页面模式，展示奢华浮夸的视觉风格
- **Reality_Mode**: 现实版页面模式，展示工厂生活的真实场景
- **Slider_Component**: 左右分屏滑块组件，用于对比展示
- **Character_Card**: 角色卡牌组件，以 RPG 游戏风格展示角色信息
- **Glitch_Effect**: 故障艺术效果，模拟信号干扰的视觉特效
- **Cursor_Trail**: 光标轨迹效果，模拟缝纫线的视觉反馈
- **User**: 网站访问者，包括潜在投资人、发行商和观众
- **Acid_Color**: 高饱和酸性色系（荧光绿、芭比粉、土豪金）
- **Industrial_Color**: 低饱和工业色系（铁锈红、水泥灰、牛仔蓝）

## 需求

### 需求 1：老虎机入口交互

**用户故事：** 作为网站访问者，我希望通过有趣的老虎机交互进入网站，以便体验电影的荒诞风格和不可预测性。

#### 验收标准

1. WHEN THE Website_System 加载首页，THE Website_System SHALL 在屏幕中央显示一台复古老虎机动画
2. WHEN THE User 点击"投币（Insert Coin）"按钮，THE Slot_Machine SHALL 播放拉杆转动动画
3. WHEN THE Slot_Machine 转动完成，THE Website_System SHALL 以 10% 概率显示三个"$"符号并触发金币雨动画
4. WHEN THE Slot_Machine 显示三个"$"符号，THE Website_System SHALL 转场进入 Dream_Mode 页面
5. WHEN THE Slot_Machine 转动完成，THE Website_System SHALL 以 90% 概率显示三个"缝纫机"符号并播放走音喇叭音效
6. WHEN THE Slot_Machine 显示三个"缝纫机"符号，THE Website_System SHALL 转场进入 Reality_Mode 页面
7. WHEN THE User 在任意页面内，THE Website_System SHALL 提供梦境/现实模式切换开关
8. WHEN THE User 点击模式切换开关，THE Website_System SHALL 在 Dream_Mode 和 Reality_Mode 之间切换并保持当前页面位置

### 需求 2：双模式视觉系统

**用户故事：** 作为网站访问者，我希望看到强烈对比的视觉风格，以便理解电影中梦想与现实的冲突主题。

#### 验收标准

1. WHILE IN Dream_Mode，THE Website_System SHALL 使用 Acid_Color 色系作为主色调
2. WHILE IN Reality_Mode，THE Website_System SHALL 使用 Industrial_Color 色系作为主色调
3. WHEN 渲染 Dream_Mode 页面，THE Website_System SHALL 显示奢华浮夸的视觉元素（金色缝纫机、超模、阿玛尼服装）
4. WHEN 渲染 Reality_Mode 页面，THE Website_System SHALL 显示工厂场景的视觉元素（普通缝纫机、工友、工装）
5. WHEN 切换模式时，THE Website_System SHALL 在 500 毫秒内完成色彩和视觉元素的过渡动画
6. THE Website_System SHALL 在页面中突兀地拼接 Acid_Color 和 Industrial_Color，产生视觉冲击效果
7. THE Website_System SHALL 使用故障感字体渲染标题文字
8. THE Website_System SHALL 使用复古打字机字体渲染正文内容

### 需求 3：荒诞剧场对比展示

**用户故事：** 作为网站访问者，我希望通过交互式滑块对比梦境与现实场景，以便直观感受电影的荒诞喜剧风格。

#### 验收标准

1. WHEN THE User 访问故事板页面，THE Website_System SHALL 显示左右分屏的 Slider_Component
2. THE Slider_Component SHALL 在左侧显示 Dream_Mode 场景（主角在普拉托广场撒钱）
3. THE Slider_Component SHALL 在右侧显示 Reality_Mode 场景（主角在车间撒布料）
4. WHEN THE User 拖动滑块，THE Slider_Component SHALL 实时调整左右两侧场景的可见区域比例
5. THE Website_System SHALL 在对应场景下方显示反讽风格的文案描述
6. WHEN 渲染场景文案，THE Website_System SHALL 使用冷幽默语调（例如："普拉托（梦里的）首富，温州（现实的）负翁"）
7. THE Slider_Component SHALL 保持左右场景的构图对称性
8. WHEN THE User 释放滑块，THE Slider_Component SHALL 保持当前位置不自动复位

### 需求 4：角色卡牌系统

**用户故事：** 作为网站访问者，我希望以游戏化的方式了解电影角色，以便更有趣地获取角色信息。

#### 验收标准

1. WHEN THE User 访问角色页面，THE Website_System SHALL 显示所有 Character_Card 的网格布局
2. THE Character_Card SHALL 包含角色名称、头像图片和 RPG 风格的属性面板
3. WHEN 渲染主角卡牌，THE Character_Card SHALL 显示属性：做梦能力 SSS、缝纫手速 A、银行存款 -€500
4. WHEN 渲染主角卡牌，THE Character_Card SHALL 显示必杀技："我舅舅是厂长"及技能效果说明
5. WHEN 渲染意大利房东卡牌，THE Character_Card SHALL 显示属性：收租能力 S、中文水平 B
6. WHEN THE User 悬停在 Character_Card 上，THE Character_Card SHALL 播放翻转或放大动画
7. THE Character_Card SHALL 使用荒诞夸张的数值和描述文案
8. WHEN 点击 Character_Card，THE Website_System SHALL 显示角色的详细介绍弹窗

### 需求 5：导演风格展示

**用户故事：** 作为投资人或发行商，我希望了解导演的艺术风格和参考作品，以便评估电影的艺术价值和市场定位。

#### 验收标准

1. WHEN THE User 访问导演风格页面，THE Website_System SHALL 显示参考片单列表
2. THE Website_System SHALL 在参考片单中包含库斯图里卡、周星驰、韦斯·安德森等导演的作品
3. WHEN 显示参考作品，THE Website_System SHALL 提供作品海报、标题和风格说明
4. THE Website_System SHALL 提供音乐小样播放功能
5. WHEN THE User 点击播放音乐，THE Website_System SHALL 播放《义勇军进行曲》与《图兰朵》的混音变奏版
6. WHILE 播放音乐，THE Website_System SHALL 在音乐中混入缝纫机哒哒声音效
7. THE Website_System SHALL 提供音乐播放控制（播放、暂停、音量调节）
8. THE Website_System SHALL 使用黑色幽默的文案描述导演风格

### 需求 6：一元众筹功能

**用户故事：** 作为潜在观众，我希望通过象征性的一元预订支持电影项目，以便表达我的兴趣并获取后续信息。

#### 验收标准

1. WHEN THE User 访问众筹页面，THE Website_System SHALL 显示"一元预订电影票"的入口
2. WHEN THE User 点击预订按钮，THE Website_System SHALL 显示信息收集表单
3. THE Website_System SHALL 在表单中收集用户姓名、邮箱和手机号码
4. WHEN THE User 提交表单，THE Website_System SHALL 验证邮箱格式的有效性
5. WHEN THE User 提交表单，THE Website_System SHALL 验证手机号码格式的有效性
6. WHEN 表单验证通过，THE Website_System SHALL 保存用户数据到数据库
7. WHEN 表单验证通过，THE Website_System SHALL 显示提交成功的确认消息
8. IF 表单验证失败，THEN THE Website_System SHALL 显示具体的错误提示信息

### 需求 7：投资人专区

**用户故事：** 作为投资人，我希望看到项目的商业潜力和市场数据，以便评估投资价值。

#### 验收标准

1. WHEN THE User 访问投资人专区，THE Website_System SHALL 显示标题"除了钱，我们什么都不缺"
2. THE Website_System SHALL 展示温州商人全球网络的数据可视化图表
3. THE Website_System SHALL 显示普拉托华人社区的规模数据
4. THE Website_System SHALL 显示目标观众群体分析
5. THE Website_System SHALL 提供项目联系方式（邮箱、电话）
6. THE Website_System SHALL 使用幽默风格呈现商业数据
7. WHEN 显示数据图表，THE Website_System SHALL 使用交互式图表组件
8. WHEN THE User 悬停在数据点上，THE Website_System SHALL 显示详细数值和说明

### 需求 8：故障艺术效果

**用户故事：** 作为网站访问者，我希望体验独特的视觉特效，以便感受电影的超现实主义风格。

#### 验收标准

1. WHEN THE Website_System 切换页面，THE Website_System SHALL 播放 Glitch_Effect 转场动画
2. THE Glitch_Effect SHALL 包含雪花点、色彩分离和画面扭曲效果
3. THE Glitch_Effect SHALL 在 300 到 800 毫秒内完成
4. WHEN 在 Dream_Mode 页面，THE Website_System SHALL 随机触发短暂的 Glitch_Effect（每 30 到 60 秒一次）
5. WHEN 触发随机 Glitch_Effect，THE Website_System SHALL 持续 100 到 300 毫秒
6. THE Website_System SHALL 确保 Glitch_Effect 不影响页面交互功能
7. THE Website_System SHALL 在移动设备上降低 Glitch_Effect 的复杂度以保证性能
8. THE Website_System SHALL 提供关闭 Glitch_Effect 的选项以适应可访问性需求

### 需求 9：光标轨迹效果

**用户故事：** 作为网站访问者，我希望看到有趣的光标交互效果，以便增强沉浸感和主题呼应。

#### 验收标准

1. WHEN THE User 移动鼠标，THE Website_System SHALL 将光标显示为针头图标
2. WHEN THE User 移动鼠标，THE Cursor_Trail SHALL 在光标路径上绘制虚线轨迹
3. THE Cursor_Trail SHALL 使用缝纫线的视觉样式（虚线、针脚效果）
4. WHEN 绘制 Cursor_Trail，THE Website_System SHALL 在 2 到 3 秒后淡出并清除轨迹
5. WHILE IN Dream_Mode，THE Cursor_Trail SHALL 使用金色或荧光色
6. WHILE IN Reality_Mode，THE Cursor_Trail SHALL 使用灰色或蓝色
7. THE Website_System SHALL 在移动设备上禁用 Cursor_Trail 效果
8. THE Website_System SHALL 限制同时显示的轨迹数量以保证性能

### 需求 10：响应式设计

**用户故事：** 作为移动设备用户，我希望网站在不同屏幕尺寸上都能正常浏览，以便随时随地访问网站。

#### 验收标准

1. WHEN THE User 在桌面设备访问，THE Website_System SHALL 使用完整的桌面布局（最小宽度 1024px）
2. WHEN THE User 在平板设备访问，THE Website_System SHALL 调整为平板布局（宽度 768px 到 1023px）
3. WHEN THE User 在手机设备访问，THE Website_System SHALL 调整为移动布局（最大宽度 767px）
4. WHEN 在移动布局，THE Slider_Component SHALL 改为上下滑动方式
5. WHEN 在移动布局，THE Character_Card SHALL 调整为单列显示
6. WHEN 在移动布局，THE Website_System SHALL 简化动画效果以提升性能
7. THE Website_System SHALL 在所有设备上保持文字可读性（最小字号 14px）
8. THE Website_System SHALL 确保所有交互元素的触摸目标不小于 44x44 像素

### 需求 11：性能优化

**用户故事：** 作为网站访问者，我希望网站快速加载和流畅运行，以便获得良好的浏览体验。

#### 验收标准

1. WHEN THE User 首次访问网站，THE Website_System SHALL 在 3 秒内完成首屏加载
2. THE Website_System SHALL 对图片资源进行懒加载
3. THE Website_System SHALL 压缩和优化所有图片资源（WebP 格式优先）
4. THE Website_System SHALL 压缩和合并 CSS 和 JavaScript 文件
5. WHEN 播放动画效果，THE Website_System SHALL 保持 60 FPS 的帧率
6. THE Website_System SHALL 使用 CDN 分发静态资源
7. THE Website_System SHALL 实现浏览器缓存策略
8. WHEN 检测到低性能设备，THE Website_System SHALL 自动降低动画复杂度

### 需求 12：可访问性

**用户故事：** 作为有特殊需求的用户，我希望网站支持辅助功能，以便我也能访问和使用网站。

#### 验收标准

1. THE Website_System SHALL 为所有图片提供替代文本（alt 属性）
2. THE Website_System SHALL 支持键盘导航访问所有交互元素
3. WHEN THE User 使用 Tab 键导航，THE Website_System SHALL 显示清晰的焦点指示器
4. THE Website_System SHALL 确保文字与背景的对比度符合 WCAG AA 标准（至少 4.5:1）
5. THE Website_System SHALL 为音频内容提供静音控制
6. THE Website_System SHALL 提供"减少动画"选项以适应前庭障碍用户
7. THE Website_System SHALL 使用语义化 HTML 标签
8. THE Website_System SHALL 支持屏幕阅读器访问所有内容

### 需求 13：内容管理

**用户故事：** 作为网站管理员，我希望能够轻松更新网站内容，以便保持信息的时效性。

#### 验收标准

1. THE Website_System SHALL 提供管理后台登录功能
2. WHEN 管理员登录后，THE Website_System SHALL 显示内容管理界面
3. THE Website_System SHALL 允许管理员编辑文案内容
4. THE Website_System SHALL 允许管理员上传和替换图片资源
5. THE Website_System SHALL 允许管理员管理角色卡牌信息
6. THE Website_System SHALL 允许管理员查看和导出用户预订数据
7. WHEN 管理员保存更改，THE Website_System SHALL 在 5 秒内更新前台显示
8. THE Website_System SHALL 记录所有内容修改的历史版本

### 需求 14：数据分析

**用户故事：** 作为项目方，我希望了解网站访问数据和用户行为，以便优化推广策略。

#### 验收标准

1. THE Website_System SHALL 集成网站分析工具（如 Google Analytics）
2. THE Website_System SHALL 追踪页面浏览量和独立访客数
3. THE Website_System SHALL 追踪老虎机交互的结果分布（梦境版 vs 现实版）
4. THE Website_System SHALL 追踪模式切换的频率
5. THE Website_System SHALL 追踪一元预订的转化率
6. THE Website_System SHALL 追踪用户在各页面的停留时间
7. THE Website_System SHALL 提供数据可视化仪表板
8. THE Website_System SHALL 每日生成访问报告并发送给管理员

### 需求 15：多语言支持

**用户故事：** 作为国际访客，我希望网站提供多语言版本，以便更好地理解内容。

#### 验收标准

1. THE Website_System SHALL 支持简体中文、英文和意大利文三种语言
2. WHEN THE User 首次访问，THE Website_System SHALL 根据浏览器语言设置自动选择界面语言
3. THE Website_System SHALL 在页面顶部提供语言切换菜单
4. WHEN THE User 切换语言，THE Website_System SHALL 在 1 秒内更新所有界面文本
5. WHEN 切换语言，THE Website_System SHALL 保持用户当前的页面位置和状态
6. THE Website_System SHALL 保存用户的语言偏好到浏览器存储
7. THE Website_System SHALL 确保所有语言版本的文案保持幽默风格的一致性
8. THE Website_System SHALL 为不同语言提供适配的字体选择
