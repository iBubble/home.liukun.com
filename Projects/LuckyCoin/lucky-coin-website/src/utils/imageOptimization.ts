/**
 * 图片优化工具函数
 */

/**
 * 懒加载图片
 * @param imgElement 图片元素
 */
export function lazyLoadImage(imgElement: HTMLImageElement) {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.dataset.src;
          if (src) {
            img.src = src;
            img.removeAttribute('data-src');
          }
          observer.unobserve(img);
        }
      });
    });
    observer.observe(imgElement);
  } else {
    // 降级处理：直接加载图片
    const src = imgElement.dataset.src;
    if (src) {
      imgElement.src = src;
    }
  }
}

/**
 * 预加载关键图片
 * @param urls 图片 URL 数组
 */
export function preloadImages(urls: string[]): Promise<void[]> {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = url;
        })
    )
  );
}

/**
 * 获取响应式图片 URL
 * @param baseUrl 基础 URL
 * @param width 宽度
 */
export function getResponsiveImageUrl(baseUrl: string, width: number): string {
  // 如果将来需要使用 CDN 或图片处理服务，可以在这里添加逻辑
  return baseUrl;
}
