import { Link, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useModeStore } from '../../stores/modeStore';
import { getColors } from '../../styles/colors';
import ModeToggle from '../../components/ModeToggle';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import CursorTrail from '../../components/CursorTrail';
import GlitchEffect from '../../components/GlitchEffect';

const navItems = [
  { path: '/main/story', labelKey: 'nav.story' },
  { path: '/main/characters', labelKey: 'nav.characters' },
  { path: '/main/director', labelKey: 'nav.director' },
  { path: '/main/crowdfunding', labelKey: 'nav.crowdfunding' },
  { path: '/main/investor', labelKey: 'nav.investor' },
];

export default function Main() {
  const { t } = useTranslation();
  const { mode } = useModeStore();
  const colors = getColors(mode);
  const location = useLocation();

  return (
    <GlitchEffect trigger="random" intensity="low">
      <div
        className="min-h-screen transition-colors duration-500"
        style={{ backgroundColor: colors.background }}
        role="main"
        aria-label="一元奇梦电影网站主页面"
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
          role="navigation"
          aria-label="主导航菜单"
        >
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link to="/main/story" aria-label={t('nav.home')}>
                <motion.h1
                  className="text-3xl md:text-4xl font-bold font-chinese"
                  style={{ color: colors.accent }}
                  whileHover={{ scale: 1.05 }}
                >
                  {t('home.title')}
                </motion.h1>
              </Link>

              <div className="flex items-center gap-2 md:gap-4">
                {/* 语言切换器 */}
                <LanguageSwitcher />
                
                {/* 导航菜单 */}
                <div className="flex gap-2 md:gap-4 flex-wrap justify-end" role="menubar">
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
                        role="menuitem"
                        aria-current={location.pathname === item.path ? 'page' : undefined}
                        aria-label={`${t('common.view')}${t(item.labelKey)}`}
                      >
                        {t(item.labelKey)}
                      </motion.button>
                    </Link>
                  ))}
                </div>
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
          role="contentinfo"
          aria-label="网站页脚信息"
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
