import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useModeStore } from '../../stores/modeStore';
import { getColors } from '../../styles/colors';

const rewardTiers = [
  {
    amount: '¥1',
    title: '象征性支持',
    description: '一元预订电影票',
    rewards: [
      '电影上映通知',
      '官方感谢名单',
      '专属数字海报',
    ],
    icon: '🪙',
    popular: true,
  },
  {
    amount: '¥99',
    title: '铁杆支持者',
    description: '深度参与项目',
    rewards: [
      '包含"象征性支持"所有权益',
      '电影首映礼邀请函（线上）',
      '导演签名剧本（电子版）',
      '幕后花絮视频访问权',
    ],
    icon: '🎬',
    popular: false,
  },
  {
    amount: '¥999',
    title: '核心赞助人',
    description: '成为电影的一部分',
    rewards: [
      '包含"铁杆支持者"所有权益',
      '片尾特别鸣谢署名',
      '电影首映礼邀请函（线下，普拉托）',
      '限量版电影周边礼盒',
      '与导演线上交流机会',
    ],
    icon: '⭐',
    popular: false,
  },
];

const projectProgress = [
  { phase: '剧本创作', status: 'completed', progress: 100 },
  { phase: '资金筹备', status: 'in-progress', progress: 65 },
  { phase: '演员选角', status: 'in-progress', progress: 40 },
  { phase: '场景勘景', status: 'in-progress', progress: 30 },
  { phase: '拍摄制作', status: 'pending', progress: 0 },
  { phase: '后期制作', status: 'pending', progress: 0 },
];

const faqs = [
  {
    question: '为什么是"一元"？',
    answer: '一元硬币是电影的核心意象，象征着梦想的起点。我们希望每个人都能以最低的门槛参与这个项目，见证一个关于梦想的故事。',
  },
  {
    question: '电影什么时候上映？',
    answer: '预计2027年春季完成制作，2027年秋季在国际电影节首映，2028年初进入院线和流媒体平台。',
  },
  {
    question: '如何确保项目完成？',
    answer: '我们有专业的制片团队、明确的拍摄计划和充足的资金保障。项目已获得意大利文化部的资助，并有多家制片公司参与。',
  },
  {
    question: '众筹资金用途？',
    answer: '众筹资金主要用于前期筹备（场景搭建、道具制作）和宣发推广。大部分制作资金来自专业投资方。',
  },
  {
    question: '如何获得回报？',
    answer: '所有支持者将通过注册邮箱收到回报。实体回报将在电影完成后统一寄送，数字回报将在各阶段完成后陆续发放。',
  },
];

