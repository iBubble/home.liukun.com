import { useModeStore } from '../../stores/modeStore';
import { useTranslation } from 'react-i18next';
import { getColors } from '../../styles/colors';
import SliderComparison from '../../components/SliderComparison';
import GlitchEffect from '../../components/GlitchEffect';

export default function Story() {
  const { t } = useTranslation();
  const { mode } = useModeStore();
  const colors = getColors(mode);

  const dreamContent = {
    image: '/Projects/LuckyCoin/images/story/dream-new.jpg',
    caption: t('story.dream.scene1.description'),
  };

  const realityContent = {
    image: '/Projects/LuckyCoin/images/story/reality-new.jpg',
    caption: t('story.reality.scene1.description'),
  };

  return (
    <GlitchEffect trigger="random" intensity="medium">
      <div
        className="min-h-screen py-20 px-4"
        style={{ backgroundColor: colors.background }}
      >
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h1
              className="text-6xl md:text-8xl font-bold glitch-text font-chinese"
              style={{ color: colors.accent }}
            >
              {t('story.title')}
            </h1>
            <p
              className="text-xl md:text-2xl font-chinese"
              style={{ color: colors.text }}
            >
              {t('story.subtitle')}
            </p>
          </div>

          <SliderComparison
            dreamContent={dreamContent}
            realityContent={realityContent}
          />

          <div className="grid md:grid-cols-2 gap-8 mt-16">
            <div
              className="p-8 rounded-2xl"
              style={{
                backgroundColor: mode === 'dream' ? colors.primary : colors.secondary,
                color: '#000',
              }}
            >
              <h3 className="text-3xl font-bold mb-4 font-chinese">关于梦想</h3>
              <p className="text-lg font-chinese leading-relaxed">
                "在普拉托，每个温州人白天踩缝纫机，晚上踩油门（在梦里）。如果你听见有人半夜笑醒，别担心，他只是刚在梦里买下了整个佛罗伦萨。"
              </p>
            </div>

            <div
              className="p-8 rounded-2xl"
              style={{
                backgroundColor: mode === 'reality' ? colors.primary : colors.secondary,
                color: '#fff',
              }}
            >
              <h3 className="text-3xl font-bold mb-4 font-chinese">关于现实</h3>
              <p className="text-lg font-chinese leading-relaxed">
                "这里的时尚流转得比光速还快。一件衣服从设计到出厂只需要24小时，而我们变老只需要一瞬间。"
              </p>
            </div>
          </div>
        </div>
      </div>
    </GlitchEffect>
  );
}
