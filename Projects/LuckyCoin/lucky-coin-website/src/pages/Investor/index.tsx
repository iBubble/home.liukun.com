import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useModeStore } from '../../stores/modeStore';
import { getColors } from '../../styles/colors';

const marketData = [
  { label: '普拉托华人', value: '5万+', description: '意大利最大的华人社区', growth: '+15%' },
  { label: '温州商人网络', value: '全球150+国家', description: '遍布世界的商业网络', growth: '持续扩张' },
  { label: '服装产业年产值', value: '€20亿', description: '普拉托地区纺织服装业', growth: '+8%' },
  { label: '目标观众', value: '1000万+', description: '海外华人 + 艺术电影爱好者', growth: '+20%' },
];

const financialProjection = [
  { phase: '前期筹备', budget: '€50万', timeline: '6个月', status: '进行中' },
  { phase: '拍摄制作', budget: '€150万', timeline: '3个月', status: '待启动' },
  { phase: '后期制作', budget: '€80万', timeline: '4个月', status: '待启动' },
  { phase: '宣发推广', budget: '€70万', timeline: '6个月', status: '待启动' },
];

const revenueStreams = [
  { source: '院线发行', potential: '€300-500万', probability: '70%', region: '欧洲 + 中国' },
  { source: '流媒体版权', potential: '€200-300万', probability: '90%', region: '全球' },
  { source: '电影节奖金', potential: '€50-100万', probability: '60%', region: '国际' },
  { source: '衍生品开发', potential: '€100-200万', probability: '50%', region: '全球' },
];

const teamMembers = [
  { role: '导演', name: '李明', background: '博洛尼亚大学电影学硕士，10年创作经验' },
  { role: '制片人', name: 'Maria Bianchi', background: '意大利资深制片人，20部影片经验' },
  { role: '摄影指导', name: '张伟', background: '北京电影学院摄影系，多次获奖' },
  { role: '音乐总监', name: 'Marco Rossi', background: '意大利作曲家，威尼斯音乐学院教授' },
];

const distributionStrategy = [
  {
    stage: '电影节首映',
    targets: ['威尼斯电影节', '戛纳电影节', '柏林电影节'],
    timeline: '2026年9月',
    goal: '获奖 + 国际关注',
  },
  {
    stage: '艺术院线',
    targets: ['欧洲艺术院线联盟', '中国艺术电影放映联盟'],
    timeline: '2026年11月',
    goal: '票房 + 口碑',
  },
  {
    stage: '流媒体平台',
    targets: ['Netflix', 'Amazon Prime', '爱奇艺', '腾讯视频'],
    timeline: '2027年3月',
    goal: '全球覆盖',
  },
  {
    stage: '社区放映',
    targets: ['海外华人社区', '大学校园', '文化中心'],
    timeline: '持续进行',
    goal: '文化影响力',
  },
];

