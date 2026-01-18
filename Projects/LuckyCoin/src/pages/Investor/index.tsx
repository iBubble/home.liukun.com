import { useState } from 'react';
import { motion } from 'framer-motion';
import { useModeStore } from '../../stores/modeStore';
import { getColors } from '../../styles/colors';

const dataPoints = [
  { label: '普拉托华人', value: '5万+', description: '意大利最大的华人社区' },
  { label: '温州商人', value: '全球网络', description: '遍布150+国家和地区' },
  { label: '服装产业', value: '€20亿', description: '年产值（普拉托地区）' },
  { label: '目标观众', value: '1000万+', description: '海外华人 + 艺术电影爱好者' },
];

export default function Investor() {
  const { mode } = useModeStore();
  const colors = getColors(mode);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div
      className="min-h-screen py-20 px-4"
      style={{ backgroundColor: colors.background }}
    >
      <div className="max-w-7xl mx-auto space-y-16">
        <div className="text-center space-y-6">
          <h1
            className="text-6xl md:text-8xl font-bold glitch-text font-chinese"
            style={{ color: colors.accent }}
          >
            除了钱，我们什么都不缺
          </h1>
          <p
            className="text-xl md:text-2xl font-chinese italic"
            style={{ color: colors.text, opacity: 0.8 }}
          >
            （其实反过来）
          </p>
        </div>

        {/* 数据可视化 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dataPoints.map((point, index) => (
            <motion.div
              key={index}
              className="p-8 rounded-2xl cursor-pointer"
              style={{
                backgroundColor: colors.secondary,
                border: `3px solid ${colors.accent}`,
                boxShadow: hoveredIndex === index ? `0 0 30px ${colors.glow || colors.shadow}` : 'none',
              }}
              onHoverStart={() => setHoveredIndex(index)}
              onHoverEnd={() => setHoveredIndex(null)}
              whileHover={{ scale: 1.05, y: -10 }}
            >
              <div className="space-y-4">
                <h3
                  className="text-5xl font-bold font-chinese"
                  style={{ color: colors.accent }}
                >
                  {point.value}
                </h3>
                <p
                  className="text-xl font-chinese font-bold"
                  style={{ color: colors.text }}
                >
                  {point.label}
                </p>
                <p
                  className="text-sm font-chinese"
                  style={{ color: colors.text, opacity: 0.7 }}
                >
                  {point.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* 温州商人全球网络 */}
        <div
          className="p-12 rounded-3xl space-y-8"
          style={{
            backgroundColor: colors.primary,
            border: `4px solid ${colors.accent}`,
          }}
        >
          <h2
            className="text-4xl font-bold font-chinese text-center"
            style={{ color: mode === 'dream' ? '#000' : '#fff' }}
          >
            温州商人全球网络
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { region: '欧洲', cities: '巴黎、米兰、马德里、伦敦' },
              { region: '亚洲', cities: '迪拜、曼谷、东京、首尔' },
              { region: '美洲', cities: '纽约、洛杉矶、圣保罗' },
            ].map((area, index) => (
              <div
                key={index}
                className="p-6 rounded-xl"
                style={{
                  backgroundColor: colors.background,
                  border: `2px solid ${colors.accent}`,
                }}
              >
                <h3
                  className="text-2xl font-bold font-chinese mb-3"
                  style={{ color: colors.accent }}
                >
                  {area.region}
                </h3>
                <p
                  className="font-chinese"
                  style={{ color: colors.text }}
                >
                  {area.cities}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 市场潜力 */}
        <div className="grid md:grid-cols-2 gap-8">
          <div
            className="p-8 rounded-2xl space-y-4"
            style={{
              backgroundColor: colors.secondary,
              border: `3px solid ${colors.accent}`,
            }}
          >
            <h3
              className="text-3xl font-bold font-chinese"
              style={{ color: colors.accent }}
            >
              目标观众
            </h3>
            <ul className="space-y-3 font-chinese" style={{ color: colors.text }}>
              <li className="flex items-start gap-2">
                <span style={{ color: colors.accent }}>•</span>
                <span>海外华人群体（特别是温州籍）</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: colors.accent }}>•</span>
                <span>艺术电影爱好者</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: colors.accent }}>•</span>
                <span>关注移民题材的观众</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: colors.accent }}>•</span>
                <span>喜欢黑色幽默的年轻人</span>
              </li>
            </ul>
          </div>

          <div
            className="p-8 rounded-2xl space-y-4"
            style={{
              backgroundColor: colors.secondary,
              border: `3px solid ${colors.accent}`,
            }}
          >
            <h3
              className="text-3xl font-bold font-chinese"
              style={{ color: colors.accent }}
            >
              发行策略
            </h3>
            <ul className="space-y-3 font-chinese" style={{ color: colors.text }}>
              <li className="flex items-start gap-2">
                <span style={{ color: colors.accent }}>•</span>
                <span>国际电影节首映（戛纳、威尼斯）</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: colors.accent }}>•</span>
                <span>艺术院线发行</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: colors.accent }}>•</span>
                <span>流媒体平台合作</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: colors.accent }}>•</span>
                <span>社区放映活动</span>
              </li>
            </ul>
          </div>
        </div>

        {/* 联系方式 */}
        <div
          className="p-12 rounded-3xl text-center space-y-6"
          style={{
            backgroundColor: colors.accent,
            color: mode === 'dream' ? '#000' : '#fff',
          }}
        >
          <h2 className="text-4xl font-bold font-chinese">联系我们</h2>
          <div className="space-y-3 text-xl font-chinese">
            <p>📧 Email: invest@luckycoin-film.com</p>
            <p>📱 电话: +39 0574 123 456</p>
            <p>📍 地址: Via Pistoiese 123, Prato, Italy</p>
          </div>
          <motion.button
            className="px-12 py-4 rounded-xl text-2xl font-bold font-chinese mt-6"
            style={{
              backgroundColor: colors.background,
              color: colors.accent,
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            下载商业计划书
          </motion.button>
        </div>
      </div>
    </div>
  );
}
