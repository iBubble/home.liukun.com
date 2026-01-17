import { useEffect, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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

  useEffect(() => {
    if (trigger === 'manual') {
      setIsActive(active);
      return;
    }

    if (trigger === 'random') {
      const interval = setInterval(() => {
        setIsActive(true);
        setTimeout(() => setIsActive(false), duration);
      }, 30000 + Math.random() * 30000); // 30-60秒随机触发

      return () => clearInterval(interval);
    }
  }, [trigger, duration, active]);

  const intensityValues = {
    low: { offset: 2, iterations: 2 },
    medium: { offset: 5, iterations: 3 },
    high: { offset: 10, iterations: 5 },
  };

  const { offset, iterations } = intensityValues[intensity];

  return (
    <div className="relative">
      {children}
      
      <AnimatePresence>
        {isActive && (
          <>
            {/* 色彩分离效果 */}
            <motion.div
              className="absolute inset-0 pointer-events-none mix-blend-screen"
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, 0.7, 0.7, 0],
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
                opacity: 0.3,
              }}
            />

            {/* 扫描线效果 */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
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

            {/* 雪花噪点效果 */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.3, 0] }}
              transition={{
                duration: duration / 1000,
                repeat: iterations - 1,
              }}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                backgroundSize: '200px 200px',
              }}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
