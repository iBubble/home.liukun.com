import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useModeStore } from '../../stores/modeStore';
import type { Mode } from '../../styles/colors';

interface SlotResult {
  type: 'dollar' | 'sewing-machine';
  mode: Mode;
}

export default function SlotMachine({ onResult }: { onResult: (mode: Mode) => void }) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<SlotResult | null>(null);
  const [showEffect, setShowEffect] = useState(false);
  const { setMode } = useModeStore();

  const calculateResult = (): SlotResult => {
    const random = Math.random();
    if (random < 0.1) {
      return { type: 'dollar', mode: 'dream' };
    }
    return { type: 'sewing-machine', mode: 'reality' };
  };

  const handleSpin = async () => {
    if (isSpinning) return;

    setIsSpinning(true);
    setResult(null);
    setShowEffect(false);

    // 模拟转动动画
    await new Promise(resolve => setTimeout(resolve, 2000));

    const slotResult = calculateResult();
    setResult(slotResult);
    setShowEffect(true);

    // 播放特效
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 转场到对应模式
    setMode(slotResult.mode);
    onResult(slotResult.mode);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-purple-900 to-black">
      <motion.div
        className="relative w-96 h-96 bg-gradient-to-br from-yellow-600 to-yellow-800 rounded-3xl shadow-2xl p-8 flex flex-col items-center justify-between"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* 老虎机屏幕 */}
        <div className="w-full h-48 bg-black rounded-xl flex items-center justify-center overflow-hidden relative">
          <AnimatePresence mode="wait">
            {isSpinning && !result && (
              <motion.div
                key="spinning"
                className="text-6xl"
                animate={{
                  rotateX: [0, 360, 720, 1080, 1440],
                }}
                transition={{
                  duration: 2,
                  times: [0, 0.2, 0.5, 0.8, 1],
                  ease: [0.43, 0.13, 0.23, 0.96],
                }}
              >
                🎰
              </motion.div>
            )}
            
            {result && (
              <motion.div
                key="result"
                className="text-6xl"
                initial={{ scale: 0, rotateY: 180 }}
                animate={{ scale: 1, rotateY: 0 }}
                transition={{ duration: 0.5 }}
              >
                {result.type === 'dollar' ? '💰💰💰' : '🪡🪡🪡'}
              </motion.div>
            )}
            
            {!isSpinning && !result && (
              <motion.div
                key="idle"
                className="text-6xl opacity-30"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                🎰
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 投币按钮 */}
        <motion.button
          onClick={handleSpin}
          disabled={isSpinning}
          className={`px-12 py-4 text-2xl font-bold rounded-full transition-all ${
            isSpinning
              ? 'bg-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 cursor-pointer'
          }`}
          whileHover={!isSpinning ? { scale: 1.05 } : {}}
          whileTap={!isSpinning ? { scale: 0.95 } : {}}
        >
          <span className="text-white font-chinese">
            {isSpinning ? '转动中...' : 'INSERT COIN 投币'}
          </span>
        </motion.button>

        {/* 拉杆装饰 */}
        <motion.div
          className="absolute right-4 top-1/2 w-6 h-32 bg-red-600 rounded-full"
          animate={isSpinning ? { y: [0, 50, 0] } : {}}
          transition={{ duration: 0.3 }}
        />
      </motion.div>

      {/* 金币雨特效 */}
      <AnimatePresence>
        {showEffect && result?.type === 'dollar' && (
          <CoinRain />
        )}
      </AnimatePresence>

      {/* 走音喇叭音效提示 */}
      <AnimatePresence>
        {showEffect && result?.type === 'sewing-machine' && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="text-9xl"
              animate={{
                scale: [1, 1.5, 1],
                rotate: [0, -10, 10, 0],
              }}
              transition={{ duration: 0.8 }}
            >
              📯
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// 金币雨组件
function CoinRain() {
  const coins = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1 + Math.random() * 0.5,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {coins.map((coin) => (
        <motion.div
          key={coin.id}
          className="absolute text-4xl"
          style={{ left: `${coin.x}%`, top: '-10%' }}
          initial={{ y: 0, rotate: 0, opacity: 1 }}
          animate={{
            y: '120vh',
            rotate: 360 * 3,
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: coin.duration,
            delay: coin.delay,
            ease: 'easeIn',
          }}
        >
          💰
        </motion.div>
      ))}
    </div>
  );
}
