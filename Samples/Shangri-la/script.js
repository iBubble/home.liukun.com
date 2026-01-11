// 工具函数：防抖
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 工具函数：节流
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Smooth scrolling for navigation links with snap
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            // 使用原生滚动API，配合CSS scroll-snap
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            
            // 更新导航栏激活状态
            updateActiveNavLink(this.getAttribute('href'));
        }
    });
});

// 更新导航栏激活状态
function updateActiveNavLink(targetId) {
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === targetId) {
            link.classList.add('active');
        }
    });
}

// 滚动时自动更新导航栏激活状态 - 使用节流优化性能
const updateNavOnScroll = throttle(() => {
    const sections = document.querySelectorAll('.hero, .section');
    const scrollPos = window.pageYOffset + 150; // 偏移量考虑header高度
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute('id');
        
        if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
            updateActiveNavLink('#' + sectionId);
        }
    });
    
    // 检测是否接近页面底部，如果是则禁用scroll-snap
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const distanceToBottom = scrollHeight - (scrollTop + clientHeight);
    
    // 如果距离底部小于200px，禁用scroll-snap
    if (distanceToBottom < 200) {
        document.documentElement.style.scrollSnapType = 'none';
    } else {
        document.documentElement.style.scrollSnapType = 'y proximity';
    }
}, 100);

window.addEventListener('scroll', updateNavOnScroll, { passive: true });

// Mobile menu toggle
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.querySelector('.nav-links');

if (menuToggle) {
    menuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
}

// Animated counter for hero stats
function animateCounter(element) {
    const target = parseFloat(element.getAttribute('data-target'));
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;
    
    const timer = setInterval(() => {
        current += step;
        if (current >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 16);
}

// Trigger counter animation when hero section is visible
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            document.querySelectorAll('.stat-number').forEach(animateCounter);
            observer.unobserve(entry.target);
        }
    });
});

const heroSection = document.querySelector('.hero');
if (heroSection) {
    observer.observe(heroSection);
}

// Tab switching functionality
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const targetTab = button.getAttribute('data-tab');
        
        // Remove active class from all buttons and contents
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked button and corresponding content
        button.classList.add('active');
        document.getElementById(targetTab).classList.add('active');
    });
});

// Bubble Chart for Application Scenarios
const bubbleCtx = document.getElementById('bubbleChart');
if (bubbleCtx) {
    new Chart(bubbleCtx, {
        type: 'bubble',
        data: {
            datasets: [{
                label: '文旅场景',
                data: [
                    { x: 8, y: 6, r: 15, label: '共享无人机旅拍' },
                    { x: 7, y: 8, r: 12, label: '空中观光体验' },
                    { x: 5, y: 5, r: 8, label: '应急救援服务' }
                ],
                backgroundColor: 'rgba(196, 30, 58, 0.7)',
                borderColor: 'rgba(196, 30, 58, 1)',
                borderWidth: 3,
                hoverBackgroundColor: 'rgba(196, 30, 58, 0.9)',
                hoverBorderWidth: 4
            }, {
                label: '行业应用',
                data: [
                    { x: 6, y: 6, r: 10, label: '森林防火监测' },
                    { x: 4, y: 3, r: 8, label: '农业植保作业' },
                    { x: 3, y: 3, r: 6, label: '基础设施巡检' }
                ],
                backgroundColor: 'rgba(212, 175, 55, 0.7)',
                borderColor: 'rgba(212, 175, 55, 1)',
                borderWidth: 3,
                hoverBackgroundColor: 'rgba(212, 175, 55, 0.9)',
                hoverBorderWidth: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: {
                duration: 2500,
                easing: 'easeInOutElastic',
                onProgress: function(animation) {
                    const progress = animation.currentStep / animation.numSteps;
                    bubbleCtx.style.transform = `perspective(1000px) rotateY(${progress * 5}deg)`;
                },
                onComplete: function() {
                    bubbleCtx.style.transform = 'perspective(1000px) rotateY(0deg)';
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: '经济效益 (千万元/年)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        color: '#c41e3a'
                    },
                    min: 0,
                    max: 10,
                    grid: {
                        color: 'rgba(196, 30, 58, 0.1)',
                        lineWidth: 2
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: '实施难度 (1-10)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        color: '#d4af37'
                    },
                    min: 0,
                    max: 10,
                    grid: {
                        color: 'rgba(212, 175, 55, 0.1)',
                        lineWidth: 2
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const point = context.raw;
                            return `${point.label}: 收益${point.x}千万, 难度${point.y}`;
                        }
                    },
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    padding: 15,
                    titleFont: {
                        size: 16,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 14
                    },
                    borderColor: 'rgba(196, 30, 58, 0.5)',
                    borderWidth: 2
                },
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                }
            }
        }
    });
}

