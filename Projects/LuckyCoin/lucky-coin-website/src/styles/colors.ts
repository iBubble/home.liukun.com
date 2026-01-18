// 色彩系统配置
export const dreamColors = {
  primary: '#00FF41',      // 荧光绿
  secondary: '#FF1493',    // 芭比粉
  accent: '#FFD700',       // 土豪金
  background: '#1a0033',   // 深紫黑
  text: '#FFFFFF',         // 纯白
  glow: 'rgba(0, 255, 65, 0.5)', // 发光效果
};

export const realityColors = {
  primary: '#8B4513',      // 铁锈红
  secondary: '#708090',    // 水泥灰
  accent: '#4682B4',       // 牛仔蓝
  background: '#2F4F4F',   // 深灰绿
  text: '#E5E5E5',         // 浅灰白
  shadow: 'rgba(0, 0, 0, 0.6)', // 阴影
};

export type Mode = 'dream' | 'reality';

export const getColors = (mode: Mode) => {
  return mode === 'dream' ? dreamColors : realityColors;
};
