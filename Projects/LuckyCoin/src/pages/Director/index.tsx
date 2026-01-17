import { useState } from 'react';
import { motion } from 'framer-motion';
import { useModeStore } from '../../stores/modeStore';
import { getColors } from '../../styles/colors';

const references = [
  {
    id: '1',
    title: '地下',
    director: '埃米尔·库斯图里卡',
    image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400',
    style: '喧闹、混乱、充满生命力的荒诞',
  },
  {
    id: '2',
    title: '喜剧之王',
    director: '周星驰',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400',
    style: '小人物的悲喜交加',
  },
  {
    id: '3',
    title: '布达佩斯大饭店',
    director: '韦斯·安德森',
    image: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400',
    style: '对称构图但更脏乱差一点',
  },
];

export default function Director() {
  const { mode } = useModeStore();
  const colors = getColors(mode);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div
      className="min-h-screen py-20 px-4"
      style={{ backgroundColor: colors.background }}
    >
      <div className="max-w-7xl mx-auto space-y-16">
        <div className="text-center space-y-4">
          <h1
            className="text-6xl md:text-8xl font-bold glitch-text font-chinese"
            style={{ color: colors.accent }}
          >
            导演风格
          </h1>
          <p
            className="text-xl md:text-2xl font-chinese"
            style={{ color: colors.text }}
          >
            黑色幽默 × 魔幻现实主义
          </p>
        </div>

        {/* 参考片单 */}
        <div className="space-y-8">
          <h2
            className="text-4xl font-bold font-chinese text-center"
            style={{ color: colors.accent }}
          >
            参考片单
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {references.map((ref) => (
              <motion.div
                key={ref.id}
                className="rounded-2xl overflow-hidden"
                style={{
                  backgroundColor: colors.secondary,
                  border: `2px solid ${colors.accent}`,
                }}
                whileHover={{ scale: 1.05, y: -10 }}
              >
                <img
                  src={ref.image}
                  alt={ref.title}
                  className="w-full h-64 object-cover"
                />
                <div className="p-6 space-y-2">
                  <h3
                    className="text-2xl font-bold font-chinese"
                    style={{ color: colors.accent }}
                  >
                    {ref.title}
                  </h3>
                  <p className="text-sm font-chinese" style={{ color: colors.text }}>
                    导演：{ref.director}
                  </p>
                  <p
                    className="text-sm font-chinese italic"
                    style={{ color: colors.text, opacity: 0.8 }}
                  >
                    {ref.style}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 音乐小样 */}
        <div
          className="p-8 rounded-3xl space-y-6"
          style={{
            backgroundColor: colors.secondary,
            border: `3px solid ${colors.accent}`,
          }}
        >
          <h2
            className="text-4xl font-bold font-chinese text-center"
            style={{ color: colors.accent }}
          >
            音乐小样
          </h2>
          <p className="text-center font-chinese" style={{ color: colors.text }}>
            《义勇军进行曲》× 意大利歌剧《图兰朵》混音变奏版
          </p>
          <p className="text-center text-sm font-chinese italic" style={{ color: colors.text, opacity: 0.7 }}>
            （中间夹杂着缝纫机的哒哒声）
          </p>

          {/* 播放器控制 */}
          <div className="flex flex-col items-center gap-6">
            <motion.button
              onClick={togglePlay}
              className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
              style={{
                backgroundColor: colors.accent,
                color: mode === 'dream' ? '#000' : '#fff',
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {isPlaying ? '⏸' : '▶'}
            </motion.button>

            {/* 音量控制 */}
            <div className="w-full max-w-md space-y-2">
              <div className="flex justify-between text-sm font-chinese" style={{ color: colors.text }}>
                <span>音量</span>
                <span>{volume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${colors.accent} 0%, ${colors.accent} ${volume}%, ${colors.secondary} ${volume}%, ${colors.secondary} 100%)`,
                }}
              />
            </div>

            {isPlaying && (
              <motion.div
                className="flex gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {Array.from({ length: 20 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 rounded-full"
                    style={{ backgroundColor: colors.accent }}
                    animate={{
                      height: [10, 30, 10],
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      delay: i * 0.05,
                    }}
                  />
                ))}
              </motion.div>
            )}
          </div>
        </div>

        {/* 导演宣言 */}
        <div
          className="p-12 rounded-3xl text-center space-y-6"
          style={{
            backgroundColor: colors.primary,
            color: mode === 'dream' ? '#000' : '#fff',
          }}
        >
          <h2 className="text-4xl font-bold font-chinese">导演宣言</h2>
          <p className="text-2xl font-chinese leading-relaxed max-w-3xl mx-auto">
            "我们不拍苦情戏，也不拍闹剧。我们拍的是生活本身——荒诞、可笑、又让人心疼。"
          </p>
          <p className="text-xl font-chinese italic opacity-80">
            —— 普拉托的达利，温州的卓别林
          </p>
        </div>
      </div>
    </div>
  );
}