// Pie Chart for Station Functions
const stationPieCtx = document.getElementById('stationPieChart');
if (stationPieCtx) {
    new Chart(stationPieCtx, {
        type: 'doughnut',
        data: {
            labels: ['充电存储', '维修保养', '应急补给', '气象采集', '游客服务'],
            datasets: [{
                data: [35, 25, 20, 10, 10],
                backgroundColor: [
                    'rgba(196, 30, 58, 0.8)',    /* 藏红色 */
                    'rgba(212, 175, 55, 0.8)',   /* 藏金色 */
                    'rgba(30, 64, 175, 0.8)',    /* 藏蓝色 */
                    'rgba(16, 185, 129, 0.8)',   /* 藏绿色 */
                    'rgba(248, 249, 250, 0.8)'   /* 藏白色 */
                ],
                borderColor: [
                    'rgba(196, 30, 58, 1)',
                    'rgba(212, 175, 55, 1)',
                    'rgba(30, 64, 175, 1)',
                    'rgba(16, 185, 129, 1)',
                    'rgba(200, 200, 200, 1)'
                ],
                borderWidth: 3,
                hoverOffset: 20,
                hoverBorderWidth: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: {
                animateRotate: true,
                animateScale: true,
                duration: 2500,
                easing: 'easeInOutElastic',
                onProgress: function(animation) {
                    const progress = animation.currentStep / animation.numSteps;
                    const scale = 0.3 + (progress * 0.7) + (Math.sin(progress * Math.PI) * 0.1);
                    const tiltX = Math.sin(progress * Math.PI * 2) * 5;
                    stationPieCtx.style.transform = `perspective(1000px) rotateX(${tiltX}deg) scale(${scale})`;
                    stationPieCtx.style.opacity = progress;
                },
                onComplete: function() {
                    stationPieCtx.style.transform = 'perspective(1000px) rotateX(0deg) scale(1)';
                    stationPieCtx.style.opacity = 1;
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        font: {
                            size: 13,
                            weight: 'bold'
                        },
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    padding: 15,
                    titleFont: {
                        size: 15,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 14
                    },
                    borderColor: 'rgba(79, 70, 229, 0.5)',
                    borderWidth: 2,
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.parsed + '%';
                        }
                    }
                },
                // 在饼图上显示百分比
                datalabels: {
                    color: '#fff',
                    font: {
                        size: 16,
                        weight: 'bold'
                    },
                    formatter: function(value, context) {
                        return value + '%';
                    },
                    anchor: 'center',
                    align: 'center'
                }
            }
        },
        plugins: [{
            // 自定义插件：在饼图上绘制百分比
            id: 'percentageLabels',
            afterDatasetsDraw: function(chart) {
                const ctx = chart.ctx;
                chart.data.datasets.forEach(function(dataset, i) {
                    const meta = chart.getDatasetMeta(i);
                    if (!meta.hidden) {
                        meta.data.forEach(function(element, index) {
                            ctx.fillStyle = '#fff';
                            ctx.font = 'bold 16px Arial';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            
                            const position = element.tooltipPosition();
                            const value = dataset.data[index];
                            ctx.fillText(value + '%', position.x, position.y);
                        });
                    }
                });
            }
        }]
    });
}

