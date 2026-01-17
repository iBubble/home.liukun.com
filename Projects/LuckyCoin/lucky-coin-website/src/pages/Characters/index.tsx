import { useModeStore } from '../../stores/modeStore';
import { getColors } from '../../styles/colors';
import CharacterCard from '../../components/CharacterCard';

const characters = [
  {
    id: '1',
    name: '主角',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    stats: {
      dream: { label: '做梦能力', value: 'SSS', rank: 'SSS' as const },
      sewing: { label: '缝纫手速', value: 'A', rank: 'A' as const },
      money: { label: '银行存款', value: '-€500' },
    },
    skill: {
      name: '我舅舅是厂长',
      description: '试图利用关系解决问题',
      effect: '无效，被工友嘲笑',
    },
  },
  {
    id: '2',
    name: '意大利房东',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
    stats: {
      rent: { label: '收租能力', value: 'S', rank: 'S' as const },
      chinese: { label: '中文水平', value: 'B', rank: 'B' as const },
      patience: { label: '耐心值', value: 'D', rank: 'D' as const },
    },
    skill: {
      name: '催租大法',
      description: '只会说"房租"和"没钱滚"',
      effect: '让租客压力倍增',
    },
  },
  {
    id: '3',
    name: '工友老王',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    stats: {
      experience: { label: '工作经验', value: '15年', rank: 'S' as const },
      speed: { label: '缝纫速度', value: 'SS', rank: 'SS' as const },
      wisdom: { label: '人生智慧', value: 'A', rank: 'A' as const },
    },
    skill: {
      name: '过来人的忠告',
      description: '用亲身经历告诉你现实的残酷',
      effect: '让主角清醒但更迷茫',
    },
  },
];

export default function Characters() {
  const { mode } = useModeStore();
  const colors = getColors(mode);

  return (
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
            角色卡牌
          </h1>
          <p
            className="text-xl md:text-2xl font-chinese"
            style={{ color: colors.text }}
          >
            RPG 风格的荒诞人物志
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {characters.map((character) => (
            <CharacterCard key={character.id} character={character} />
          ))}
        </div>

        <div
          className="text-center p-8 rounded-2xl"
          style={{
            backgroundColor: colors.secondary,
            color: colors.text,
          }}
        >
          <p className="text-2xl font-chinese italic">
            "他口袋里只有一枚硬币，但他发誓这枚硬币是通往罗马的钥匙。结果，他用它买了个肉包子。"
          </p>
        </div>
      </div>
    </div>
  );
}
