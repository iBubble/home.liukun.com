import { useState } from 'react';
import { motion } from 'framer-motion';
import { useModeStore } from '../../stores/modeStore';
import { getColors } from '../../styles/colors';

export default function Crowdfunding() {
  const { mode } = useModeStore();
  const colors = getColors(mode);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone: string) => {
    return /^[\d\s\-\+\(\)]+$/.test(phone) && phone.replace(/\D/g, '').length >= 10;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // 实时验证
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
    
    // 提交成功
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
          className="max-w-2xl w-full p-12 rounded-3xl text-center space-y-6"
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
          <p
            className="text-2xl font-chinese"
            style={{ color: mode === 'dream' ? '#000' : '#fff', opacity: 0.8 }}
          >
            感谢您的支持！我们会通过邮件通知您最新进展。
          </p>
          <motion.button
            onClick={() => setSubmitted(false)}
            className="px-8 py-3 rounded-xl font-bold text-lg"
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
    >
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <h1
            className="text-6xl md:text-8xl font-bold glitch-text font-chinese"
            style={{ color: colors.accent }}
          >
            一元奇梦
          </h1>
          <p
            className="text-2xl md:text-3xl font-chinese"
            style={{ color: colors.text }}
          >
            做梦只要一块钱，醒来得踩一万脚
          </p>
        </div>

        <div
          className="p-8 md:p-12 rounded-3xl space-y-8"
          style={{
            backgroundColor: colors.secondary,
            border: `3px solid ${colors.accent}`,
          }}
        >
          <div className="text-center space-y-4">
            <h2
              className="text-4xl font-bold font-chinese"
              style={{ color: colors.accent }}
            >
              一元预订电影票
            </h2>
            <p className="text-lg font-chinese" style={{ color: colors.text }}>
              象征性支持，实质性期待
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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
              预订电影票（象征性 ¥1）
            </motion.button>
          </form>
        </div>

        <div
          className="p-8 rounded-2xl text-center"
          style={{
            backgroundColor: colors.primary,
            color: mode === 'dream' ? '#000' : '#fff',
          }}
        >
          <p className="text-xl font-chinese italic">
            "他口袋里只有一枚硬币，但他发誓这枚硬币是通往罗马的钥匙。结果，他用它买了个肉包子。"
          </p>
        </div>
      </div>
    </div>
  );
}
