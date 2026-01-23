// 滚动交互
document.addEventListener('DOMContentLoaded', () => {
    // 导航栏滚动效果
    const header = document.querySelector('header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // 滚动揭示动画
    const revealElements = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                // 如果包含数字统计，启动计数
                const stats = entry.target.querySelectorAll('.stat-num');
                stats.forEach(s => animateValue(s));
            }
        });
    }, { threshold: 0.15 });

    revealElements.forEach(el => revealObserver.observe(el));

    // 业务流 Tabs 切换
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');

            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // 数字增长动画
    function animateValue(obj) {
        const target = parseInt(obj.getAttribute('data-target'));
        const duration = 2000;
        let start = 0;
        const step = (timestamp) => {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            obj.innerText = Math.floor(progress * target);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    // 初始化统计数据 (在 stat-grid 进入视野时触发)
    const statGrid = document.querySelector('.stat-grid');
    const statObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            document.querySelectorAll('.stat-num').forEach(s => animateValue(s));
            statObserver.unobserve(statGrid);
        }
    });
    statObserver.observe(statGrid);

    // Chart.js 图表初始化
    initCharts();
});

function initCharts() {
    // 合作模式饼图
    const modelCtx = document.getElementById('modelChart').getContext('2d');
    new Chart(modelCtx, {
        type: 'doughnut',
        data: {
            labels: ['政府 (资源/监管)', '运营方 (资本/技术)', '社区分红 (15%)'],
            datasets: [{
                data: [42.5, 42.5, 15],
                backgroundColor: ['#001A3D', '#0066FF', '#FF5500'],
                borderWidth: 0
            }]
        },
        options: {
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });

    // 资金分配饼图 (匹配 500万 启动资金)
    const financeCtx = document.getElementById('financeChart').getContext('2d');
    new Chart(financeCtx, {
        type: 'pie',
        data: {
            labels: ['模块化建筑 (55%)', '数智设备 (25%)', '人员及培训 (15%)', '土地与运营准备 (5%)'],
            datasets: [{
                data: [55, 25, 15, 5],
                backgroundColor: ['#0066FF', '#3B82F6', '#60A5FA', '#93C5FD'],
                borderColor: 'transparent'
            }]
        },
        options: {
            plugins: {
                legend: { position: 'right', labels: { color: '#fff' } }
            }
        }
    });

    // 营收预测柱状图
    const revCtx = document.getElementById('revenueChart').getContext('2d');
    new Chart(revCtx, {
        type: 'bar',
        data: {
            labels: ['To C 住宿', 'To C 旅拍/补给', 'To G 服务', 'To B 研学'],
            datasets: [{
                label: '预计年收入 (万)',
                data: [240, 160, 50, 249],
                backgroundColor: 'rgba(0, 102, 255, 0.6)',
                borderColor: '#0066FF',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#fff' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                x: {
                    ticks: { color: '#fff' },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}
