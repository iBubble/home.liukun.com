/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 梦境模式色彩（Acid Colors）
        dream: {
          primary: '#00FF41',      // 荧光绿
          secondary: '#FF1493',    // 芭比粉
          accent: '#FFD700',       // 土豪金
          background: '#1a0033',   // 深紫黑
          text: '#FFFFFF',         // 纯白
        },
        // 现实模式色彩（Industrial Colors）
        reality: {
          primary: '#8B4513',      // 铁锈红
          secondary: '#708090',    // 水泥灰
          accent: '#4682B4',       // 牛仔蓝
          background: '#2F4F4F',   // 深灰绿
          text: '#E5E5E5',         // 浅灰白
        },
      },
      fontFamily: {
        title: ['Bebas Neue', 'Impact', 'sans-serif'],
        body: ['Courier New', 'Monaco', 'monospace'],
        chinese: ['Noto Sans SC', 'Source Han Sans SC', 'sans-serif'],
      },
      fontSize: {
        'h1-desktop': '72px',
        'h1-tablet': '56px',
        'h1-mobile': '40px',
        'h2-desktop': '48px',
        'h2-tablet': '40px',
        'h2-mobile': '32px',
        'h3-desktop': '36px',
        'h3-tablet': '30px',
        'h3-mobile': '24px',
        'body-desktop': '18px',
        'body-tablet': '16px',
        'body-mobile': '14px',
      },
      animation: {
        'glitch': 'glitch 1s infinite',
        'spin-slot': 'spin-slot 2s cubic-bezier(0.43, 0.13, 0.23, 0.96)',
        'coin-fall': 'coin-fall 1.5s ease-out',
      },
      keyframes: {
        glitch: {
          '0%, 100%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
        },
        'spin-slot': {
          '0%': { transform: 'rotateX(0deg)' },
          '20%': { transform: 'rotateX(360deg)' },
          '50%': { transform: 'rotateX(720deg)' },
          '80%': { transform: 'rotateX(1080deg)' },
          '100%': { transform: 'rotateX(1440deg)' },
        },
        'coin-fall': {
          '0%': { transform: 'translateY(-100vh) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(100vh) rotate(720deg)', opacity: '0' },
        },
      },
      boxShadow: {
        'glow-dream': '0 0 20px rgba(0, 255, 65, 0.5)',
        'glow-reality': '0 0 20px rgba(0, 0, 0, 0.6)',
      },
    },
  },
  plugins: [],
}
