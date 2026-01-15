# AI 对话语音生成功能实现完成

## 实现时间
2026-01-15

## 功能概述
实现了视频编辑器中的 AI 对话语音生成功能，可以自动将场景中的对话文本转换为对应性别和性格的人物语音，并在播放时同步播放。

## 已实现功能

### 1. TTS API 服务封装 ✅
创建了完整的 TTS API 服务层：
- `Projects/AIMovie/src/services/ttsApi.ts`
- 支持文字转语音
- 支持获取音色列表
- 支持音色筛选
- 支持场景配音生成

### 2. 对话解析 ✅
自动解析场景中的对话内容：
- 支持格式：`**角色名**：对话内容`
- 提取角色名称和对话文本
- 支持多个角色的对话

### 3. 智能音色选择 ✅
根据角色名称自动选择合适的音色：
- **女性角色**：使用温柔女声（xiaoyun）
- **男性角色**：使用沉稳男声（zhichu）
- **中性角色**：使用磁性音色（sicheng）

识别关键词：
- 女性：女、妹、母、姐、小雨、雨
- 男性：男、父、兄、哥、艾登

### 4. 批量语音生成 ✅
一键生成所有场景的对话语音：
- 遍历所有场景
- 解析每个场景的对话
- 调用 TTS API 生成语音
- 显示生成进度
- 自动计算对话时长和开始时间

### 5. 语音同步播放 ✅
播放时自动同步播放对话语音：
- 根据当前时间判断是否播放对话
- 自动开始和停止对话音频
- 支持暂停和继续播放
- 多个对话音频独立管理

## 技术实现

### 数据结构

#### DialogueAudio 接口
```typescript
interface DialogueAudio {
  sceneId: string      // 场景ID
  character: string    // 角色名称
  text: string        // 对话文本
  audioUrl: string    // 音频URL
  startTime: number   // 开始时间
  duration: number    // 时长
}
```

### 核心函数

#### 1. 生成所有对话语音
```typescript
const handleGenerateAllVoices = async () => {
  // 遍历所有场景
  for (const scene of scenes) {
    // 解析对话
    const dialogues = parseDialogue(scene.dialogue || '')
    
    // 为每个对话生成语音
    for (const dialogue of dialogues) {
      const voice = selectVoiceForCharacter(dialogue.character)
      const response = await synthesizeSpeech({
        text: dialogue.text,
        voice: voice,
        volume: 80
      })
      
      // 保存语音信息
      allDialogues.push({
        sceneId: scene.id,
        character: dialogue.character,
        text: dialogue.text,
        audioUrl: response.data.audioUrl,
        startTime: dialogueStartTime,
        duration: response.data.duration
      })
    }
  }
}
```

#### 2. 解析对话内容
```typescript
const parseDialogue = (dialogueText: string) => {
  const dialogues = []
  // 匹配格式：**角色名**：对话内容
  const regex = /\*\*([^*]+)\*\*[：:]\s*([^*\n]+)/g
  let match
  
  while ((match = regex.exec(dialogueText)) !== null) {
    dialogues.push({
      character: match[1].trim(),
      text: match[2].trim()
    })
  }
  
  return dialogues
}
```

#### 3. 选择音色
```typescript
const selectVoiceForCharacter = (characterName: string) => {
  const femaleKeywords = ['女', '妹', '母', '姐', '小雨', '雨']
  const maleKeywords = ['男', '父', '兄', '哥', '艾登']
  
  const isFemale = femaleKeywords.some(k => characterName.includes(k))
  const isMale = maleKeywords.some(k => characterName.includes(k))
  
  if (isFemale) return 'xiaoyun'  // 温柔女声
  if (isMale) return 'zhichu'     // 沉稳男声
  return 'sicheng'                // 默认音色
}
```

#### 4. 同步播放对话
```typescript
useEffect(() => {
  if (!isPlaying) return
  
  dialogueAudios.forEach(dialogue => {
    const audio = dialogueAudioRefs.current.get(`${dialogue.sceneId}-${dialogue.character}`)
    if (!audio) return
    
    const dialogueEndTime = dialogue.startTime + dialogue.duration
    
    // 在对话时间范围内播放
    if (currentTime >= dialogue.startTime && currentTime < dialogueEndTime) {
      if (audio.paused) {
        const offset = currentTime - dialogue.startTime
        audio.currentTime = offset
        audio.play()
      }
    } else {
      // 不在范围内则暂停
      if (!audio.paused) {
        audio.pause()
        audio.currentTime = 0
      }
    }
  })
}, [currentTime, isPlaying, dialogueAudios])
```

## UI 界面

### 生成语音按钮
- 位置：顶部工具栏
- 文本：🎤 生成对话语音
- 状态：
  - 未生成：显示生成按钮
  - 生成中：显示进度（X/Y）
  - 已生成：显示 ✅ 已生成 N 段对话语音

### 生成进度显示
```
生成中... (3/6)
```
显示当前处理的场景数和总场景数

## 使用流程

### 1. 准备场景数据
确保场景中包含对话内容，格式如下：
```
**林小雨**：（自言自语）真的……能进圣星学院吗？
**艾登**：这位置有人吗？
**林小雨**：我……家里没寄来。说是……遗失了。
```

### 2. 生成语音
1. 进入视频编辑器页面
2. 点击顶部的"🎤 生成对话语音"按钮
3. 等待生成完成（显示进度）
4. 看到"✅ 已生成 N 段对话语音"提示

