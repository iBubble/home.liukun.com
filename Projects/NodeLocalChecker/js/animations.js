/**
 * 科幻动画效果管理器
 */

class CyberpunkAnimations {
    constructor() {
        this.particles = [];
        this.init();
    }

    init() {
        this.createParticles();
        this.createMatrixRain();
        this.createCircuitBoard();
        this.startAnimationLoop();
    }

    /**
     * 创建粒子背景
     */
    createParticles() {
        const container = document.createElement('div');
        container.className = 'particles-container';
        document.body.appendChild(container);

        // 创建 50 个粒子
        for (let i = 0; i < 50; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            // 随机位置
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = Math.random() * 100 + '%';
            
            // 随机动画延迟
            particle.style.animationDelay = Math.random() * 10 + 's';
            
            // 随机大小
            const size = Math.random() * 3 + 1;
            particle.style.width = size + 'px';
            particle.style.height = size + 'px';
            
            container.appendChild(particle);
            this.particles.push(particle);
        }
    }

    /**
     * 创建矩阵雨效果
     */
    createMatrixRain() {
        const container = document.createElement('div');
        container.className = 'matrix-rain';
        document.body.appendChild(container);

        const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
        
        // 创建 20 列
        for (let i = 0; i < 20; i++) {
            const column = document.createElement('div');
            column.className = 'matrix-column';
            column.style.left = (i * 5) + '%';
            column.style.animationDelay = Math.random() * 5 + 's';
            column.style.animationDuration = (Math.random() * 5 + 10) + 's';
            
            // 随机字符
            let text = '';
            for (let j = 0; j < 20; j++) {
                text += chars[Math.floor(Math.random() * chars.length)] + '<br>';
            }
            column.innerHTML = text;
            
            container.appendChild(column);
        }
    }

