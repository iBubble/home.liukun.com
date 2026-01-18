import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useModeStore } from '../../stores/modeStore';

interface CoinTrail {
  id: number;
  x: number;
  y: number;
  timestamp: number;
}

interface CursorTrailProps {
  enabled: boolean;
  maxCoins?: number;
  fadeOutDuration?: number;
}

export default function CursorTrail({
  enabled,
  maxCoins = 8,
  fadeOutDuration = 1000,
}: CursorTrailProps) {
  const [coins, setCoins] = useState<CoinTrail[]>([]);
  const coinIdRef = useRef(0);
  const lastAddTimeRef = useRef(0);
  const { mode } = useModeStore();

  // 检测是否为移动设备
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  useEffect(() => {
    // 移动设备禁用轨迹效果
    if (!enabled || isMobile) return;

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      
      // 限制添加频率，避免硬币太密集
      if (now - lastAddTimeRef.current < 50) return;
      
      lastAddTimeRef.current = now;

      const newCoin: CoinTrail = {
        id: coinIdRef.current++,
        x: e.clientX,
        y: e.clientY,
        timestamp: now,
      };

      setCoins((prev) => {
        const updated = [...prev, newCoin];
        // 只保留最新的 maxCoins 个硬币
        return updated.slice(-maxCoins);
      });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [enabled, maxCoins, isMobile]);

  // 清除过期硬币
  useEffect(() => {
    if (!enabled || isMobile) return;

    const interval = setInterval(() => {
      const now = Date.now();
      setCoins((prev) =>
        prev.filter((coin) => now - coin.timestamp < fadeOutDuration)
      );
    }, 50);

    return () => clearInterval(interval);
  }, [enabled, fadeOutDuration, isMobile]);

  // 移动设备不渲染
  if (!enabled || isMobile) return null;

  const getOpacity = (coin: CoinTrail) => {
    const age = Date.now() - coin.timestamp;
    return Math.max(0, 1 - age / fadeOutDuration);
  };

  const getScale = (coin: CoinTrail) => {
    const age = Date.now() - coin.timestamp;
    const progress = age / fadeOutDuration;
    return Math.max(0.3, 1 - progress * 0.7);
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <AnimatePresence>
        {coins.map((coin) => {
          const opacity = getOpacity(coin);
          if (opacity <= 0) return null;

          return (
            <motion.div
              key={coin.id}
              className="absolute text-2xl"
              style={{
                left: coin.x,
                top: coin.y,
                opacity,
                transform: `translate(-50%, -50%) scale(${getScale(coin)})`,
              }}
              initial={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.3, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {mode === 'dream' ? '💰' : '🪡'}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
