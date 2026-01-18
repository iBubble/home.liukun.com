import { useEffect, useState, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useModeStore } from '../../stores/modeStore';

interface GlitchEffectProps {
  trigger: 'transition' | 'random' | 'manual';
  intensity?: 'low' | 'medium' | 'high';
  duration?: number;
  children: ReactNode;
  active?: boolean;
}

export default function GlitchEffect({
  trigger,
  intensity = 'medium',
  duration = 300,
  children,
  active = false,
}: GlitchEffectProps) {
  const [isActive, setIsActive] = useState(false);
  const location = useLocation();
  const { mode } = useModeStore();

  // 页面切换时触发
  useEffect(() => {
    if (trigger === 'transition') {
      setIsActive(true);
      const timer = setTimeout(() => setIsActive(false), duration);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, trigger, duration]);

  // 随机触发（仅在梦境模式）
  useEffect(() => {
    if (trigger === 'random' && mode === 'dream') {
      const randomDelay = 30000 + Math.random() * 30000; // 30-60秒
      const interval = setInterval(() => {
        setIsActive(true);
        setTimeout(() => setIsActive(false), duration);
      }, randomDelay);

      return () => clearInterval(interval);
    }
  }, [trigger, duration, mode]);

  // 手动触发
  useEffect(() => {
    if (trigger === 'manual') {
      setIsActive(active);
    }
  }, [trigger, active]);

  const intensityValues = {
    low: { offset: 2, iterations: 2, opacity: 0.2 },
    medium: { offset: 5, iterations: 3, opacity: 0.3 },
    high: { offset: 10, iterations: 5, opacity: 0.5 },
  };

  const { offset, iterations, opacity: maxOpacity } = intensityValues[intensity];

  return (
    <div className="relative">
      {children}
      
      <AnimatePresence>
        {isActive && (
          <>
            {/* 色彩分离效果（RGB 通道偏移） */}
            <motion.div
              className="absolute inset-0 pointer-events-none mix-blend-screen"
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, maxOpacity, maxOpacity, 0],
                x: [0, offset, -offset, offset, 0],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: duration / 1000,
                times: [0, 0.25, 0.5, 0.75, 1],
                repeat: iterations - 1,
              }}
              style={{
                background: 'linear-gradient(90deg, #ff0000 0%, #00ff00 50%, #0000ff 100%)',
              }}
            />

            {/* 扫描线效果 */}
            <motion.div
              className="absolute inset-0 pointer-events-none overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.5, 0] }}
              transition={{
                duration: duration / 1000,
                repeat: iterations - 1,
              }}
            >
              <motion.div
                className="absolute w-full"
                initial={{ y: '-100%' }}
                animate={{ y: '100%' }}
                transition={{
                  duration: duration / 1000,
                  repeat: iterations - 1,
                  ease: 'linear',
                }}
                style={{
                  background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
                  height: '20%',
                }}
              />
            </motion.div>

            {/* 雪花噪点效果 */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, maxOpacity * 0.8, 0] }}
              transition={{
                duration: duration / 1000,
                repeat: iterations - 1,
              }}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                backgroundSize: '200px 200px',
              }}
            />

            {/* 画面扭曲效果（CSS clip-path） */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, maxOpacity * 0.6, 0],
                clipPath: [
                  'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
                  'polygon(0 2%, 100% 0, 100% 98%, 0 100%)',
                  'polygon(0 0, 100% 2%, 100% 100%, 0 98%)',
                  'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
                ],
              }}
              transition={{
                duration: duration / 1000,
                times: [0, 0.33, 0.66, 1],
                repeat: iterations - 1,
              }}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