    /**
     * 创建电路板背景
     */
    createCircuitBoard() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'circuit-board');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');

        // 创建随机电路线
        for (let i = 0; i < 10; i++) {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const d = this.generateRandomPath();
            path.setAttribute('d', d);
            path.setAttribute('class', 'circuit-line');
            path.style.animationDelay = Math.random() * 5 + 's';
            svg.appendChild(path);
        }

        document.body.appendChild(svg);
    }

    /**
     * 生成随机路径
     */
    generateRandomPath() {
        const points = [];
        let x = Math.random() * window.innerWidth;
        let y = Math.random() * window.innerHeight;
        points.push(`M ${x} ${y}`);

        for (let i = 0; i < 5; i++) {
            x += (Math.random() - 0.5) * 200;
            y += (Math.random() - 0.5) * 200;
            points.push(`L ${x} ${y}`);
        }

        return points.join(' ');
    }

    /**
     * 动画循环
     */
    startAnimationLoop() {
        setInterval(() => {
            this.createDataStream();
        }, 2000);
    }

    /**
     * 创建数据流效果
     */
    createDataStream() {
        const stream = document.createElement('div');
        stream.className = 'data-stream';
        stream.style.top = Math.random() * window.innerHeight + 'px';
        stream.style.width = Math.random() * 200 + 100 + 'px';
        document.body.appendChild(stream);

        setTimeout(() => {
            stream.remove();
        }, 3000);
    }

    /**
     * 节点卡片检测动画
     */
    static animateNodeCheck(element) {
        element.classList.add('checking');
        
        // 创建雷达扫描效果
        const radar = document.createElement('div');
        radar.className = 'radar-scanner';
        radar.innerHTML = `
            <div class="radar-circle"></div>
            <div class="radar-circle" style="width: 70%; height: 70%; margin: 15%;"></div>
            <div class="radar-circle" style="width: 40%; height: 40%; margin: 30%;"></div>
            <div class="radar-sweep"></div>
        `;
        element.appendChild(radar);

        return radar;
    }

    /**
     * 节点检测成功动画
     */
    static animateNodeSuccess(element) {
        element.classList.remove('checking');
        element.classList.add('success');
        
        // 移除雷达
        const radar = element.querySelector('.radar-scanner');
        if (radar) radar.remove();

        // 创建波纹效果
        const rippleContainer = document.createElement('div');
        rippleContainer.className = 'ripple-container';
        rippleContainer.innerHTML = `
            <div class="ripple"></div>
            <div class="ripple"></div>
            <div class="ripple"></div>
        `;
        element.appendChild(rippleContainer);

        setTimeout(() => {
            rippleContainer.remove();
        }, 2000);
    }

    /**
     * 节点检测失败动画
     */
    static animateNodeFailed(element) {
        element.classList.remove('checking');
        element.classList.add('failed');
        
        // 移除雷达
        const radar = element.querySelector('.radar-scanner');
        if (radar) radar.remove();

        // 抖动效果
        element.style.animation = 'shake 0.5s ease-out';
        setTimeout(() => {
            element.style.animation = '';
        }, 500);
    }

    /**
     * 显示通知
     */
    static showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slide-in-right 0.5s ease-out reverse';
            setTimeout(() => {
                notification.remove();
            }, 500);
        }, 3000);
    }

    /**
     * 创建加载动画
     */
    static createLoader(container) {
        const loader = document.createElement('div');
        loader.className = 'loading-spinner';
        container.appendChild(loader);
        return loader;
    }

    /**
     * 移除加载动画
     */
    static removeLoader(loader) {
        if (loader && loader.parentNode) {
            loader.style.animation = 'fade-out 0.3s ease-out';
            setTimeout(() => {
                loader.remove();
            }, 300);
        }
    }

    /**
     * 数字滚动动画
     */
    static animateNumber(element, from, to, duration = 1000) {
        const start = Date.now();
        const range = to - from;

        const update = () => {
            const now = Date.now();
            const progress = Math.min((now - start) / duration, 1);
            const value = Math.floor(from + range * progress);
            element.textContent = value;

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        };

        requestAnimationFrame(update);
    }

    /**
     * 进度条动画
     */
    static animateProgress(element, percent) {
        const fill = element.querySelector('.progress-bar') || element;
        fill.style.width = percent + '%';
    }

    /**
     * 卡片展开动画
     */
    static expandCard(element) {
        element.style.maxHeight = '0';
        element.style.opacity = '0';
        element.style.display = 'block';
        
        requestAnimationFrame(() => {
            element.style.transition = 'all 0.5s ease-out';
            element.style.maxHeight = element.scrollHeight + 'px';
            element.style.opacity = '1';
        });
    }

    /**
     * 卡片收起动画
     */
    static collapseCard(element) {
        element.style.maxHeight = element.scrollHeight + 'px';
        
        requestAnimationFrame(() => {
            element.style.transition = 'all 0.5s ease-out';
            element.style.maxHeight = '0';
            element.style.opacity = '0';
            
            setTimeout(() => {
                element.style.display = 'none';
            }, 500);
        });
    }

    /**
     * 按钮点击波纹效果
     */
    static buttonRipple(button, event) {
        const ripple = document.createElement('span');
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;

        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            background: rgba(255, 255, 255, 0.5);
            border-radius: 50%;
            transform: scale(0);
            animation: ripple 0.6s ease-out;
            pointer-events: none;
        `;

        button.style.position = 'relative';
        button.style.overflow = 'hidden';
        button.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    /**
     * 全息投影效果
     */
    static applyHologram(element) {
        element.classList.add('hologram');
    }

    /**
     * 能量条充能动画
     */
    static chargeEnergyBar(element, duration = 2000) {
        const fill = element.querySelector('.energy-fill');
        if (!fill) return;

        fill.style.width = '0%';
        fill.style.transition = `width ${duration}ms ease-out`;
        
        requestAnimationFrame(() => {
            fill.style.width = '100%';
        });
    }
}

// 初始化动画系统
document.addEventListener('DOMContentLoaded', () => {
    window.cyberpunkAnimations = new CyberpunkAnimations();
    console.log('🚀 赛博朋克动画系统已启动');
});

// 导出供其他模块使用
window.CyberpunkAnimations = CyberpunkAnimations;