// Investment Bar Chart
const investmentCtx = document.getElementById('investmentChart');
if (investmentCtx) {
    const gradient1 = investmentCtx.getContext('2d').createLinearGradient(0, 0, 0, 400);
    gradient1.addColorStop(0, 'rgba(196, 30, 58, 1)');
    gradient1.addColorStop(1, 'rgba(196, 30, 58, 0.5)');
    
    const gradient2 = investmentCtx.getContext('2d').createLinearGradient(0, 0, 0, 400);
    gradient2.addColorStop(0, 'rgba(212, 175, 55, 1)');
    gradient2.addColorStop(1, 'rgba(212, 175, 55, 0.5)');
    
    const gradient3 = investmentCtx.getContext('2d').createLinearGradient(0, 0, 0, 400);
    gradient3.addColorStop(0, 'rgba(30, 64, 175, 1)');
    gradient3.addColorStop(1, 'rgba(30, 64, 175, 0.5)');
    
    const gradient4 = investmentCtx.getContext('2d').createLinearGradient(0, 0, 0, 400);
    gradient4.addColorStop(0, 'rgba(16, 185, 129, 1)');
    gradient4.addColorStop(1, 'rgba(16, 185, 129, 0.5)');
    
    new Chart(investmentCtx, {
        type: 'bar',
        data: {
            labels: ['基础设施', '无人机设备', '软件系统', '运营启动'],
            datasets: [{
                label: '投资金额 (万元)',
                data: [120, 80, 40, 60],
                backgroundColor: [gradient1, gradient2, gradient3, gradient4],
                borderColor: [
                    'rgba(196, 30, 58, 1)',
                    'rgba(212, 175, 55, 1)',
                    'rgba(30, 64, 175, 1)',
                    'rgba(16, 185, 129, 1)'
                ],
                borderWidth: 3,
                borderRadius: 10,
                hoverBackgroundColor: [
                    'rgba(196, 30, 58, 1)',
                    'rgba(212, 175, 55, 1)',
                    'rgba(30, 64, 175, 1)',
                    'rgba(16, 185, 129, 1)'
                ],
                hoverBorderWidth: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: {
                duration: 2500,
                easing: 'easeInOutBounce',
                onProgress: function(animation) {
                    const progress = animation.currentStep / animation.numSteps;
                    investmentCtx.style.transform = `perspective(1000px) rotateX(${progress * 10}deg)`;
                },
                onComplete: function() {
                    investmentCtx.style.transform = 'perspective(1000px) rotateX(0deg)';
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '金额 (万元)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        color: '#1e40af'
                    },
                    grid: {
                        color: 'rgba(79, 70, 229, 0.1)',
                        lineWidth: 2
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    padding: 15,
                    titleFont: {
                        size: 15,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 14
                    },
                    borderColor: 'rgba(79, 70, 229, 0.5)',
                    borderWidth: 2
                }
            }
        }
    });
}

// Revenue Forecast Line Chart
const revenueCtx = document.getElementById('revenueChart');
if (revenueCtx) {
    const gradient1 = revenueCtx.getContext('2d').createLinearGradient(0, 0, 0, 400);
    gradient1.addColorStop(0, 'rgba(196, 30, 58, 0.4)');
    gradient1.addColorStop(1, 'rgba(196, 30, 58, 0.05)');
    
    const gradient2 = revenueCtx.getContext('2d').createLinearGradient(0, 0, 0, 400);
    gradient2.addColorStop(0, 'rgba(212, 175, 55, 0.4)');
    gradient2.addColorStop(1, 'rgba(212, 175, 55, 0.05)');
    
    new Chart(revenueCtx, {
        type: 'line',
        data: {
            labels: ['2026 Q1', '2026 Q2', '2026 Q3', '2026 Q4', '2027 Q1', '2027 Q2', '2027 Q3', '2027 Q4', '2028 Q1', '2028 Q2', '2028 Q3', '2028 Q4'],
            datasets: [{
                label: '营业收入',
                data: [500, 800, 1200, 1800, 2200, 2600, 2900, 3200, 3400, 3500, 3600, 3700],
                borderColor: 'rgba(196, 30, 58, 1)',
                backgroundColor: gradient1,
                tension: 0.4,
                fill: true,
                borderWidth: 4,
                pointRadius: 6,
                pointHoverRadius: 10,
                pointBackgroundColor: 'rgba(196, 30, 58, 1)',
                pointBorderColor: '#fff',
                pointBorderWidth: 3,
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(196, 30, 58, 1)',
                pointHoverBorderWidth: 4
            }, {
                label: '净利润',
                data: [100, 200, 400, 700, 1000, 1300, 1600, 1900, 2100, 2300, 2500, 2700],
                borderColor: 'rgba(212, 175, 55, 1)',
                backgroundColor: gradient2,
                tension: 0.4,
                fill: true,
                borderWidth: 4,
                pointRadius: 6,
                pointHoverRadius: 10,
                pointBackgroundColor: 'rgba(212, 175, 55, 1)',
                pointBorderColor: '#fff',
                pointBorderWidth: 3,
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(212, 175, 55, 1)',
                pointHoverBorderWidth: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: {
                duration: 3000,
                easing: 'easeInOutCubic',
                onProgress: function(animation) {
                    const progress = animation.currentStep / animation.numSteps;
                    revenueCtx.style.transform = `perspective(1000px) rotateY(${Math.sin(progress * Math.PI) * 5}deg)`;
                },
                onComplete: function() {
                    revenueCtx.style.transform = 'perspective(1000px) rotateY(0deg)';
                }
            },
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '金额 (万元)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        color: '#1e40af'
                    },
                    grid: {
                        color: 'rgba(79, 70, 229, 0.1)',
                        lineWidth: 2
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 11,
                            weight: 'bold'
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        padding: 20,
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    padding: 15,
                    titleFont: {
                        size: 15,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 14
                    },
                    borderColor: 'rgba(79, 70, 229, 0.5)',
                    borderWidth: 2
                }
            }
        }
    });
}

// Pilot Revenue Line Chart - 试点三个月收入来源趋势
document.addEventListener('DOMContentLoaded', function() {
    const pilotRevenueCtx = document.getElementById('pilotRevenueChart');
    if (!pilotRevenueCtx) {
        console.error('pilotRevenueChart canvas not found');
        return;
    }
    
    console.log('Initializing Pilot Revenue Chart...');
    
    const ctx = pilotRevenueCtx.getContext('2d');
    
    // 创建渐变
    const gradient1 = ctx.createLinearGradient(0, 0, 0, 300);
    gradient1.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
    gradient1.addColorStop(1, 'rgba(59, 130, 246, 0.05)');
    
    const gradient2 = ctx.createLinearGradient(0, 0, 0, 300);
    gradient2.addColorStop(0, 'rgba(245, 158, 11, 0.5)');
    gradient2.addColorStop(1, 'rgba(245, 158, 11, 0.05)');
    
    const gradient3 = ctx.createLinearGradient(0, 0, 0, 300);
    gradient3.addColorStop(0, 'rgba(16, 185, 129, 0.5)');
    gradient3.addColorStop(1, 'rgba(16, 185, 129, 0.05)');
    
    try {
        new Chart(pilotRevenueCtx, {
            type: 'line',
            data: {
                labels: ['第1周', '第2周', '第3周', '第4周', '第5周', '第6周', '第7周', '第8周', '第9周', '第10周', '第11周', '第12周'],
                datasets: [{
                    label: '共享旅拍',
                    data: [0.5, 0.8, 1.2, 1.8, 2.5, 3.0, 3.3, 3.5, 3.6, 3.6, 3.6, 3.6],
                    borderColor: '#3b82f6',
                    backgroundColor: gradient1,
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#3b82f6',
                    pointHoverBorderWidth: 3
                }, {
                    label: '无人零售',
                    data: [0.2, 0.3, 0.5, 0.7, 0.9, 1.1, 1.2, 1.3, 1.35, 1.35, 1.35, 1.35],
                    borderColor: '#f59e0b',
                    backgroundColor: gradient2,
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointBackgroundColor: '#f59e0b',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#f59e0b',
                    pointHoverBorderWidth: 3
                }, {
                    label: '巡检服务',
                    data: [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.0, 5.0, 5.0],
                    borderColor: '#10b981',
                    backgroundColor: gradient3,
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#10b981',
                    pointHoverBorderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                animation: {
                    duration: 2500,
                    easing: 'easeInOutCubic'
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '收入 (万元)',
                            font: {
                                size: 14,
                                weight: 'bold'
                            },
                            color: '#1e40af'
                        },
                        grid: {
                            color: 'rgba(59, 130, 246, 0.1)',
                            lineWidth: 1
                        },
                        ticks: {
                            callback: function(value) {
                                return value + '万';
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                size: 11,
                                weight: 'bold'
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        padding: 15,
                        titleFont: {
                            size: 15,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 14
                        },
                        borderColor: 'rgba(59, 130, 246, 0.5)',
                        borderWidth: 2,
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.y + '万元';
                            },
                            footer: function(tooltipItems) {
                                let sum = 0;
                                tooltipItems.forEach(function(tooltipItem) {
                                    sum += tooltipItem.parsed.y;
                                });
                                return '总计: ' + sum.toFixed(2) + '万元';
                            }
                        }
                    }
                }
            }
        });
        
        console.log('Pilot Revenue Chart initialized successfully!');
    } catch (error) {
        console.error('Error initializing Pilot Revenue Chart:', error);
    }
});

// Radar Chart for Feasibility Assessment
const radarCtx = document.getElementById('radarChart');
if (radarCtx) {
    new Chart(radarCtx, {
        type: 'radar',
        data: {
            labels: ['技术可行性', '经济可行性', '政策支持', '市场需求', '文化适配', '环境影响'],
            datasets: [{
                label: '评估得分',
                data: [85, 90, 95, 88, 75, 80],
                backgroundColor: 'rgba(196, 30, 58, 0.4)',
                borderColor: 'rgba(196, 30, 58, 1)',
                pointBackgroundColor: 'rgba(196, 30, 58, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(196, 30, 58, 1)',
                borderWidth: 4,
                pointRadius: 7,
                pointHoverRadius: 10,
                pointBorderWidth: 3,
                pointHoverBorderWidth: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: {
                duration: 2800,
                easing: 'easeInOutElastic',
                onProgress: function(animation) {
                    const progress = animation.currentStep / animation.numSteps;
                    radarCtx.style.transform = `perspective(1000px) rotateY(${Math.sin(progress * Math.PI * 2) * 8}deg) rotateX(${Math.cos(progress * Math.PI * 2) * 5}deg)`;
                },
                onComplete: function() {
                    radarCtx.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg)';
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        stepSize: 20,
                        font: {
                            size: 12,
                            weight: 'bold'
                        },
                        backdropColor: 'rgba(255, 255, 255, 0.8)',
                        backdropPadding: 4
                    },
                    pointLabels: {
                        font: {
                            size: 13,
                            weight: 'bold'
                        },
                        color: '#c41e3a'
                    },
                    grid: {
                        color: 'rgba(196, 30, 58, 0.2)',
                        lineWidth: 2
                    },
                    angleLines: {
                        color: 'rgba(196, 30, 58, 0.2)',
                        lineWidth: 2
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    padding: 15,
                    titleFont: {
                        size: 15,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 14
                    },
                    borderColor: 'rgba(196, 30, 58, 0.5)',
                    borderWidth: 2,
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.parsed.r + '分';
                        }
                    }
                }
            }
        }
    });
}

// Header scroll effect and progress bar - 使用节流优化
let lastScroll = 0;
let scrollEndTimer;
const header = document.getElementById('header');
const progressBar = document.getElementById('scrollProgressBar');
const scrollProgress = document.querySelector('.scroll-progress');

const handleScroll = throttle(() => {
    const currentScroll = window.pageYOffset;
    
    // Header样式变化
    if (currentScroll > 100) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
    
    // 显示滚动进度条
    if (scrollProgress) {
        scrollProgress.classList.add('visible');
    }
    
    // 更新滚动进度条
    const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (currentScroll / windowHeight) * 100;
    if (progressBar) {
        progressBar.style.width = scrolled + '%';
    }
    
    // 清除之前的定时器
    clearTimeout(scrollEndTimer);
    
    // 滚动停止1.5秒后隐藏进度条
    scrollEndTimer = setTimeout(() => {
        if (scrollProgress) {
            scrollProgress.classList.remove('visible');
        }
    }, 1500);
    
    lastScroll = currentScroll;
}, 16); // 约60fps

window.addEventListener('scroll', handleScroll, { passive: true });

// Scroll Animation Observer
const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            // Add animation class based on data attribute
            const animationType = entry.target.getAttribute('data-animation');
            if (animationType) {
                entry.target.classList.add(animationType);
            }
        }
    });
}, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
});

