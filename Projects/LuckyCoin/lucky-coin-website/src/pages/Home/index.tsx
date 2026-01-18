import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import SlotMachine from '../../components/SlotMachine';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import type { Mode } from '../../styles/colors';

export default function Home() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 模拟加载动画
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleResult = (mode: Mode) => {
    // 转场到主页面
    setTimeout(() => {
      navigate('/main');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-black">
      {/* 语言切换器 - 固定在右上角 */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>
      
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            className="flex flex-col items-center justify-center min-h-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* 加载动画 - 旋转的硬币 */}
            <motion.div
              className="text-9xl"
              animate={{
                rotateY: [0, 360],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              💰
            </motion.div>
            <motion.p
              className="mt-8 text-2xl text-yellow-400 font-chinese"
              animate={{
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              {t('common.loading')}
            </motion.p>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <SlotMachine onResult={handleResult} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
