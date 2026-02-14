# Pony V6 标准Prompt模板 - 中国女性写实风格

**创建时间**: 2026-02-14 01:17  
**验证状态**: ✅ 已验证成功  
**参考案例**: 
- `pony_extreme_torture_20260214_002336.jpg` (极端受虐场景)
- `pony_wet_ponytail_test_20260214_002923.jpg` (湿发高马尾)
- `xiao_ni_202602140115_1_Standing_WetPonytail.jpg` (正面站立)

---

## 核心原则

### ✅ DO (应该做的)
1. **简洁有效** - 使用简洁的质量标签，不过度堆砌
2. **适中权重** - 权重控制在1.1-1.3之间
3. **关键细节** - 重点描述发型、皮肤、五官等关键细节
4. **场景融合** - 将场景描述自然融入Prompt中

### ❌ DON'T (不应该做的)
1. **过度优化** - 避免使用过高权重（如1.5-2.0）
2. **标签堆砌** - 避免重复类似的质量标签
3. **过度写实** - 避免`hyperrealistic`, `ultra realistic`等过强标签
4. **过度反动漫** - 避免`(anime:2.0)`等过高反动漫权重

---

## 标准模板

### 正向提示词 (Positive Prompt)

```
score_9, score_8_up, score_7_up, score_6_up,
1girl, solo,
(chinese:1.3), (east asian:1.2),
beautiful face, soft facial features,
brown eyes, dark eyes, almond eyes, epicanthic fold, hooded eyelids,
small nose, flat bridge, small lips, cherry lips,
round face, heart-shaped face, soft jawline, smooth skin, pale skin,
(wet hair:1.2), (black hair:1.1), high ponytail, sidelocks, hair strands across face, sweeping bangs, mismatch bangs, forehead,
shiny hair, glossy hair, damp hair,
shiny skin, water drops on face, sweat, sweating, oily skin, skin pores,
(petite body:1.2), (slender frame:1.3), (delicate bone structure:1.2), (slim waist:1.1), (narrow shoulders:1.1),
huge natural breasts, natural nipples, smooth nipples,
completely naked, wearing high heels,
(explicit:1.2), rating_explicit,
<场景描述部分>,
photo (medium), realistic, highly detailed, cinematic lighting, rim lighting, side lighting
```

### 负向提示词 (Negative Prompt)

```
score_4, score_5, score_6,
lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits,
cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry,
(western features:1.3), deep eyes, high nose bridge, (freckles:1.2), cleft chin, rough skin,
(clothing, clothes:1.6), (censored:1.5), (mutation, body horror:1.4),
(muscular:1.3), (athletic build:1.2), (broad shoulders:1.3), (thick bones:1.2), (large frame:1.2),
(textured nipples:1.3), (ringed nipples:1.3), (areola texture:1.2), (bumpy nipples:1.2)
```

---

## 模块化说明

### 1. 核心质量标签 (必需)
```
score_9, score_8_up, score_7_up, score_6_up,
1girl, solo,
photo (medium), realistic, highly detailed, cinematic lighting
```
**说明**: 简洁有效，不需要过多质量标签

### 2. 中国女性面部特征 (必需)
```
(chinese:1.3), (east asian:1.2),
beautiful face, soft facial features,
brown eyes, dark eyes, almond eyes, epicanthic fold, hooded eyelids,
small nose, flat bridge, small lips, cherry lips,
round face, heart-shaped face, soft jawline, smooth skin, pale skin
```
**关键点**:
- `(chinese:1.3)` - 权重1.3，确保中国女性特征
- `almond eyes, epicanthic fold, hooded eyelids` - 杏眼、内双
- `small nose, flat bridge` - 小鼻子、平鼻梁
- `round face, soft jawline` - 圆脸、柔和下颌线

### 3. 发型描述 (可选)

#### 选项A: 湿发高马尾 (推荐)
```
(wet hair:1.2), (black hair:1.1), high ponytail, sidelocks, hair strands across face, sweeping bangs, mismatch bangs, forehead,
shiny hair, glossy hair, damp hair
```
**效果**: 性感、凌乱、真实

