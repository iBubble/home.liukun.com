/**
 * 可访问性工具函数
 */

/**
 * 检查用户是否偏好减少动画
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * 检查颜色对比度是否符合 WCAG AA 标准（4.5:1）
 * @param foreground 前景色（十六进制）
 * @param background 背景色（十六进制）
 */
export function checkColorContrast(foreground: string, background: string): boolean {
  const getLuminance = (hex: string): number => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = ((rgb >> 16) & 0xff) / 255;
    const g = ((rgb >> 8) & 0xff) / 255;
    const b = (rgb & 0xff) / 255;

    const [rs, gs, bs] = [r, g, b].map((c) =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    );

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

  return ratio >= 4.5;
}

/**
 * 为元素添加键盘焦点样式
 */
export function addFocusStyles(element: HTMLElement, color: string) {
  element.style.outline = `3px solid ${color}`;
  element.style.outlineOffset = '2px';
}

/**
 * 移除元素的键盘焦点样式
 */
export function removeFocusStyles(element: HTMLElement) {
  element.style.outline = '';
  element.style.outlineOffset = '';
}

/**
 * 宣布屏幕阅读器消息
 * @param message 要宣布的消息
 * @param priority 优先级（'polite' 或 'assertive'）
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
) {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * 捕获焦点在模态框内
 * @param modalElement 模态框元素
 */
export function trapFocus(modalElement: HTMLElement) {
  const focusableElements = modalElement.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    }
  };

  modalElement.addEventListener('keydown', handleTabKey);

  return () => {
    modalElement.removeEventListener('keydown', handleTabKey);
  };
}
