import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useModeStore } from '../../stores/modeStore';
import { getColors } from '../../styles/colors';

const references = [
  {
    id: '1',
    title: '地下',
    director: '埃米尔·库斯图里卡',
    year: '1995',
    image: '/Projects/LuckyCoin/images/director/underground.jpg',
    style: '喧闹、混乱、充满生命力的荒诞',
    influence: '长镜头叙事、魔幻现实主义、民族音乐融合',
    awards: '戛纳金棕榈奖',
  },
  {
    id: '2',
    title: '喜剧之王',
    director: '周星驰',
    year: '1999',
    image: '/Projects/LuckyCoin/images/director/king-of-comedy.jpg',
    style: '小人物的悲喜交加',
    influence: '无厘头喜剧、底层叙事、梦想与现实的冲突',
    awards: '香港电影金像奖最佳男主角',
  },
  {
    id: '3',
    title: '布达佩斯大饭店',
    director: '韦斯·安德森',
    year: '2014',
    image: '/Projects/LuckyCoin/images/director/budapest-hotel.jpg',
    style: '对称构图但更脏乱差一点',
    influence: '色彩美学、构图设计、细节控制',
    awards: '奥斯卡9项提名4项获奖',
  },
];

const directorInfo = {
  name: '李明',
  englishName: 'Li Ming',
  background: '意大利博洛尼亚大学电影学硕士',
  experience: '10年纪录片创作经验，5年剧情片筹备',
  style: '魔幻现实主义 × 黑色幽默 × 移民叙事',
  bio: '出生于温州，成长于普拉托。用镜头记录两个世界的碰撞与融合，用幽默消解生活的荒诞。',
};

const awards = [
  { name: '威尼斯电影节', award: '地平线单元最佳影片', year: '2024', project: '短片《缝纫机》' },
  { name: '鹿特丹国际电影节', award: '金虎奖提名', year: '2024', project: '纪录片《普拉托日记》' },
  { name: '华语青年影像论坛', award: '最佳新导演', year: '2023', project: '短片《一元硬币》' },
  { name: 'FIRST青年电影展', award: '最佳纪录片', year: '2022', project: '《温州人在意大利》' },
];

const creativeVision = [
  {
    title: '视觉风格',
    description: '魔幻现实主义的色彩运用，梦境与现实的强烈对比。金色的梦想与灰色的现实交织，构成独特的视觉语言。',
    icon: '🎨',
  },
  {
    title: '叙事手法',
    description: '非线性叙事结构，通过老虎机的随机性隐喻人生的不确定性。黑色幽默贯穿始终，在笑声中思考。',
    icon: '📖',
  },
  {
    title: '音乐设计',
    description: '中西音乐的碰撞与融合，《义勇军进行曲》与意大利歌剧的混音，配合缝纫机的节奏，形成独特的听觉体验。',
    icon: '🎵',
  },
  {
    title: '文化表达',
    description: '深入探讨移民身份认同、文化冲突与融合。不煽情、不说教，用真实的细节和荒诞的情节展现生活本质。',
    icon: '🌍',
  },
];