### 3. 播放预览
1. 点击播放按钮 ▶
2. 场景图片按时间轴切换
3. 背景音乐播放
4. 对话语音在对应时间自动播放

## 可用音色列表

### 女声音色
- **xiaoyun**（小云）：温柔、亲切
- **xiaogang**（小刚）：活泼、开朗
- **ruoxi**（若曦）：知性、优雅

### 男声音色
- **zhichu**（知楚）：沉稳、成熟
- **sicheng**（思诚）：磁性、温暖
- **aijia**（艾佳）：年轻、阳光

### 其他音色
- **sicheng**：中性、自然

## 对话时间计算

### 时间轴布局
```
场景1 (0-3s)
  ├─ 对话1: 林小雨 (0-2s)
  └─ 对话2: 艾登 (2.3-4s)
  
场景2 (3-6s)
  ├─ 对话3: 林小雨 (3-5s)
  └─ 对话4: 艾登 (5.3-7s)
```

### 计算规则
1. 每个场景的对话从场景开始时间开始
2. 对话之间间隔 0.3 秒
3. 对话时长由 TTS API 返回
4. 如果对话超出场景时长，会延续到下一个场景

## 后端 API

### TTS 合成接口
```
POST /api/tts/synthesize
```

**请求参数：**
```json
{
  "text": "对话内容",
  "voice": "xiaoyun",
  "speechRate": 0,
  "pitchRate": 0,
  "volume": 80,
  "format": "mp3",
  "sampleRate": 16000
}
```

**响应数据：**
```json
{
  "success": true,
  "data": {
    "audioUrl": "https://...",
    "duration": 2.5,
    "text": "对话内容",
    "voice": "xiaoyun"
  }
}
```

### 获取音色列表
```
GET /api/tts/voices
```

**响应数据：**
```json
{
  "success": true,
  "data": [
    {
      "id": "xiaoyun",
      "name": "小云",
      "gender": "female",
      "language": "zh-CN",
      "emotion": "gentle"
    }
  ],
  "total": 10
}
```

## 性能优化

### 1. 音频预加载
```typescript
audio.preload = 'auto'
```
提前加载音频文件，减少播放延迟

### 2. 请求限流
```typescript
await new Promise(resolve => setTimeout(resolve, 500))
```
每次请求间隔 500ms，避免请求过快

### 3. 音频缓存
```typescript
dialogueAudioRefs.current.set(key, audio)
```
使用 Map 缓存音频元素，避免重复创建

### 4. 按需播放
只在对话时间范围内播放音频，其他时间暂停

## 测试步骤

### 1. 基础测试
1. 访问 https://home.liukun.com:8443/Projects/AIMovie/
2. 进入包含对话的项目
3. 进入视频编辑器
4. 点击"生成对话语音"按钮
5. 验证生成进度显示
6. 验证生成成功提示

### 2. 播放测试
1. 点击播放按钮
2. 验证对话语音是否在正确时间播放
3. 验证多个对话是否按顺序播放
4. 验证暂停时对话是否停止

### 3. 音色测试
1. 检查女性角色是否使用女声
2. 检查男性角色是否使用男声
3. 检查音色是否自然流畅

## 已知限制

### 1. 对话格式要求
- 必须使用 `**角色名**：对话内容` 格式
- 不支持其他格式的对话

### 2. 音色选择
- 基于简单的关键词匹配
- 可能无法准确识别所有角色性别
- 建议后续支持手动选择音色

### 3. 时长限制
- 单次请求文本不超过 300 字
- 长文本会自动分段处理

### 4. 网络依赖
- 需要网络连接调用 TTS API
- 生成速度取决于网络状况

## 后续优化建议

### 短期优化
1. **手动音色选择**
   - 为每个角色指定音色
   - 支持预览不同音色效果
   - 保存音色配置

2. **对话编辑**
   - 支持编辑对话文本
   - 支持调整对话时间
   - 支持删除和添加对话

3. **音量控制**
   - 独立的对话音量控制
   - 背景音乐和对话音量平衡
   - 淡入淡出效果

### 中期优化
1. **高级 TTS 功能**
   - 支持情感控制
   - 支持语速调整
   - 支持音调调整

2. **对话可视化**
   - 在时间线上显示对话波形
   - 显示对话文本字幕
   - 支持拖拽调整对话位置

3. **批量处理**
   - 支持批量重新生成
   - 支持导出对话音频
   - 支持导入外部音频

### 长期优化
1. **AI 声音克隆**
   - 支持自定义音色
   - 支持声音克隆
   - 支持多语言

2. **智能配音**
   - AI 自动分析角色性格
   - 自动选择最佳音色
   - 自动调整语速和情感

## 相关文件

### 前端文件
- `Projects/AIMovie/src/services/ttsApi.ts` - TTS API 服务
- `Projects/AIMovie/src/pages/VideoEditor/index.tsx` - 视频编辑器

### 后端文件
- `Projects/AIMovie/server/routes/tts.cjs` - TTS 路由
- `Projects/AIMovie/server/services/aliyunTTS.cjs` - 阿里云 TTS 服务

## 技术栈
- React 18 + TypeScript
- Web Audio API
- 阿里云 TTS（语音合成）
- Axios（HTTP 请求）

## 总结

✅ TTS API 服务封装完成
✅ 对话解析功能完成
✅ 智能音色选择完成
✅ 批量语音生成完成
✅ 语音同步播放完成

现在用户可以一键生成所有场景的对话语音，播放时会自动在对应时间播放角色对话，大大提升了视频的生动性和沉浸感！