// Observe all cards and sections for scroll animations
document.addEventListener('DOMContentLoaded', () => {
    // Add animation attributes to elements
    document.querySelectorAll('.overview-card').forEach((card, index) => {
        card.setAttribute('data-animation', index % 2 === 0 ? 'slide-in-left' : 'slide-in-right');
        scrollObserver.observe(card);
    });
    
    document.querySelectorAll('.scenery-card').forEach((card) => {
        card.setAttribute('data-animation', 'scale-in');
        scrollObserver.observe(card);
    });
    
    document.querySelectorAll('.app-card').forEach((card, index) => {
        card.setAttribute('data-animation', index % 3 === 0 ? 'fade-in' : (index % 3 === 1 ? 'slide-in-left' : 'slide-in-right'));
        scrollObserver.observe(card);
    });
    
    document.querySelectorAll('.terminal-card').forEach((card) => {
        card.setAttribute('data-animation', 'scale-in');
        scrollObserver.observe(card);
    });
    
    document.querySelectorAll('.milestone-card').forEach((card) => {
        card.setAttribute('data-animation', 'scale-in');
        scrollObserver.observe(card);
    });
    
    document.querySelectorAll('.timeline-item').forEach((item) => {
        item.setAttribute('data-animation', 'slide-in-left');
        scrollObserver.observe(item);
    });
    
    document.querySelectorAll('.chart-container').forEach((chart) => {
        chart.setAttribute('data-animation', 'fade-in');
        scrollObserver.observe(chart);
    });
    
    // Enhanced card interactions - 3D effect - 强制版本
    setTimeout(() => {
        const allCards = document.querySelectorAll('.overview-card, .app-card, .milestone-card');
        console.log('=== 3D 动画初始化 ===');
        console.log('找到卡片总数:', allCards.length);
        console.log('app-card 数量:', document.querySelectorAll('.app-card').length);
        
        allCards.forEach((card, index) => {
            // 强制设置样式
            card.style.transformStyle = 'preserve-3d';
            card.style.willChange = 'transform';
            
            // 移除可能存在的旧事件监听器
            const newCard = card.cloneNode(true);
            card.parentNode.replaceChild(newCard, card);
            
            newCard.addEventListener('mouseenter', function(e) {
                console.log('鼠标进入卡片', index + 1);
                this.style.transition = 'box-shadow 0.3s ease';
            });
            
            newCard.addEventListener('mouseleave', function(e) {
                console.log('鼠标离开卡片', index + 1);
                this.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0) scale(1)';
                this.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease';
            });
            
            newCard.addEventListener('mousemove', function(e) {
                const rect = this.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                const rotateX = ((y - centerY) / centerY) * 15;  // 增加旋转幅度
                const rotateY = ((centerX - x) / centerX) * 15;
                
                this.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px) scale(1.02)`;
                this.style.transition = 'none';
            });
        });
        
        console.log('✅ 3D 动画初始化完成');
    }, 500);  // 延迟 500ms 确保 DOM 完全加载
    
    console.log('卡片 3D 动画脚本已加载');
});

// Page Loading Animation - 优化加载体验
window.addEventListener('DOMContentLoaded', () => {
    // DOM加载完成后立即开始准备
    const loader = document.querySelector('.page-loader');
    
    // 确保最小显示时间，避免闪烁
    const minDisplayTime = 500;
    const startTime = Date.now();
    
    window.addEventListener('load', () => {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
        
        setTimeout(() => {
            if (loader) {
                loader.classList.add('hidden');
                // 移除will-change以释放资源
                setTimeout(() => {
                    document.querySelectorAll('[style*="will-change"]').forEach(el => {
                        if (el.style.willChange) {
                            el.style.willChange = 'auto';
                        }
                    });
                }, 1000);
            }
        }, remainingTime);
    });
});

// Parallax effect for hero section - 使用requestAnimationFrame优化
let ticking = false;
let lastKnownScrollPosition = 0;

function updateParallax(scrollPos) {
    const hero = document.querySelector('.hero');
    if (hero) {
        const parallax = scrollPos * 0.5;
        hero.style.transform = `translateY(${parallax}px)`;
    }
    ticking = false;
}

window.addEventListener('scroll', () => {
    lastKnownScrollPosition = window.pageYOffset;
    
    if (!ticking) {
        window.requestAnimationFrame(() => {
            updateParallax(lastKnownScrollPosition);
        });
        ticking = true;
    }
}, { passive: true });

console.log('迪庆智慧文旅低空经济方案网站已加载完成');

// Hero背景图轮播 - 平滑淡入淡出效果
(function() {
    const heroSection = document.getElementById('hero');
    if (!heroSection) return;
    
    // 背景图片数组
    const heroImages = [
        'images/松赞林寺-1.jpeg',
        'images/松赞林寺-2.png',
        'images/松赞林寺-3.jpeg',
        'images/松赞林寺-4.jpeg',
        'images/松赞林寺-5.png',
        'images/独克宗-1.avif',
        'images/长江第一湾.avif',
        'images/小中甸-1.avif',
        'images/纳帕海-4.avif'
    ];
    
    // 随机选择起始图片
    let currentIndex = Math.floor(Math.random() * heroImages.length);
    
    // 创建两个背景层用于淡入淡出
    const bgLayer1 = document.createElement('div');
    const bgLayer2 = document.createElement('div');
    
    bgLayer1.className = 'hero-bg-layer active';
    bgLayer2.className = 'hero-bg-layer';
    
    // 设置初始背景
    bgLayer1.style.backgroundImage = `url('${heroImages[currentIndex]}')`;
    
    // 插入到hero section的最前面
    heroSection.insertBefore(bgLayer1, heroSection.firstChild);
    heroSection.insertBefore(bgLayer2, heroSection.firstChild);
    
    let isLayer1Active = true;
    
    // 切换背景图片
    function changeHeroBackground() {
        currentIndex = (currentIndex + 1) % heroImages.length;
        const newImage = heroImages[currentIndex];
        
        if (isLayer1Active) {
            // 在layer2上加载新图片
            bgLayer2.style.backgroundImage = `url('${newImage}')`;
            // 淡入layer2
            bgLayer2.classList.add('active');
            // 淡出layer1
            setTimeout(() => {
                bgLayer1.classList.remove('active');
            }, 50);
        } else {
            // 在layer1上加载新图片
            bgLayer1.style.backgroundImage = `url('${newImage}')`;
            // 淡入layer1
            bgLayer1.classList.add('active');
            // 淡出layer2
            setTimeout(() => {
                bgLayer2.classList.remove('active');
            }, 50);
        }
        
        isLayer1Active = !isLayer1Active;
    }
    
    // 每10秒切换一次
    setInterval(changeHeroBackground, 10000);
    
    console.log(`Hero背景图轮播已启动，起始图片：${heroImages[currentIndex]}，每10秒平滑切换一次`);
})();