export default function Investor() {
  const { mode } = useModeStore();
  const colors = getColors(mode);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedTab, setSelectedTab] = useState<'market' | 'finance' | 'team' | 'distribution'>('market');

  return (
    <div
      className="min-h-screen py-20 px-4"
      style={{ backgroundColor: colors.background }}
      role="main"
      aria-label="投资人专区页面"
    >
      <div className="max-w-7xl mx-auto space-y-16">
        {/* 页面标题 */}
        <div className="text-center space-y-6">
          <motion.h1
            className="text-6xl md:text-8xl font-bold glitch-text font-chinese"
            style={{ color: colors.accent }}
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
          >
            投资人专区
          </motion.h1>
          <motion.p
            className="text-2xl md:text-3xl font-chinese italic"
            style={{ color: colors.text, opacity: 0.8 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            除了钱，我们什么都不缺（其实反过来）
          </motion.p>
          <motion.p
            className="text-lg font-chinese max-w-3xl mx-auto"
            style={{ color: colors.text, opacity: 0.7 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            一个有故事、有市场、有团队的电影项目，正在寻找有眼光的投资伙伴
          </motion.p>
        </div>

        {/* 标签导航 */}
        <div className="flex flex-wrap justify-center gap-4">
          {[
            { key: 'market', label: '市场分析', icon: '📊' },
            { key: 'finance', label: '财务规划', icon: '💰' },
            { key: 'team', label: '核心团队', icon: '👥' },
            { key: 'distribution', label: '发行策略', icon: '🎬' },
          ].map((tab) => (
            <motion.button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key as any)}
              className="px-6 py-3 rounded-xl font-chinese font-bold text-lg flex items-center gap-2"
              style={{
                backgroundColor: selectedTab === tab.key ? colors.accent : colors.secondary,
                color: selectedTab === tab.key ? (mode === 'dream' ? '#000' : '#fff') : colors.text,
                border: `2px solid ${colors.accent}`,
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </motion.button>
          ))}
        </div>

        {/* 市场分析 */}
        {selectedTab === 'market' && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
          >
            <h2
              className="text-4xl font-bold font-chinese text-center"
              style={{ color: colors.accent }}
            >
              市场潜力分析
            </h2>

            {/* 核心数据 */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {marketData.map((point, index) => (
                <motion.div
                  key={index}
                  className="p-8 rounded-2xl cursor-pointer"
                  style={{
                    backgroundColor: colors.secondary,
                    border: `3px solid ${colors.accent}`,
                    boxShadow: hoveredIndex === index ? `0 0 30px ${colors.accent}` : 'none',
                  }}
                  onHoverStart={() => setHoveredIndex(index)}
                  onHoverEnd={() => setHoveredIndex(null)}
                  whileHover={{ scale: 1.05, y: -10 }}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="space-y-4">
                    <div
                      className="text-sm font-chinese font-bold px-3 py-1 rounded-full inline-block"
                      style={{
                        backgroundColor: colors.accent,
                        color: mode === 'dream' ? '#000' : '#fff',
                      }}
                    >
                      {point.growth}
                    </div>
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

            {/* 收入来源 */}
            <div
              className="p-10 rounded-3xl space-y-6"
              style={{
                backgroundColor: colors.primary,
                border: `4px solid ${colors.accent}`,
              }}
            >
              <h3
                className="text-3xl font-bold font-chinese text-center"
                style={{ color: mode === 'dream' ? '#000' : '#fff' }}
              >
                预期收入来源
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                {revenueStreams.map((stream, index) => (
                  <motion.div
                    key={index}
                    className="p-6 rounded-2xl"
                    style={{
                      backgroundColor: colors.background,
                      border: `2px solid ${colors.accent}`,
                    }}
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                  >
                    <div className="space-y-3 font-chinese">
                      <div className="flex justify-between items-start">
                        <h4
                          className="text-2xl font-bold"
                          style={{ color: colors.accent }}
                        >
                          {stream.source}
                        </h4>
                        <span
                          className="px-3 py-1 rounded-full text-sm font-bold"
                          style={{
                            backgroundColor: colors.accent,
                            color: mode === 'dream' ? '#000' : '#fff',
                          }}
                        >
                          {stream.probability}
                        </span>
                      </div>
                      <p className="text-xl font-bold" style={{ color: colors.text }}>
                        {stream.potential}
                      </p>
                      <p className="text-sm" style={{ color: colors.text, opacity: 0.7 }}>
                        覆盖区域：{stream.region}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <p className="text-center text-sm font-chinese italic" style={{ color: mode === 'dream' ? '#000' : '#fff', opacity: 0.7 }}>
                * 预期总收入：€650-1100万，投资回报率：180-310%
              </p>
            </div>
          </motion.section>
        )}

        {/* 财务规划 */}
        {selectedTab === 'finance' && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
          >
            <h2
              className="text-4xl font-bold font-chinese text-center"
              style={{ color: colors.accent }}
            >
              财务规划与预算
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              {/* 预算分配 */}
              <div
                className="p-8 rounded-3xl space-y-6"
                style={{
                  backgroundColor: colors.secondary,
                  border: `3px solid ${colors.accent}`,
                }}
              >
                <h3
                  className="text-3xl font-bold font-chinese text-center"
                  style={{ color: colors.accent }}
                >
                  总预算：€350万
                </h3>
                <div className="space-y-4">
                  {financialProjection.map((phase, index) => (
                    <motion.div
                      key={index}
                      className="p-6 rounded-xl"
                      style={{
                        backgroundColor: colors.background,
                        border: `2px solid ${colors.accent}`,
                      }}
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h4
                          className="text-xl font-bold font-chinese"
                          style={{ color: colors.accent }}
                        >
                          {phase.phase}
                        </h4>
                        <span
                          className="px-3 py-1 rounded-full text-xs font-bold"
                          style={{
                            backgroundColor: phase.status === '进行中' ? colors.accent : colors.secondary,
                            color: phase.status === '进行中' ? (mode === 'dream' ? '#000' : '#fff') : colors.text,
                          }}
                        >
                          {phase.status}
                        </span>
                      </div>
                      <div className="space-y-2 font-chinese text-sm" style={{ color: colors.text }}>
                        <p><strong style={{ color: colors.accent }}>预算：</strong>{phase.budget}</p>
                        <p><strong style={{ color: colors.accent }}>周期：</strong>{phase.timeline}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* 投资回报 */}
              <div className="space-y-6">
                <div
                  className="p-8 rounded-3xl text-center space-y-4"
                  style={{
                    backgroundColor: colors.accent,
                    color: mode === 'dream' ? '#000' : '#fff',
                  }}
                >
                  <h3 className="text-3xl font-bold font-chinese">投资亮点</h3>
                  <div className="space-y-3 text-left">
                    {[
                      '✓ 独特的题材：移民 + 黑色幽默 + 魔幻现实',
                      '✓ 成熟的团队：国际化专业团队',
                      '✓ 明确的市场：海外华人 + 艺术电影爱好者',
                      '✓ 多元的收入：院线 + 流媒体 + 电影节 + 衍生品',
                      '✓ 政府支持：意大利文化部资助项目',
                    ].map((point, index) => (
                      <motion.p
                        key={index}
                        className="text-lg font-chinese"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                      >
                        {point}
                      </motion.p>
                    ))}
                  </div>
                </div>

                <div
                  className="p-8 rounded-3xl space-y-4"
                  style={{
                    backgroundColor: colors.secondary,
                    border: `3px solid ${colors.accent}`,
                  }}
                >
                  <h3
                    className="text-2xl font-bold font-chinese text-center"
                    style={{ color: colors.accent }}
                  >
                    投资档位
                  </h3>
                  <div className="space-y-3 font-chinese" style={{ color: colors.text }}>
                    <div className="p-4 rounded-xl" style={{ backgroundColor: colors.background }}>
                      <p className="font-bold" style={{ color: colors.accent }}>天使投资人（€50万+）</p>
                      <p className="text-sm">联合制片人署名 + 20%收益分成</p>
                    </div>
                    <div className="p-4 rounded-xl" style={{ backgroundColor: colors.background }}>
                      <p className="font-bold" style={{ color: colors.accent }}>战略投资人（€20万+）</p>
                      <p className="text-sm">执行制片人署名 + 10%收益分成</p>
                    </div>
                    <div className="p-4 rounded-xl" style={{ backgroundColor: colors.background }}>
                      <p className="font-bold" style={{ color: colors.accent }}>普通投资人（€5万+）</p>
                      <p className="text-sm">特别鸣谢署名 + 5%收益分成</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {/* 核心团队 */}
        {selectedTab === 'team' && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
          >
            <h2
              className="text-4xl font-bold font-chinese text-center"
              style={{ color: colors.accent }}
            >
              核心创作团队
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              {teamMembers.map((member, index) => (
                <motion.div
                  key={index}
                  className="p-8 rounded-2xl"
                  style={{
                    backgroundColor: colors.secondary,
                    border: `3px solid ${colors.accent}`,
                  }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.03, y: -5 }}
                >
                  <div className="flex items-start gap-6">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-3xl flex-shrink-0"
                      style={{ backgroundColor: colors.accent }}
                    >
                      {index === 0 ? '🎬' : index === 1 ? '📋' : index === 2 ? '📷' : '🎵'}
                    </div>
                    <div className="space-y-2 font-chinese">
                      <div
                        className="text-sm font-bold px-3 py-1 rounded-full inline-block"
                        style={{
                          backgroundColor: colors.accent,
                          color: mode === 'dream' ? '#000' : '#fff',
                        }}
                      >
                        {member.role}
                      </div>
                      <h3
                        className="text-2xl font-bold"
                        style={{ color: colors.accent }}
                      >
                        {member.name}
                      </h3>
                      <p className="text-sm leading-relaxed" style={{ color: colors.text }}>
                        {member.background}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* 发行策略 */}
        {selectedTab === 'distribution' && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
          >
            <h2
              className="text-4xl font-bold font-chinese text-center"
              style={{ color: colors.accent }}
            >
              发行与推广策略
            </h2>
            <div className="space-y-6">
              {distributionStrategy.map((stage, index) => (
                <motion.div
                  key={index}
                  className="p-8 rounded-2xl"
                  style={{
                    backgroundColor: colors.secondary,
                    border: `3px solid ${colors.accent}`,
                  }}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.2 }}
                >
                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <h3
                        className="text-3xl font-bold font-chinese mb-2"
                        style={{ color: colors.accent }}
                      >
                        {stage.stage}
                      </h3>
                      <p className="text-sm font-chinese" style={{ color: colors.text, opacity: 0.7 }}>
                        {stage.timeline}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold font-chinese mb-3" style={{ color: colors.text }}>
                        目标平台
                      </h4>
                      <ul className="space-y-2">
                        {stage.targets.map((target, i) => (
                          <li
                            key={i}
                            className="text-sm font-chinese flex items-center gap-2"
                            style={{ color: colors.text }}
                          >
                            <span style={{ color: colors.accent }}>•</span>
                            {target}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold font-chinese mb-3" style={{ color: colors.text }}>
                        预期目标
                      </h4>
                      <p
                        className="text-xl font-bold font-chinese"
                        style={{ color: colors.accent }}
                      >
                        {stage.goal}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* 联系方式 */}
        <motion.section
          className="p-12 rounded-3xl text-center space-y-8"
          style={{
            backgroundColor: colors.accent,
            color: mode === 'dream' ? '#000' : '#fff',
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-bold font-chinese">联系我们</h2>
          <div className="grid md:grid-cols-3 gap-6 text-xl font-chinese">
            <div>
              <p className="text-3xl mb-2">📧</p>
              <p className="font-bold">邮箱</p>
              <p className="text-lg">invest@luckycoin-film.com</p>
            </div>
            <div>
              <p className="text-3xl mb-2">📱</p>
              <p className="font-bold">电话</p>
              <p className="text-lg">+39 0574 123 456</p>
            </div>
            <div>
              <p className="text-3xl mb-2">📍</p>
              <p className="font-bold">地址</p>
              <p className="text-lg">Via Pistoiese 123, Prato, Italy</p>
            </div>
          </div>
          <motion.button
            className="px-12 py-4 rounded-xl text-2xl font-bold font-chinese mt-6"
            style={{
              backgroundColor: colors.background,
              color: colors.accent,
              border: `3px solid ${colors.background}`,
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            下载完整商业计划书（PDF）
          </motion.button>
          <p className="text-sm italic opacity-80">
            * 商业计划书包含详细的市场调研、财务模型、风险分析等内容
          </p>
        </motion.section>
      </div>
    </div>
  );
}
