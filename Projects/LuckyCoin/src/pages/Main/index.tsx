import { Link, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useModeStore } from '../../stores/modeStore';
import { getColors } from '../../styles/colors';
import ModeToggle from '../../components/ModeToggle';
import CursorTrail from '../../components/CursorTrail';
import GlitchEffect from '../../components/GlitchEffect';

const navItems = [
  { path: '/main/story', label: '故事板' },
  { path: '/main/characters', label: '角色' },
  { path: '/main/director', label: '导演风格' },
  { path: '/main/crowdfunding', label: '一元预订' },
  { path: '/main/investor', label: '投资人专区' },
];

export default function Main() {
  const { mode } = useModeStore();
  const colors = getColors(mode);
  const location = useLocation();

  return (
    <GlitchEffect trigger="random" intensity="low">
      <div
        className="min-h-screen transition-colors duration-500"
        style={{ backgroundColor: colors.background }}
      >
        <CursorTrail enabled={true} />
        <ModeToggle />

        {/* 导航栏 */}
        <nav
          className="sticky top-0 z-40 backdrop-blur-md"
          style={{
            backgroundColor: `${colors.background}cc`,
            borderBottom: `2px solid ${colors.accent}`,
          }}
        >
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link to="/main/story">
                <motion.h1
                  className="text-3xl md:text-4xl font-bold font-chinese"
                  style={{ color: colors.accent }}
                  whileHover={{ scale: 1.05 }}
                >
                  一元奇梦
                </motion.h1>
              </Link>

              <div className="flex gap-2 md:gap-4 flex-wrap justify-end">
                {navItems.map((item) => (
                  <Link key={item.path} to={item.path}>
                    <motion.button
                      className="px-3 md:px-6 py-2 rounded-lg font-chinese text-sm md:text-base font-bold transition-all"
                      style={{
                        backgroundColor:
                          location.pathname === item.path
                            ? colors.accent
                            : colors.secondary,
                        color:
                          location.pathname === item.path
                            ? mode === 'dream'
                              ? '#000'
                              : '#fff'
                            : colors.text,
                        border: `2px solid ${colors.accent}`,
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {item.label}
                    </motion.button>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </nav>

        {/* 页面内容 */}
        <Outlet />

        {/* 页脚 */}
        <footer
          className="py-12 px-4"
          style={{
            backgroundColor: colors.secondary,
            borderTop: `2px solid ${colors.accent}`,
          }}
        >
          <div className="max-w-7xl mx-auto text-center space-y-4">
            <p
              className="text-2xl font-chinese font-bold"
              style={{ color: colors.accent }}
            >
              做梦只要一块钱，醒来得踩一万脚
            </p>
            <p className="text-sm font-chinese" style={{ color: colors.text, opacity: 0.7 }}>
              © 2026 Lucky Coin Film. All rights reserved.
            </p>
            <p className="text-xs font-chinese italic" style={{ color: colors.text, opacity: 0.5 }}>
              普拉托的达利，温州的卓别林
            </p>
          </div>
        </footer>
      </div>
    </GlitchEffect>
  );
}