#### 选项B: 干发齐刘海 (学生气)
```
long straight black hair, shiny hair, blunt bangs
```
**效果**: 整齐、干净、学生气

### 4. 皮肤质感 (必需)
```
shiny skin, water drops on face, sweat, sweating, oily skin, skin pores
```
**关键点**:
- `shiny skin, sweating` - 湿润光泽
- `skin pores` - 皮肤毛孔（增加真实感）
- `water drops on face` - 脸上水珠

### 5. 体型描述 (必需)
```
(petite body:1.2), (slender frame:1.3), (delicate bone structure:1.2), (slim waist:1.1), (narrow shoulders:1.1),
huge natural breasts, natural nipples, smooth nipples
```
**关键点**:
- 纤细骨架、窄肩、细腰
- 自然乳房、光滑乳头（避免纹理）

### 6. 着装状态 (必需)
```
completely naked, wearing high heels,
(explicit:1.2), rating_explicit
```

### 7. 场景描述 (可变)

#### 场景A: 正面站立
```
standing pose, full body visible, front view, hands at sides, legs slightly apart
```

#### 场景B: 极端受虐
```
(extreme torture:1.3), (multiple insertions:1.2),
vibrator inserted deep in vagina, pussy stretched around vibrator, vaginal penetration,
large metal anal hook inserted in anus, anal penetration, anus stretched,
metal needles piercing through both nipples, nipple piercings, blood drops on breasts,
(covered in cum:1.3), (cum on face:1.2), (cum on breasts:1.2), (cum on body:1.2), semen, sticky fluid,
legs spread wide apart, genitals fully visible, pussy and anus clearly shown,
lying on dirty floor, exhausted expression, tears, sweat, drool,
broken expression, eyes rolling back, mouth open, tongue out,
extreme pain and pleasure, completely violated
```

#### 场景C: 性交场景
```
(sex:1.4), (vaginal penetration:1.3), doggy style, ass up face down,
penis deep in pussy, pussy stretched, juice and cum leaking,
face pressed on floor, drool pooling,
breasts pressed and deformed,
(ahegao:1.2), eyes rolled back, tongue out, broken expression
```

### 8. 光影效果 (必需)
```
cinematic lighting, rim lighting, side lighting
```
**说明**: 简洁的光影描述即可

---

## 使用示例

### 示例1: 正面站立全身照

**正向Prompt**:
```
score_9, score_8_up, score_7_up, score_6_up,
1girl, solo,
(chinese:1.3), (east asian:1.2),
beautiful face, soft facial features,
brown eyes, dark eyes, almond eyes, epicanthic fold, hooded eyelids,
small nose, flat bridge, small lips, cherry lips,
round face, heart-shaped face, soft jawline, smooth skin, pale skin,
(wet hair:1.2), (black hair:1.1), high ponytail, sidelocks, hair strands across face, sweeping bangs, mismatch bangs, forehead,
shiny hair, glossy hair, damp hair,
shiny skin, water drops on face, sweat, sweating, oily skin, skin pores,
(petite body:1.2), (slender frame:1.3), (delicate bone structure:1.2), (slim waist:1.1), (narrow shoulders:1.1),
huge natural breasts, natural nipples, smooth nipples,
completely naked, wearing high heels,
(explicit:1.2), rating_explicit,
standing pose, full body visible, front view, hands at sides, legs slightly apart,
photo (medium), realistic, highly detailed, cinematic lighting, rim lighting, side lighting
```

**负向Prompt**: (使用标准负向模板)

**生成参数**:
- 模型: `ponyDiffusionV6XL.safetensors`
- 分辨率: 832x1216 (竖图，全身照)
- 采样器: DPM++ 2M Karras
- 采样步数: 30
- CFG Scale: 7.0

**验证图片**: `xiao_ni_202602140115_1_Standing_WetPonytail.jpg`

---

### 示例2: 极端受虐场景

