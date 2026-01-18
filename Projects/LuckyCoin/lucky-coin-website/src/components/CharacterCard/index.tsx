import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useModeStore } from '../../stores/modeStore';
import { getColors } from '../../styles/colors';

interface Character {
  id: string;
  name: string;
  avatar: string;
  stats: {
    [key: string]: {
      label: string;
      value: string | number;
      rank?: 'SSS' | 'SS' | 'S' | 'A' | 'B' | 'C' | 'D';
    };
  };
  skill?: {
    name: string;
    description: string;
    effect: string;
  };
}

interface CharacterCardProps {
  character: Character;
  onClick?: (id: string) => void;
}

export default function CharacterCard({ character, onClick }: CharacterCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const { mode } = useModeStore();
  const colors = getColors(mode);

  const rankColors = {
    SSS: '#FFD700',
    SS: '#FF6B6B',
    S: '#FF8C42',
    A: '#4ECDC4',
    B: '#95E1D3',
    C: '#A8DADC',
    D: '#B0B0B0',
  };

  const handleClick = () => {
    setShowDetail(true);
    onClick?.(character.id);
  };

  return (
    <>
      <motion.div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden cursor-pointer"
        style={{
          backgroundColor: colors.background,
          border: `3px solid ${colors.accent}`,
          boxShadow: mode === 'dream' ? `0 0 30px ${colors.glow}` : `0 10px 30px ${colors.shadow}`,
        }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        onClick={handleClick}
        whileHover={{ scale: 1.05, y: -10 }}
        transition={{ duration: 0.3 }}
      >
        {/* 头像 */}
        <div className="relative h-64 overflow-hidden">
          <motion.img
            src={character.avatar}
            alt={character.name}
            className="w-full h-full object-cover"
            animate={isHovered ? { scale: 1.1 } : { scale: 1 }}
            transition={{ duration: 0.3 }}
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"
          />
        </div>

        {/* 角色名称 */}
        <div className="absolute top-4 left-4 right-4">
          <h3
            className="text-3xl font-bold font-chinese"
            style={{ color: colors.accent }}
          >
            {character.name}
          </h3>
        </div>

        {/* 属性面板 */}
        <div className="p-6 space-y-3">
          {Object.entries(character.stats).map(([key, stat]) => (
            <div key={key} className="flex justify-between items-center">
              <span className="text-sm font-chinese" style={{ color: colors.text }}>
                {stat.label}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="text-lg font-bold"
                  style={{
                    color: stat.rank ? rankColors[stat.rank] : colors.accent,
                  }}
                >
                  {stat.value}
                </span>
                {stat.rank && (
                  <span
                    className="px-2 py-1 rounded text-xs font-bold"
                    style={{
                      backgroundColor: rankColors[stat.rank],
                      color: '#000',
                    }}
                  >
                    {stat.rank}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 必杀技 */}
        {character.skill && (
          <div
            className="p-6 pt-0"
            style={{ borderTop: `1px solid ${colors.accent}` }}
          >
            <div className="space-y-2">
              <h4
                className="text-lg font-bold font-chinese"
                style={{ color: colors.accent }}
              >
                必杀技：{character.skill.name}
              </h4>
              <p className="text-sm font-chinese opacity-80" style={{ color: colors.text }}>
                {character.skill.effect}
              </p>
            </div>
          </div>
        )}

        {/* 悬停提示 */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-white text-xl font-chinese">点击查看详情</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* 详情弹窗 */}
      <AnimatePresence>
        {showDetail && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDetail(false)}
          >
            <motion.div
              className="relative max-w-2xl w-full rounded-3xl overflow-hidden"
              style={{
                backgroundColor: colors.background,
                border: `4px solid ${colors.accent}`,
              }}
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative h-96">
                <img
                  src={character.avatar}
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
              </div>

              <div className="p-8 space-y-6">
                <h2
                  className="text-5xl font-bold font-chinese"
                  style={{ color: colors.accent }}
                >
                  {character.name}
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(character.stats).map(([key, stat]) => (
                    <div key={key} className="space-y-1">
                      <p className="text-sm font-chinese opacity-60" style={{ color: colors.text }}>
                        {stat.label}
                      </p>
                      <p
                        className="text-2xl font-bold"
                        style={{
                          color: stat.rank ? rankColors[stat.rank] : colors.accent,
                        }}
                      >
                        {stat.value} {stat.rank && `(${stat.rank})`}
                      </p>
                    </div>
                  ))}
                </div>

                {character.skill && (
                  <div className="space-y-3">
                    <h3
                      className="text-2xl font-bold font-chinese"
                      style={{ color: colors.accent }}
                    >
                      必杀技：{character.skill.name}
                    </h3>
                    <p className="text-lg font-chinese" style={{ color: colors.text }}>
                      {character.skill.description}
                    </p>
                    <p
                      className="text-sm font-chinese italic opacity-70"
                      style={{ color: colors.text }}
                    >
                      效果：{character.skill.effect}
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setShowDetail(false)}
                  className="w-full py-3 rounded-xl font-bold text-lg transition-all hover:scale-105"
                  style={{
                    backgroundColor: colors.accent,
                    color: mode === 'dream' ? '#000' : '#fff',
                  }}
                >
                  关闭
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