export default function Director() {
  const { mode } = useModeStore();
  const colors = getColors(mode);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [selectedRef, setSelectedRef] = useState<string | null>(null);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div
      className="min-h-screen py-20 px-4"
      style={{ backgroundColor: colors.background }}
      role="main"
      aria-label="导演风格页面"
    >
      <div className="max-w-7xl mx-auto space-y-20">
        {/* 页面标题 */}
        <div className="text-center space-y-6">
          <motion.h1
            className="text-6xl md:text-8xl font-bold glitch-text font-chinese"
            style={{ color: colors.accent }}
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            导演风格
          </motion.h1>
          <motion.p
            className="text-xl md:text-2xl font-chinese"
            style={{ color: colors.text }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            黑色幽默 × 魔幻现实主义 × 移民叙事
          </motion.p>
        </div>

        {/* 导演介绍 */}
        <motion.section
          className="grid md:grid-cols-2 gap-12 items-center"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div
            className="p-10 rounded-3xl space-y-6"
            style={{
              backgroundColor: colors.secondary,
              border: `3px solid ${colors.accent}`,
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
                style={{ backgroundColor: colors.accent }}
              >
                🎬
              </div>
              <div>
                <h2
                  className="text-3xl font-bold font-chinese"
                  style={{ color: colors.accent }}
                >
                  {directorInfo.name}
                </h2>
                <p className="text-lg" style={{ color: colors.text, opacity: 0.7 }}>
                  {directorInfo.englishName}
                </p>
              </div>
            </div>
            <div className="space-y-4 font-chinese" style={{ color: colors.text }}>
              <p className="text-lg leading-relaxed">{directorInfo.bio}</p>
              <div className="space-y-2 text-sm">
                <p><strong style={{ color: colors.accent }}>教育背景：</strong>{directorInfo.background}</p>
                <p><strong style={{ color: colors.accent }}>创作经验：</strong>{directorInfo.experience}</p>
                <p><strong style={{ color: colors.accent }}>风格定位：</strong>{directorInfo.style}</p>
              </div>
            </div>
          </div>

          {/* 获奖记录 */}
          <div className="space-y-4">
            <h3
              className="text-3xl font-bold font-chinese text-center"
              style={{ color: colors.accent }}
            >
              获奖记录
            </h3>
            {awards.map((award, index) => (
              <motion.div
                key={index}
                className="p-6 rounded-2xl"
                style={{
                  backgroundColor: colors.secondary,
                  border: `2px solid ${colors.accent}`,
                }}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                whileHover={{ scale: 1.02, x: -5 }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="text-3xl flex-shrink-0"
                    style={{ color: colors.accent }}
                  >
                    🏆
                  </div>
                  <div className="space-y-1 font-chinese">
                    <h4
                      className="text-xl font-bold"
                      style={{ color: colors.accent }}
                    >
                      {award.award}
                    </h4>
                    <p className="text-sm" style={{ color: colors.text }}>
                      {award.name} · {award.year}
                    </p>
                    <p className="text-xs italic" style={{ color: colors.text, opacity: 0.7 }}>
                      {award.project}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* 创作理念 */}
        <section className="space-y-8">
          <h2
            className="text-4xl font-bold font-chinese text-center"
            style={{ color: colors.accent }}
          >
            创作理念
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {creativeVision.map((vision, index) => (
              <motion.div
                key={index}
                className="p-8 rounded-2xl text-center space-y-4"
                style={{
                  backgroundColor: colors.secondary,
                  border: `2px solid ${colors.accent}`,
                }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 + index * 0.1 }}
                whileHover={{ scale: 1.05, y: -10 }}
              >
                <div className="text-5xl">{vision.icon}</div>
                <h3
                  className="text-2xl font-bold font-chinese"
                  style={{ color: colors.accent }}
                >
                  {vision.title}
                </h3>
                <p
                  className="text-sm font-chinese leading-relaxed"
                  style={{ color: colors.text }}
                >
                  {vision.description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* 参考片单 */}
        <section className="space-y-8">
          <h2
            className="text-4xl font-bold font-chinese text-center"
            style={{ color: colors.accent }}
          >
            影响与参考
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {references.map((ref) => (
              <motion.div
                key={ref.id}
                className="rounded-2xl overflow-hidden cursor-pointer"
                style={{
                  backgroundColor: colors.secondary,
                  border: `3px solid ${selectedRef === ref.id ? colors.accent : colors.secondary}`,
                  boxShadow: selectedRef === ref.id ? `0 0 30px ${colors.accent}` : 'none',
                }}
                whileHover={{ scale: 1.05, y: -10 }}
                onClick={() => setSelectedRef(selectedRef === ref.id ? null : ref.id)}
              >
                <div className="relative">
                  <img
                    src={ref.image}
                    alt={`${ref.title} - ${ref.director}导演作品`}
                    className="w-full h-64 object-cover"
                  />
                  <div
                    className="absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-bold"
                    style={{
                      backgroundColor: colors.accent,
                      color: mode === 'dream' ? '#000' : '#fff',
                    }}
                  >
                    {ref.year}
                  </div>
                </div>
                <div className="p-6 space-y-3">
                  <h3
                    className="text-2xl font-bold font-chinese"
                    style={{ color: colors.accent }}
                  >
                    《{ref.title}》
                  </h3>
                  <p className="text-sm font-chinese" style={{ color: colors.text }}>
                    导演：{ref.director}
                  </p>
                  <p
                    className="text-sm font-chinese italic leading-relaxed"
                    style={{ color: colors.text, opacity: 0.8 }}
                  >
                    {ref.style}
                  </p>
                  {selectedRef === ref.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-2 pt-3 border-t"
                      style={{ borderColor: colors.accent }}
                    >
                      <p className="text-xs font-chinese" style={{ color: colors.text }}>
                        <strong style={{ color: colors.accent }}>影响：</strong>
                        {ref.influence}
                      </p>
                      <p className="text-xs font-chinese" style={{ color: colors.text }}>
                        <strong style={{ color: colors.accent }}>荣誉：</strong>
                        {ref.awards}
                      </p>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* 音乐小样 */}
        <section
          className="p-10 rounded-3xl space-y-8"
          style={{
            backgroundColor: colors.secondary,
            border: `4px solid ${colors.accent}`,
          }}
        >
          <div className="text-center space-y-4">
            <h2
              className="text-4xl font-bold font-chinese"
              style={{ color: colors.accent }}
            >
              原创音乐小样
            </h2>
            <p className="text-xl font-chinese" style={{ color: colors.text }}>
              《义勇军进行曲》× 意大利歌剧《图兰朵》混音变奏版
            </p>
            <p className="text-sm font-chinese italic" style={{ color: colors.text, opacity: 0.7 }}>
              （中间夹杂着缝纫机的哒哒声，象征着劳动与梦想的交织）
            </p>
          </div>

          {/* 播放器控制 */}
          <div className="flex flex-col items-center gap-8">
            <motion.button
              onClick={togglePlay}
              className="w-24 h-24 rounded-full flex items-center justify-center text-5xl shadow-lg"
              style={{
                backgroundColor: colors.accent,
                color: mode === 'dream' ? '#000' : '#fff',
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              aria-label={isPlaying ? '暂停音乐' : '播放音乐'}
            >
              {isPlaying ? '⏸' : '▶'}
            </motion.button>

            {/* 音量控制 */}
            <div className="w-full max-w-md space-y-3">
              <div className="flex justify-between text-sm font-chinese font-bold" style={{ color: colors.text }}>
                <span>音量控制</span>
                <span>{volume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full h-3 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${colors.accent} 0%, ${colors.accent} ${volume}%, ${colors.primary} ${volume}%, ${colors.primary} 100%)`,
                }}
                aria-label="音量调节"
              />
            </div>

            {/* 音频可视化 */}
            {isPlaying && (
              <motion.div
                className="flex gap-2 items-end h-20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {Array.from({ length: 30 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-2 rounded-full"
                    style={{ backgroundColor: colors.accent }}
                    animate={{
                      height: [20, 60, 20],
                    }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.03,
                      ease: 'easeInOut',
                    }}
                  />
                ))}
              </motion.div>
            )}

            <p className="text-xs font-chinese text-center max-w-2xl" style={{ color: colors.text, opacity: 0.6 }}>
              * 音乐由意大利作曲家 Marco Rossi 与中国音乐人合作创作，融合东西方音乐元素
            </p>
          </div>
        </section>

        {/* 导演宣言 */}
        <motion.section
          className="p-12 md:p-16 rounded-3xl text-center space-y-8"
          style={{
            backgroundColor: colors.primary,
            color: mode === 'dream' ? '#000' : '#fff',
            border: `4px solid ${colors.accent}`,
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="text-5xl font-bold font-chinese">导演宣言</h2>
          <div className="space-y-6 max-w-4xl mx-auto">
            <p className="text-2xl md:text-3xl font-chinese leading-relaxed">
              "我们不拍苦情戏，也不拍闹剧。我们拍的是生活本身——荒诞、可笑、又让人心疼。"
            </p>
            <p className="text-xl font-chinese leading-relaxed opacity-90">
              "每个移民都是一枚硬币，一面是梦想，一面是现实。我们用镜头记录这枚硬币在空中旋转的瞬间，那是最美也最残酷的时刻。"
            </p>
            <p className="text-lg font-chinese italic opacity-80">
              —— 普拉托的达利，温州的卓别林
            </p>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
