import { motion } from 'framer-motion';
import { useModeStore } from '../../stores/modeStore';
import { getColors } from '../../styles/colors';

interface ModeToggleProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export default function ModeToggle({ position = 'top-right' }: ModeToggleProps) {
  const { mode, toggleMode, isTransitioning } = useModeStore();
  const colors = getColors(mode);

  const positionClasses = {
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
  };

  return (
    <motion.button
      onClick={toggleMode}
      disabled={isTransitioning}
      className={`fixed ${positionClasses[position]} z-50 w-16 h-16 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110`}
      style={{
        backgroundColor: colors.accent,
        boxShadow: mode === 'dream' ? `0 0 20px ${colors.glow}` : `0 4px 6px ${colors.shadow}`,
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      animate={{
        rotateY: isTransitioning ? 180 : 0,
      }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        animate={{ rotateY: isTransitioning ? 180 : 0 }}
        transition={{ duration: 0.5 }}
        className="text-3xl"
      >
        {mode === 'dream' ? '💰' : '🪡'}
      </motion.div>
    </motion.button>
  );
}