export default function Crowdfunding() {
  const { mode } = useModeStore();
  const colors = getColors(mode);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    tier: '¥1',
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone: string) => {
    return /^[\d\s\-\+\(\)]+$/.test(phone) && phone.replace(/\D/g, '').length >= 10;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = '请输入姓名';
    } else if (formData.name.length > 100) {
      newErrors.name = '姓名不能超过100个字符';
    }
    
    if (!formData.email) {
      newErrors.email = '请输入邮箱';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = '请输入有效的邮箱地址';
    }
    
    if (!formData.phone) {
      newErrors.phone = '请输入手机号码';
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = '请输入有效的手机号码';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setSubmitted(true);
    console.log('Form submitted:', formData);
  };

  if (submitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: colors.background }}
      >
        <motion.div
          className="max-w-2xl w-full p-12 rounded-3xl text-center space-y-8"
          style={{
            backgroundColor: colors.primary,
            border: `4px solid ${colors.accent}`,
          }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <motion.div
            className="text-8xl"
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 10, -10, 0],
            }}
            transition={{ duration: 0.5 }}
          >
            🎉
          </motion.div>
          <h2
            className="text-5xl font-bold font-chinese"
            style={{ color: mode === 'dream' ? '#000' : '#fff' }}
          >
            预订成功！
          </h2>
          <div className="space-y-4" style={{ color: mode === 'dream' ? '#000' : '#fff' }}>
            <p className="text-2xl font-chinese">
              感谢您的支持！
            </p>
            <p className="text-lg font-chinese opacity-90">
              我们已向 <strong>{formData.email}</strong> 发送确认邮件
            </p>
            <p className="text-base font-chinese opacity-80">
              您选择的档位：<strong>{formData.tier}</strong>
            </p>
          </div>
          <div
            className="p-6 rounded-2xl text-left space-y-2"
            style={{
              backgroundColor: colors.background,
              color: colors.text,
            }}
          >
            <p className="font-chinese font-bold" style={{ color: colors.accent }}>
              接下来会发生什么？
            </p>
            <ul className="space-y-2 text-sm font-chinese">
              <li>✓ 您将收到确认邮件和电子收据</li>
              <li>✓ 我们会定期发送项目进展更新</li>
              <li>✓ 电影完成后，您将第一时间收到观影通知</li>
              <li>✓ 所有回报将按承诺时间发放</li>
            </ul>
          </div>
          <motion.button
            onClick={() => setSubmitted(false)}
            className="px-8 py-3 rounded-xl font-bold text-lg font-chinese"
            style={{
              backgroundColor: colors.accent,
              color: mode === 'dream' ? '#000' : '#fff',
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            返回
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-20 px-4"
      style={{ backgroundColor: colors.background }}
      role="main"
      aria-label="众筹页面"
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
            一元奇梦
          </motion.h1>
          <motion.p
            className="text-2xl md:text-3xl font-chinese"
            style={{ color: colors.text }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            做梦只要一块钱，醒来得踩一万脚
          </motion.p>
          <motion.div
            className="inline-block px-6 py-3 rounded-full text-xl font-chinese font-bold"
            style={{
              backgroundColor: colors.accent,
              color: mode === 'dream' ? '#000' : '#fff',
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            众筹进行中 · 已筹集 65%
          </motion.div>
        </div>

        {/* 项目进度 */}
        <section
          className="p-10 rounded-3xl space-y-8"
          style={{
            backgroundColor: colors.secondary,
            border: `3px solid ${colors.accent}`,
          }}
        >
          <h2
            className="text-4xl font-bold font-chinese text-center"
            style={{ color: colors.accent }}
          >
            项目进度
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projectProgress.map((item, index) => (
              <motion.div
                key={index}
                className="p-6 rounded-2xl"
                style={{
                  backgroundColor: colors.background,
                  border: `2px solid ${
                    item.status === 'completed'
                      ? colors.accent
                      : item.status === 'in-progress'
                      ? colors.accent
                      : colors.secondary
                  }`,
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3
                      className="text-xl font-bold font-chinese"
                      style={{ color: colors.text }}
                    >
                      {item.phase}
                    </h3>
                    <span className="text-2xl">
                      {item.status === 'completed'
                        ? '✅'
                        : item.status === 'in-progress'
                        ? '🔄'
                        : '⏳'}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full" style={{ backgroundColor: colors.secondary }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: colors.accent }}
                      initial={{ width: 0 }}
                      animate={{ width: `${item.progress}%` }}
                      transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                    />
                  </div>
                  <p className="text-sm font-chinese text-right" style={{ color: colors.text }}>
                    {item.progress}%
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* 回报档位 */}
        <section className="space-y-8">
          <h2
            className="text-4xl font-bold font-chinese text-center"
            style={{ color: colors.accent }}
          >
            选择您的支持档位
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {rewardTiers.map((tier, index) => (
              <motion.div
                key={index}
                className="rounded-3xl overflow-hidden relative"
                style={{
                  backgroundColor: colors.secondary,
                  border: `3px solid ${tier.popular ? colors.accent : colors.secondary}`,
                  boxShadow: tier.popular ? `0 0 30px ${colors.accent}` : 'none',
                }}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2 }}
                whileHover={{ scale: 1.03, y: -10 }}
              >
                {tier.popular && (
                  <div
                    className="absolute top-4 right-4 px-4 py-2 rounded-full text-sm font-bold font-chinese"
                    style={{
                      backgroundColor: colors.accent,
                      color: mode === 'dream' ? '#000' : '#fff',
                    }}
                  >
                    最受欢迎
                  </div>
                )}
                <div className="p-8 space-y-6">
                  <div className="text-center space-y-3">
                    <div className="text-6xl">{tier.icon}</div>
                    <h3
                      className="text-5xl font-bold font-chinese"
                      style={{ color: colors.accent }}
                    >
                      {tier.amount}
                    </h3>
                    <h4
                      className="text-2xl font-bold font-chinese"
                      style={{ color: colors.text }}
                    >
                      {tier.title}
                    </h4>
                    <p
                      className="text-sm font-chinese"
                      style={{ color: colors.text, opacity: 0.7 }}
                    >
                      {tier.description}
                    </p>
                  </div>
                  <div
                    className="h-px"
                    style={{ backgroundColor: colors.accent, opacity: 0.3 }}
                  />
                  <ul className="space-y-3">
                    {tier.rewards.map((reward, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 text-sm font-chinese"
                        style={{ color: colors.text }}
                      >
                        <span style={{ color: colors.accent }}>✓</span>
                        <span>{reward}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* 预订表单 */}
        <section
          className="p-10 md:p-12 rounded-3xl space-y-8"
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
              立即预订
            </h2>
            <p className="text-lg font-chinese" style={{ color: colors.text }}>
              填写信息，成为电影的一部分
            </p>
          </div>

          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
            <div className="space-y-2">
              <label
                className="block text-lg font-chinese font-bold"
                style={{ color: colors.text }}
              >
                姓名 *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl text-lg font-chinese"
                style={{
                  backgroundColor: colors.background,
                  color: colors.text,
                  border: `2px solid ${errors.name ? '#ff0000' : colors.accent}`,
                }}
                placeholder="请输入您的姓名"
              />
              {errors.name && (
                <p className="text-red-500 text-sm font-chinese">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <label
                className="block text-lg font-chinese font-bold"
                style={{ color: colors.text }}
              >
                邮箱 *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl text-lg font-chinese"
                style={{
                  backgroundColor: colors.background,
                  color: colors.text,
                  border: `2px solid ${errors.email ? '#ff0000' : colors.accent}`,
                }}
                placeholder="your@email.com"
              />
              {errors.email && (
                <p className="text-red-500 text-sm font-chinese">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <label
                className="block text-lg font-chinese font-bold"
                style={{ color: colors.text }}
              >
                手机号码 *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl text-lg font-chinese"
                style={{
                  backgroundColor: colors.background,
                  color: colors.text,
                  border: `2px solid ${errors.phone ? '#ff0000' : colors.accent}`,
                }}
                placeholder="+86 138 0000 0000"
              />
              {errors.phone && (
                <p className="text-red-500 text-sm font-chinese">{errors.phone}</p>
              )}
            </div>

            <div className="space-y-2">
              <label
                className="block text-lg font-chinese font-bold"
                style={{ color: colors.text }}
              >
                选择档位 *
              </label>
              <select
                name="tier"
                value={formData.tier}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl text-lg font-chinese"
                style={{
                  backgroundColor: colors.background,
                  color: colors.text,
                  border: `2px solid ${colors.accent}`,
                }}
              >
                {rewardTiers.map((tier, index) => (
                  <option key={index} value={tier.amount}>
                    {tier.amount} - {tier.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label
                className="block text-lg font-chinese font-bold"
                style={{ color: colors.text }}
              >
                留言（选填）
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 rounded-xl text-lg font-chinese resize-none"
                style={{
                  backgroundColor: colors.background,
                  color: colors.text,
                  border: `2px solid ${colors.accent}`,
                }}
                placeholder="想对我们说的话..."
              />
            </div>

            <motion.button
              type="submit"
              className="w-full py-4 rounded-xl text-2xl font-bold font-chinese"
              style={{
                backgroundColor: colors.accent,
                color: mode === 'dream' ? '#000' : '#fff',
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              确认预订
            </motion.button>
          </form>
        </section>

        {/* FAQ */}
        <section className="space-y-8">
          <h2
            className="text-4xl font-bold font-chinese text-center"
            style={{ color: colors.accent }}
          >
            常见问题
          </h2>
          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                className="rounded-2xl overflow-hidden"
                style={{
                  backgroundColor: colors.secondary,
                  border: `2px solid ${colors.accent}`,
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full p-6 text-left flex justify-between items-center"
                  style={{ color: colors.text }}
                >
                  <h3 className="text-xl font-bold font-chinese">{faq.question}</h3>
                  <span className="text-2xl" style={{ color: colors.accent }}>
                    {expandedFaq === index ? '−' : '+'}
                  </span>
                </button>
                <AnimatePresence>
                  {expandedFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-6 pb-6"
                    >
                      <p
                        className="text-base font-chinese leading-relaxed"
                        style={{ color: colors.text, opacity: 0.8 }}
                      >
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </section>

        {/* 底部引用 */}
        <motion.div
          className="p-12 rounded-3xl text-center"
          style={{
            backgroundColor: colors.primary,
            color: mode === 'dream' ? '#000' : '#fff',
          }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <p className="text-2xl font-chinese italic leading-relaxed max-w-3xl mx-auto">
            "他口袋里只有一枚硬币，但他发誓这枚硬币是通往罗马的钥匙。结果，他用它买了个肉包子。"
          </p>
        </motion.div>
      </div>
    </div>
  );
}