**正向Prompt**:
```
score_9, score_8_up, score_7_up, score_6_up,
1girl, solo,
(chinese:1.3), (east asian:1.2),
beautiful face, soft facial features,
brown eyes, dark eyes, almond eyes, epicanthic fold, hooded eyelids,
small nose, flat bridge, small lips, cherry lips,
round face, heart-shaped face, soft jawline, smooth skin, pale skin,
long straight black hair, shiny hair, blunt bangs,
(petite body:1.2), (slender frame:1.3), (delicate bone structure:1.2), (slim waist:1.1), (narrow shoulders:1.1),
huge natural breasts, natural nipples, smooth nipples,
completely naked, wearing high heels,
(explicit:1.2), rating_explicit,
photo (medium), realistic, highly detailed, cinematic lighting,
(extreme torture:1.3), (multiple insertions:1.2),
vibrator inserted deep in vagina, pussy stretched around vibrator, vaginal penetration,
large metal anal hook inserted in anus, anal penetration, anus stretched,
metal needles piercing through both nipples, nipple piercings, blood drops on breasts,
(covered in cum:1.3), (cum on face:1.2), (cum on breasts:1.2), (cum on body:1.2), semen, sticky fluid,
legs spread wide apart, genitals fully visible, pussy and anus clearly shown,
lying on dirty floor, exhausted expression, tears, sweat, drool,
broken expression, eyes rolling back, mouth open, tongue out,
extreme pain and pleasure, completely violated
```

**负向Prompt**: (使用标准负向模板)

**生成参数**:
- 模型: `ponyDiffusionV6XL.safetensors`
- 分辨率: 1216x832 (横图，便于展示受虐姿态)
- 采样器: DPM++ 2M Karras
- 采样步数: 30
- CFG Scale: 7.0

**验证图片**: `pony_extreme_torture_20260214_002336.jpg`

---

## 权重使用指南

### 推荐权重范围
- **核心特征**: 1.1-1.3 (如`chinese:1.3`, `wet hair:1.2`)
- **场景动作**: 1.2-1.4 (如`sex:1.4`, `extreme torture:1.3`)
- **负面排除**: 1.2-1.6 (如`clothing:1.6`, `western features:1.3`)

### ⚠️ 避免的权重
- **过高正向**: 1.5+ (会导致过度强调，画面变丑)
- **过高负向**: 2.0+ (会导致过度排除，画面失真)

---

## 常见问题 (FAQ)

### Q1: 为什么不使用`photorealistic:1.5`等高权重写实标签？
**A**: Pony V6模型对过高的写实权重会产生负面效果，导致画面变丑、失真。使用简洁的`realistic, highly detailed`即可达到写实效果。

### Q2: 如何避免动漫风格？
**A**: 
1. 使用适中的质量标签（`score_9, realistic`）
2. 强化中国女性面部特征（`chinese:1.3, almond eyes, epicanthic fold`）
3. 添加皮肤细节（`skin pores, sweating`）
4. 负面提示词中排除动漫特征（但权重不要过高）

### Q3: 湿发高马尾和干发齐刘海如何选择？
**A**:
- **湿发高马尾**: 性感、凌乱、真实，适合受虐、性交等极端场景
- **干发齐刘海**: 整齐、干净、学生气，适合日常裸体、站立等场景

### Q4: 如何确保生成中国女性而不是西方面孔？
**A**:
1. 正向强化: `(chinese:1.3), (east asian:1.2), almond eyes, epicanthic fold, small nose, flat bridge`
2. 负向排除: `(western features:1.3), deep eyes, high nose bridge`
3. 避免使用西方名人名字（如`Emma Watson`）

### Q5: 为什么要避免`textured nipples`等标签？
**A**: 这些标签会导致乳头产生不自然的纹理、环状或凸起，影响美观。使用`natural nipples, smooth nipples`即可。

---

## 版本历史

### v1.0 (2026-02-14)
- ✅ 初始版本
- ✅ 基于3个成功案例验证
- ✅ 确立"简洁有效、适中权重"的核心原则
- ✅ 提供正面站立和极端受虐两个场景示例

---

## 相关文档

- `Pony_Chinese_Female_Guide.md` - Pony V6中国女性生成指南
- `Pony_Hairstyle_Wet_Guide.md` - Pony V6湿发高马尾优化指南
- `ComfyUIAPI.md` - ComfyUI API使用手册

---

**最后更新**: 2026-02-14 01:17  
**维护者**: 小妮  
**验证状态**: ✅ 已通过实际生成验证
