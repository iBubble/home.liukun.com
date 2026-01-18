/**
 * 生成占位图片 URL
 * 使用 SVG 数据 URL，避免外部依赖
 */

export function generatePlaceholder(
  width: number,
  height: number,
  text: string,
  bgColor: string = '#333',
  textColor: string = '#fff'
): string {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${bgColor}"/>
      <text 
        x="50%" 
        y="50%" 
        dominant-baseline="middle" 
        text-anchor="middle" 
        font-family="Arial, sans-serif" 
        font-size="24" 
        fill="${textColor}"
      >${text}</text>
    </svg>
  `;
  
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * 角色头像占位图
 */
export const characterAvatars = {
  protagonist: generatePlaceholder(400, 400, '主角', '#4A5568', '#F7FAFC'),
  landlord: generatePlaceholder(400, 400, '房东', '#2D3748', '#F7FAFC'),
  worker: generatePlaceholder(400, 400, '老王', '#1A202C', '#F7FAFC'),
};

/**
 * 场景图片占位图
 */
export const sceneImages = {
  dream: generatePlaceholder(800, 600, '梦境场景', '#FFD700', '#000'),
  reality: generatePlaceholder(800, 600, '现实场景', '#808080', '#FFF'),
};

/**
 * 电影海报占位图
 */
export const moviePosters = {
  underground: generatePlaceholder(400, 600, '地下', '#8B4513', '#FFF'),
  kingOfComedy: generatePlaceholder(400, 600, '喜剧之王', '#DC143C', '#FFF'),
  grandBudapest: generatePlaceholder(400, 600, '布达佩斯大饭店', '#FF69B4', '#FFF'),
};
