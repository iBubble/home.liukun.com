// 全局变量
let nodes = [];
let checkingInProgress = false;
let currentFilter = 'all'; // 当前筛选的国家
let currentSort = 'latency'; // 当前排序方式
let availableCountries = new Set(); // 可用的国家列表
let autoRefreshInterval = null; // 自动刷新定时器

// 国家代码映射表
const countryMap = {
    'US': '美国', 'HK': '香港', 'JP': '日本', 'SG': '新加坡',
    'TW': '台湾', 'KR': '韩国', 'UK': '英国', 'GB': '英国', 'DE': '德国',
    'FR': '法国', 'CA': '加拿大', 'AU': '澳大利亚', 'NL': '荷兰',
    'RU': '俄罗斯', 'IN': '印度', 'TH': '泰国', 'VN': '越南',
    'PH': '菲律宾', 'ID': '印度尼西亚', 'MY': '马来西亚',
    'BR': '巴西', 'AR': '阿根廷', 'MX': '墨西哥',
    'IT': '意大利', 'ES': '西班牙', 'SE': '瑞典', 'NO': '挪威',
    'FI': '芬兰', 'DK': '丹麦', 'PL': '波兰', 'CZ': '捷克',
    'TR': '土耳其', 'IL': '以色列', 'AE': '阿联酋', 'SA': '沙特',
    'ZA': '南非', 'EG': '埃及', 'NG': '尼日利亚',
    'NZ': '新西兰', 'IS': '冰岛', 'IE': '爱尔兰', 'AT': '奥地利',
    'CH': '瑞士', 'BE': '比利时', 'PT': '葡萄牙', 'GR': '希腊',
    'AZ': '阿塞拜疆', 'UA': '乌克兰', 'RO': '罗马尼亚'
};

// Emoji国旗到国家的映射
const flagToCountry = {
    '🇺🇸': '美国', '🇭🇰': '香港', '🇯🇵': '日本', '🇸🇬': '新加坡',
    '🇹🇼': '台湾', '🇰🇷': '韩国', '🇬🇧': '英国', '🇩🇪': '德国',
    '🇫🇷': '法国', '🇨🇦': '加拿大', '🇦🇺': '澳大利亚', '🇳🇱': '荷兰',
    '🇷🇺': '俄罗斯', '🇮🇳': '印度', '🇹🇭': '泰国', '🇻🇳': '越南',
    '🇵🇭': '菲律宾', '🇮🇩': '印度尼西亚', '🇲🇾': '马来西亚',
    '🇧🇷': '巴西', '🇦🇷': '阿根廷', '🇲🇽': '墨西哥',
    '🇮🇹': '意大利', '🇪🇸': '西班牙', '🇸🇪': '瑞典', '🇳🇴': '挪威',
    '🇫🇮': '芬兰', '🇩🇰': '丹麦', '🇵🇱': '波兰', '🇨🇿': '捷克',
    '🇹🇷': '土耳其', '🇮🇱': '以色列', '🇦🇪': '阿联酋', '🇸🇦': '沙特',
    '🇿🇦': '南非', '🇪🇬': '埃及', '🇳🇬': '尼日利亚',
    '🇳🇿': '新西兰', '🇮🇸': '冰岛', '🇮🇪': '爱尔兰', '🇦🇹': '奥地利',
    '🇨🇭': '瑞士', '🇧🇪': '比利时', '🇵🇹': '葡萄牙', '🇬🇷': '希腊',
    '🇦🇿': '阿塞拜疆', '🇺🇦': '乌克兰', '🇷🇴': '罗马尼亚'
};

// 从节点名称提取国家/地区
function extractCountryFromName(name) {
    if (!name) return '其他';
    
    // 1. 检查emoji国旗 (优先级最高)
    for (const [flag, country] of Object.entries(flagToCountry)) {
        if (name.includes(flag)) {
            return country;
        }
    }
    
    // 2. 检查中文国家名 (优先于代码,避免误识别)
    for (const country of Object.values(countryMap)) {
        if (name.includes(country)) {
            return country;
        }
    }
    
    // 3. 检查国家代码 (如: US, HK, JP等) - 支持多种格式
    // 格式: US-xxx, US_xxx, US xxx, [US], (US)
    const codePatterns = [
        /^([A-Z]{2})[-_\s]/,           // US-xxx, US_xxx, US xxx
        /[-_\s]([A-Z]{2})[-_\s]/,      // xxx-US-xxx
        /[-_\s]([A-Z]{2})$/,           // xxx-US
        /\[([A-Z]{2})\]/,              // [US]
        /\(([A-Z]{2})\)/               // (US)
    ];
    
    for (const pattern of codePatterns) {
        const match = name.match(pattern);
        if (match && countryMap[match[1]]) {
            return countryMap[match[1]];
        }
    }
    
    // 4. 检查常见的国家名称模式 (英文)
    const patterns = {
        '美国': /United States|USA/i,
        '香港': /Hong Kong|HongKong/i,
        '日本': /Japan/i,
        '新加坡': /Singapore/i,
        '台湾': /Taiwan/i,
        '韩国': /Korea/i,
        '英国': /United Kingdom|Britain/i,
        '德国': /Germany/i,
        '法国': /France/i,
        '加拿大': /Canada/i,
        '澳大利亚': /Australia/i,
        '荷兰': /Netherlands/i,
        '俄罗斯': /Russia/i,
        '印度': /India/i,
        '越南': /Vietnam/i,
        '泰国': /Thailand/i,
        '菲律宾': /Philippines/i,
        '印度尼西亚': /Indonesia/i,
        '马来西亚': /Malaysia/i
    };
    
    for (const [country, pattern] of Object.entries(patterns)) {
        if (pattern.test(name)) {
            return country;
        }
    }
    
    return '其他';
}

// 立即执行 - 确认JS已加载
console.log('=== NodeLocalChecker JS 已加载 ===');
console.log('当前时间:', new Date().toLocaleString());

// 页面加载完成
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== DOM 加载完成 ===');
    initUpload();
    checkClashStatus();
    loadNodesFromDatabase(); // 从数据库加载节点
    // startAutoRefresh(); // 已禁用自动刷新功能
    
    // 添加按钮点击波纹效果
    document.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', function(e) {
            if (window.CyberpunkAnimations) {
                CyberpunkAnimations.buttonRipple(this, e);
            }
        });
    });
});

// 页面卸载时停止自动刷新
window.addEventListener('beforeunload', function() {
    stopAutoRefresh();
});

// 检查 Clash 状态
async function checkClashStatus() {
    try {
        const response = await fetch('api/check_clash.php');
        const result = await response.json();
        
        const statusEl = document.getElementById('clashStatus');
        if (result.available) {
            statusEl.innerHTML = `
                <span style="color: #0f0;">✓ Clash 核心已安装</span>
            `;
        } else {
            statusEl.innerHTML = `
                <span style="color: #f80;">⚠ Clash 未安装</span>
                <span style="color: #888; margin-left: 10px;">使用简单TCP测试（准确度较低）</span>
                <a href="INSTALL_CLASH.md" target="_blank" style="color: #0ff; margin-left: 10px;">查看安装指南</a>
            `;
        }
    } catch (error) {
        console.error('检查 Clash 状态失败:', error);
    }
}

// 从数据库加载节点
async function loadNodesFromDatabase() {
    try {
        showLoading('正在加载节点列表...');
        
        const response = await fetch('api/nodes.php?action=list');
        const result = await response.json();
        
        if (result.success && result.nodes.length > 0) {
            nodes = result.nodes;
            updateCountryFilter(); // 更新国家筛选器
            sortNodes(); // 应用排序
            showStats();
            document.getElementById('controls').style.display = 'flex';
            document.getElementById('statsBar').style.display = 'flex';
            
            console.log(`✓ 从数据库加载了 ${nodes.length} 个节点`);
        } else {
            console.log('数据库中暂无节点');
        }
    } catch (error) {
        console.error('加载节点失败:', error);
    } finally {
        hideLoading();
    }
}

// 初始化上传功能
function initUpload() {
    const uploadSection = document.getElementById('uploadSection');
    const fileInput = document.getElementById('fileInput');

    // 拖拽上传
    uploadSection.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadSection.classList.add('dragover');
    });

    uploadSection.addEventListener('dragleave', () => {
        uploadSection.classList.remove('dragover');
    });

    uploadSection.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadSection.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    // 文件选择
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });
}

// 从机场聚合器导入配置
async function importFromAggregator() {
    const importBtn = document.getElementById('importBtn');
    const originalText = importBtn.textContent;
    
    console.log('开始导入机场聚合器配置...');
    
    try {
        importBtn.disabled = true;
        importBtn.textContent = '正在导入...';
        showLoading('正在从机场聚合器下载配置...');
        
        console.log('正在下载: https://us.liukun.com:8443/Projects/Aggregator/Aggregator.yaml');
        
        // 下载 YAML 文件
        const response = await fetch('https://us.liukun.com:8443/Projects/Aggregator/Aggregator.yaml', {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache'
        });
        
        console.log('响应状态:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error('下载失败: ' + response.statusText);
        }
        
        const yamlContent = await response.text();
        console.log('下载成功，文件大小:', yamlContent.length, '字节');
        
        // 创建 Blob 并处理
        const blob = new Blob([yamlContent], { type: 'text/yaml' });
        const file = new File([blob], 'Aggregator.yaml', { type: 'text/yaml' });
        
        console.log('开始解析配置...');
        
        // 使用现有的文件处理函数
        await handleFileContent(file, yamlContent);
        
        console.log('导入完成！');
        importBtn.textContent = '✓ 导入成功';
        setTimeout(() => {
            importBtn.textContent = originalText;
            importBtn.disabled = false;
        }, 2000);
        
    } catch (error) {
        console.error('导入失败:', error);
        if (window.CyberpunkAnimations) {
            CyberpunkAnimations.showNotification(`✗ 导入失败: ${error.message}`, 'error');
        }
        importBtn.textContent = originalText;
        importBtn.disabled = false;
    } finally {
        hideLoading();
    }
}

// 处理文件
async function handleFile(file) {
    if (!file.name.endsWith('.yaml') && !file.name.endsWith('.yml')) {
        if (window.CyberpunkAnimations) {
            CyberpunkAnimations.showNotification('请上传 YAML 格式的配置文件', 'warning');
        }
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        const yamlContent = e.target.result;
        await handleFileContent(file, yamlContent);
    };
    reader.readAsText(file);
}

// 处理文件内容（统一处理本地上传和远程导入）
async function handleFileContent(file, yamlContent) {
    const formData = new FormData();
    const blob = new Blob([yamlContent], { type: 'text/yaml' });
    formData.append('file', blob, file.name);

    try {
        showLoading('正在解析配置文件...');
        
        const response = await fetch('api/parse.php', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        
        if (result.success) {
            const newNodes = result.nodes;
            
            // 合并到数据库
            showLoading('正在合并节点...');
            const mergeResponse = await fetch('api/nodes.php?action=merge', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    nodes: newNodes,
                    source: file.name
                })
            });
            
            const mergeResult = await mergeResponse.json();
            
            if (mergeResult.success) {
                const stats = mergeResult.stats;
                
                // 重新加载节点列表
                await loadNodesFromDatabase();
                
                // 显示合并结果
                const message = `节点合并完成！本次导入: ${stats.total} 个，新增: ${stats.added} 个，更新: ${stats.updated} 个，未变: ${stats.unchanged} 个。数据库总计: ${nodes.length} 个节点`;
                
                console.log(message);
                
                if (window.CyberpunkAnimations) {
                    CyberpunkAnimations.showNotification(`✓ 合并完成: +${stats.added} 个新节点`, 'success');
                }
                
                // 自动全选并开始检测
                selectAll();
                setTimeout(() => {
                    startCheck();
                }, 500);
            } else {
                if (window.CyberpunkAnimations) {
                    CyberpunkAnimations.showNotification(`✗ 合并失败: ${mergeResult.error}`, 'error');
                }
            }
        } else {
            if (window.CyberpunkAnimations) {
                CyberpunkAnimations.showNotification(`✗ 解析失败: ${result.error}`, 'error');
            }
        }
    } catch (error) {
        if (window.CyberpunkAnimations) {
            CyberpunkAnimations.showNotification(`✗ 处理失败: ${error.message}`, 'error');
        }
    } finally {
        hideLoading();
    }
}

// 显示节点列表
function displayNodes() {
    const container = document.getElementById('nodesContainer');
    
    // 应用筛选
    let filteredNodes = nodes;
    if (currentFilter !== 'all') {
        filteredNodes = nodes.filter(node => {
            const country = extractCountryFromName(node.name);
            return country === currentFilter;
        });
    }
    
    if (filteredNodes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>未找到节点</h3>
                <p>${currentFilter !== 'all' ? `没有来自"${currentFilter}"的节点` : '配置文件中没有可用的节点信息'}</p>
            </div>
        `;
        return;
    }

    let html = `
        <table class="nodes-table">
            <thead>
                <tr>
                    <th><input type="checkbox" class="checkbox" id="selectAllCheckbox" onchange="toggleSelectAll()"></th>
                    <th>节点名称</th>
                    <th>类型</th>
                    <th>服务器</th>
                    <th>端口</th>
                    <th>状态</th>
                    <th>延迟</th>
                    <th>真实IP</th>
                    <th>IP纯净度</th>
                </tr>
            </thead>
            <tbody>
    `;

    filteredNodes.forEach((node, index) => {
        // 找到节点在原数组中的索引
        const originalIndex = nodes.indexOf(node);
        
        // 根据节点的检测历史显示状态
        let statusBadge = '';
        let latencyText = '-';
        let realIpText = '-';
        let purityHtml = '-';
        
        // 检查节点是否已检测（available 为 0 或 1）
        if (node.available === 1) {
            // 可用节点
            statusBadge = `<span class="status-badge status-success" id="status-${originalIndex}">可用</span>`;
            latencyText = node.latency || '-';
            realIpText = node.real_ip || '-';
            
            // 显示IP纯净度
            if (node.purity && node.purity.score !== undefined) {
                const score = node.purity.score;
                const level = node.purity.level;
                const type = node.purity.type || '未知';
                
                let color = '#888';
                if (score >= 90) color = '#0f0';
                else if (score >= 75) color = '#0ff';
                else if (score >= 60) color = '#ff0';
                else if (score >= 40) color = '#f80';
                else color = '#f00';
                
                purityHtml = `
                    <span style="color: ${color}; font-weight: bold;">${score}分</span>
                    <span style="color: #888; font-size: 11px;"> (${level})</span>
                    <br>
                    <span style="color: #888; font-size: 10px;">${type}</span>
                `;
            } else if (node.ip_purity_score !== null && node.ip_purity_score !== undefined) {
                // 兼容旧数据格式
                const score = node.ip_purity_score;
                let level = '未知';
                if (score >= 90) level = '优秀';
                else if (score >= 75) level = '良好';
                else if (score >= 60) level = '一般';
                else level = '较差';
                
                let color = '#888';
                if (score >= 90) color = '#0f0';
                else if (score >= 75) color = '#0ff';
                else if (score >= 60) color = '#ff0';
                else if (score >= 40) color = '#f80';
                else color = '#f00';
                
                purityHtml = `
                    <span style="color: ${color}; font-weight: bold;">${score}分</span>
                    <span style="color: #888; font-size: 11px;"> (${level})</span>
                `;
            }
        } else if (node.available === 0) {
            // 不可用节点
            statusBadge = `<span class="status-badge status-failed" id="status-${originalIndex}">不可用</span>`;
        } else {
            // 未检测过（available 为 null 或 undefined）
            statusBadge = `<span class="status-badge status-pending" id="status-${originalIndex}">待检测</span>`;
        }
        
        html += `
            <tr>
                <td><input type="checkbox" class="checkbox node-checkbox" data-index="${originalIndex}" onchange="updateSelectedCount()"></td>
                <td>${escapeHtml(node.name)}</td>
                <td>${node.type}</td>
                <td>${node.server}</td>
                <td>${node.port}</td>
                <td>${statusBadge}</td>
                <td id="latency-${originalIndex}">${latencyText}</td>
                <td id="real-ip-${originalIndex}">${realIpText}</td>
                <td id="purity-${originalIndex}">${purityHtml}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    container.innerHTML = html;
    
    // 初始化按钮状态
    document.getElementById('exportBtn').disabled = true;
    document.getElementById('startCheckBtn').disabled = true;
}

// 显示统计信息
function showStats() {
    const totalEl = document.getElementById('totalNodes');
    const checkedEl = document.getElementById('checkedNodes');
    const availableEl = document.getElementById('availableNodes');
    const selectedEl = document.getElementById('selectedNodes');
    
    // 统计已检测和可用节点
    let checkedCount = 0;
    let availableCount = 0;
    
    nodes.forEach(node => {
        if (node.last_check_time) {
            checkedCount++;
            if (node.available === 1) {
                availableCount++;
            }
        }
    });
    
    // 使用数字滚动动画
    if (window.CyberpunkAnimations) {
        CyberpunkAnimations.animateNumber(totalEl, 0, nodes.length, 800);
        CyberpunkAnimations.animateNumber(checkedEl, 0, checkedCount, 800);
        CyberpunkAnimations.animateNumber(availableEl, 0, availableCount, 800);
        CyberpunkAnimations.animateNumber(selectedEl, 0, 0, 800);
    } else {
        totalEl.textContent = nodes.length;
        checkedEl.textContent = checkedCount;
        availableEl.textContent = availableCount;
        selectedEl.textContent = '0';
    }
    
    // 显示通知
    if (window.CyberpunkAnimations) {
        if (checkedCount > 0) {
            CyberpunkAnimations.showNotification(`加载 ${nodes.length} 个节点 (已检测 ${checkedCount} 个)`, 'success');
        } else {
            CyberpunkAnimations.showNotification(`成功解析 ${nodes.length} 个节点`, 'success');
        }
    }
}

// 开始检测选中节点
async function startCheck() {
    if (checkingInProgress) {
        if (window.CyberpunkAnimations) {
            CyberpunkAnimations.showNotification('检测正在进行中...', 'warning');
        }
        return;
    }

    // 获取选中的节点索引
    const selectedIndexes = [];
    document.querySelectorAll('.node-checkbox:checked').forEach(cb => {
        selectedIndexes.push(parseInt(cb.dataset.index));
    });

    if (selectedIndexes.length === 0) {
        if (window.CyberpunkAnimations) {
            CyberpunkAnimations.showNotification('请至少选择一个节点进行检测', 'warning');
        }
        return;
    }

    checkingInProgress = true;
    document.getElementById('startCheckBtn').disabled = true;
    
    // 显示进度弹窗
    showCheckProgressModal(selectedIndexes.length);

    const totalToCheck = selectedIndexes.length;
    const stats = {
        checked: 0,
        available: 0,
        failed: 0
    };

    console.log(`开始并发检测 ${totalToCheck} 个节点...`);
    const startTime = Date.now();

    // 先将所有选中节点状态设置为"检测中"
    selectedIndexes.forEach(index => {
        updateNodeStatus(index, 'checking', '检测中...');
    });

    // 等待一小段时间让UI更新
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 并发控制 - 10个并发
    const CONCURRENT_LIMIT = 10;
    
    // 创建检测任务
    const checkNode = async (index) => {
        const node = nodes[index];
        
        console.log(`[${index}] 开始检测: ${node.name}`);

        try {
            const response = await fetch('api/check.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ node: node })
            });

            const result = await response.json();
            
            console.log(`[${index}] API返回结果:`, result);
            if (result.purity) {
                console.log(`[${index}] IP纯净度数据:`, result.purity);
            }
            
            let isAvailable = false;
            
            if (result.success) {
                // 更新 nodes 数组中的数据
                node.available = result.available ? 1 : 0;
                node.latency = result.latency || null;
                node.real_ip = result.real_ip || null;
                node.last_check_time = new Date().toISOString().slice(0, 19).replace('T', ' ');
                
                // 保存纯净度数据
                if (result.purity && result.purity.score !== undefined) {
                    node.ip_purity_score = result.purity.score;
                    node.purity = result.purity;
                } else {
                    node.ip_purity_score = null;
                    node.purity = null;
                }

                if (result.available) {
                    isAvailable = true;
                    updateNodeStatus(index, 'success', '可用', result.latency, result.real_ip, result.purity);
                } else {
                    updateNodeStatus(index, 'failed', '不可用', '-', '-', null);
                }
                
                // 保存检测结果到数据库
                const saveData = {
                    available: result.available,
                    latency: result.latency,
                    real_ip: result.real_ip,
                    purity: result.purity
                };
                console.log(`[${index}] 准备保存检测结果:`, saveData);
                const saved = await saveCheckResult(node.node_hash, saveData);
                console.log(`[${index}] 保存结果: ${saved ? '成功' : '失败'}`);
            } else {
                // 检测失败也要保存结果
                node.available = 0;
                node.last_check_time = new Date().toISOString().slice(0, 19).replace('T', ' ');
                updateNodeStatus(index, 'failed', '检测失败', '-', '-', null);
                
                // 保存失败结果
                const saveData = {
                    available: false,
                    latency: null,
                    real_ip: null,
                    purity: null
                };
                console.log(`[${index}] 准备保存失败结果:`, saveData);
                const saved = await saveCheckResult(node.node_hash, saveData);
                console.log(`[${index}] 保存结果: ${saved ? '成功' : '失败'}`);
            }
            
            console.log(`[${index}] 检测完成: ${node.name} - ${isAvailable ? '可用' : '不可用'}`);
            return { success: true, available: isAvailable };
        } catch (error) {
            node.available = false;
            updateNodeStatus(index, 'failed', '错误', '-', '-', null);
            console.error(`[${index}] 检测错误: ${node.name}`, error);
            return { success: false, available: false };
        }
    };

    // 并发控制 - 滑动窗口，最多10个并发
    console.log(`使用滑动窗口并发检测，最多 ${CONCURRENT_LIMIT} 个并发...`);
    
    const executing = [];
    const allPromises = [];
    
    for (const index of selectedIndexes) {
        const promise = checkNode(index).then(result => {
            stats.checked++;
            if (result.available) {
                stats.available++;
            } else {
                stats.failed++;
            }
            
            // 更新进度弹窗
            updateCheckProgress(stats.checked, totalToCheck, stats.available, stats.failed, startTime);
            
            // 更新统计栏
            document.getElementById('checkedNodes').textContent = stats.checked;
            document.getElementById('availableNodes').textContent = stats.available;
            
            // 从执行队列中移除
            const execIndex = executing.indexOf(promise);
            if (execIndex > -1) {
                executing.splice(execIndex, 1);
            }
            return result;
        });
        
        allPromises.push(promise);
        executing.push(promise);
        
        // 当达到并发限制时，等待最快完成的一个
        if (executing.length >= CONCURRENT_LIMIT) {
            await Promise.race(executing);
        }
    }
    
    // 等待所有请求完成
    await Promise.all(allPromises);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`检测完成！总耗时: ${duration}秒，平均每个节点: ${(duration / totalToCheck).toFixed(2)}秒`);

    checkingInProgress = false;
    
    // 隐藏进度弹窗
    hideCheckProgressModal();
    
    // 检测完成后自动按延迟排序
    if (currentSort === 'latency') {
        sortNodes();
    }
    
    // 显示完成提示
    console.log(`✓ 检测完成！检测: ${totalToCheck}, 可用: ${stats.available}, 耗时: ${duration}秒`);
    
    if (window.CyberpunkAnimations) {
        CyberpunkAnimations.showNotification(
            `✓ 检测完成: ${stats.available}/${totalToCheck} 可用 (${duration}秒)`,
            'success'
        );
    }
}

// 显示检测进度弹窗
function showCheckProgressModal(total) {
    const overlay = document.getElementById('checkProgressOverlay');
    document.getElementById('progressTotal').textContent = total;
    document.getElementById('progressChecked').textContent = '0';
    document.getElementById('progressAvailable').textContent = '0';
    document.getElementById('progressFailed').textContent = '0';
    document.getElementById('progressPercentage').textContent = '0%';
    document.getElementById('progressBarFill').style.width = '0%';
    document.getElementById('progressETA').textContent = '计算中...';
    overlay.style.display = 'flex';
}

// 更新检测进度
function updateCheckProgress(checked, total, available, failed, startTime) {
    const percent = (checked / total * 100).toFixed(1);
    
    // 更新数字
    document.getElementById('progressChecked').textContent = checked;
    document.getElementById('progressAvailable').textContent = available;
    document.getElementById('progressFailed').textContent = failed;
    document.getElementById('progressPercentage').textContent = percent + '%';
    
    // 更新进度条
    document.getElementById('progressBarFill').style.width = percent + '%';
    
    // 计算预计剩余时间
    const elapsed = (Date.now() - startTime) / 1000;
    const avgTime = elapsed / checked;
    const remaining = (total - checked) * avgTime;
    
    if (remaining > 0) {
        if (remaining < 60) {
            document.getElementById('progressETA').textContent = `${Math.ceil(remaining)}秒`;
        } else {
            const minutes = Math.floor(remaining / 60);
            const seconds = Math.ceil(remaining % 60);
            document.getElementById('progressETA').textContent = `${minutes}分${seconds}秒`;
        }
    } else {
        document.getElementById('progressETA').textContent = '即将完成...';
    }
}

// 隐藏检测进度弹窗
function hideCheckProgressModal() {
    const overlay = document.getElementById('checkProgressOverlay');
    overlay.style.display = 'none';
}

// 保存检测结果到数据库 (带重试机制)
async function saveCheckResult(nodeHash, result, retries = 3) {
    console.log(`[保存] 开始保存检测结果: ${nodeHash}`, result);
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch('api/nodes.php?action=update_check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    node_hash: nodeHash,
                    result: result
                })
            });
            
            // 检查HTTP状态
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log(`[保存] API响应 (尝试${attempt}/${retries}):`, data);
            
            if (!data.success) {
                throw new Error(data.error || data.message || '未知错误');
            }
            
            console.log(`[保存] ✓ 保存成功: ${nodeHash}`);
            return true;
            
        } catch (error) {
            console.error(`[保存] ✗ 保存失败 (尝试${attempt}/${retries}):`, error.message);
            
            if (attempt < retries) {
                const delay = 1000 * attempt; // 递增延迟: 1s, 2s, 3s
                console.log(`[保存] 等待${delay}ms后重试...`);
                await new Promise(r => setTimeout(r, delay));
            } else {
                console.error(`[保存] ✗✗✗ 最终失败,已重试${retries}次:`, nodeHash);
                
                // 显示用户提示
                if (window.CyberpunkAnimations) {
                    CyberpunkAnimations.showNotification(
                        `节点 ${nodeHash.substring(0, 8)}... 保存失败,请稍后手动保存`,
                        'error'
                    );
                }
                
                return false;
            }
        }
    }
    
    return false;
}

// 更新节点状态
function updateNodeStatus(index, status, text, latency = '-', realIp = '-', purity = null) {
    const statusEl = document.getElementById(`status-${index}`);
    
    // 调试日志
    console.log(`[${index}] updateNodeStatus 调用:`, {
        status, text, latency, realIp, 
        purity: purity,
        purityType: typeof purity
    });
    
    statusEl.className = `status-badge status-${status}`;
    statusEl.textContent = text;
    
    document.getElementById(`latency-${index}`).textContent = latency;
    document.getElementById(`real-ip-${index}`).textContent = realIp || '-';
    
    // 显示IP纯净度信息
    const purityEl = document.getElementById(`purity-${index}`);
    if (purity && purity.score !== undefined) {
        const score = purity.score;
        const level = purity.level;
        const type = purity.type || '未知';
        const location = purity.location || {};
        
        // 根据评分设置颜色
        let color = '#888';
        if (score >= 90) color = '#0f0';
        else if (score >= 75) color = '#0ff';
        else if (score >= 60) color = '#ff0';
        else if (score >= 40) color = '#f80';
        else color = '#f00';
        
        purityEl.innerHTML = `
            <span style="color: ${color}; font-weight: bold;">${score}分</span>
            <span style="color: #888; font-size: 11px;"> (${level})</span>
            <br>
            <span style="color: #888; font-size: 10px;">${type}</span>
            ${location.country ? `<br><span style="color: #888; font-size: 10px;">${location.country}</span>` : ''}
        `;
    } else {
        purityEl.textContent = '-';
    }
    
    // 不再添加每个节点的动画效果，使用统一的进度弹窗
}

// 更新进度
function updateProgress(current, total) {
    const percent = (current / total) * 100;
    const progressFill = document.getElementById('progressFill');
    
    // 使用动画更新进度条
    if (window.CyberpunkAnimations) {
        CyberpunkAnimations.animateProgress(progressFill.parentElement, percent);
    } else {
        progressFill.style.width = percent + '%';
    }
}

// 全选
function selectAll() {
    document.querySelectorAll('.node-checkbox').forEach(cb => cb.checked = true);
    document.getElementById('selectAllCheckbox').checked = true;
    updateSelectedCount();
}

// 取消全选
function selectNone() {
    document.querySelectorAll('.node-checkbox').forEach(cb => cb.checked = false);
    document.getElementById('selectAllCheckbox').checked = false;
    updateSelectedCount();
}

// 选择可用节点
function selectAvailable() {
    document.querySelectorAll('.node-checkbox').forEach(cb => {
        const index = parseInt(cb.dataset.index);
        const node = nodes[index];
        // available 为 1 表示可用
        cb.checked = node.available === 1;
    });
    updateSelectedCount();
}

// 删除所选节点
async function deleteSelectedNodes() {
    // 获取选中的节点
    const selectedIndexes = [];
    const selectedHashes = [];
    
    document.querySelectorAll('.node-checkbox:checked').forEach(cb => {
        const index = parseInt(cb.dataset.index);
        selectedIndexes.push(index);
        selectedHashes.push(nodes[index].node_hash);
    });
    
    if (selectedHashes.length === 0) {
        if (window.CyberpunkAnimations) {
            CyberpunkAnimations.showNotification('请先选择要删除的节点', 'warning');
        } else {
            alert('请先选择要删除的节点');
        }
        return;
    }
    
    // 确认删除
    const confirmed = confirm(`确定要删除选中的 ${selectedHashes.length} 个节点吗？\n\n此操作不可恢复！`);
    if (!confirmed) {
        return;
    }
    
    try {
        showLoading(`正在删除 ${selectedHashes.length} 个节点...`);
        
        // 调用API删除节点
        const response = await fetch('api/nodes.php?action=delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                node_hashes: selectedHashes
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // 从本地数据中删除
            nodes = nodes.filter(node => !selectedHashes.includes(node.node_hash));
            
            // 重新渲染表格
            displayNodes();
            
            // 更新统计信息
            showStats();
            
            // 如果没有节点了，显示上传区域
            if (nodes.length === 0) {
                document.getElementById('controls').style.display = 'none';
                document.getElementById('statsBar').style.display = 'none';
                document.getElementById('uploadSection').style.display = 'block';
                document.getElementById('importSection').style.display = 'block';
            }
            
            // 显示成功提示
            if (window.CyberpunkAnimations) {
                CyberpunkAnimations.showNotification(
                    `✓ 已删除 ${result.deleted} 个节点`,
                    'success'
                );
            }
            
            console.log(`已删除 ${result.deleted} 个节点`);
        } else {
            throw new Error(result.error || result.message || '删除失败');
        }
        
    } catch (error) {
        console.error('删除节点失败:', error);
        if (window.CyberpunkAnimations) {
            CyberpunkAnimations.showNotification(
                `✗ 删除失败: ${error.message}`,
                'error'
            );
        } else {
            alert('删除失败: ' + error.message);
        }
    } finally {
        hideLoading();
    }
}

// 切换全选
function toggleSelectAll() {
    const checked = document.getElementById('selectAllCheckbox').checked;
    document.querySelectorAll('.node-checkbox').forEach(cb => cb.checked = checked);
    updateSelectedCount();
}

// 更新选中数量
function updateSelectedCount() {
    const count = document.querySelectorAll('.node-checkbox:checked').length;
    document.getElementById('selectedNodes').textContent = count;
    
    // 根据选中数量启用/禁用导出按钮和开始检测按钮
    const exportBtn = document.getElementById('exportBtn');
    const startCheckBtn = document.getElementById('startCheckBtn');
    
    if (count > 0) {
        exportBtn.disabled = false;
        startCheckBtn.disabled = false;
    } else {
        exportBtn.disabled = true;
        startCheckBtn.disabled = true;
    }
}

// 导出选中节点
async function exportSelected() {
    const selectedIndexes = [];
    document.querySelectorAll('.node-checkbox:checked').forEach(cb => {
        selectedIndexes.push(parseInt(cb.dataset.index));
    });

    if (selectedIndexes.length === 0) {
        if (window.CyberpunkAnimations) {
            CyberpunkAnimations.showNotification('请至少选择一个节点', 'warning');
        }
        return;
    }

    const selectedNodes = selectedIndexes.map(i => nodes[i]);

    try {
        const response = await fetch('api/export.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nodes: selectedNodes })
        });

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `config_clash_${formatDate()}.yaml`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        if (window.CyberpunkAnimations) {
            CyberpunkAnimations.showNotification(`✓ 导出成功: ${selectedNodes.length} 个节点`, 'success');
        }
    } catch (error) {
        if (window.CyberpunkAnimations) {
            CyberpunkAnimations.showNotification(`✗ 导出失败: ${error.message}`, 'error');
        }
    }
}

// 工具函数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// 批量保存所有已检测的节点
async function batchSaveCheckResults() {
    console.log('=== 开始批量保存检测结果 ===');
    
    const nodesToSave = nodes.filter(node => 
        node.available !== null && 
        node.latency && 
        node.last_check_time
    );
    
    if (nodesToSave.length === 0) {
        console.log('没有需要保存的节点');
        return { success: 0, failed: 0 };
    }
    
    console.log(`找到 ${nodesToSave.length} 个已检测的节点`);
    
    let successCount = 0;
    let failedCount = 0;
    
    for (const node of nodesToSave) {
        const result = {
            available: node.available === 1,
            latency: node.latency,
            real_ip: node.real_ip,
            purity: node.purity
        };
        
        const saved = await saveCheckResult(node.node_hash, result, 2); // 2次重试
        if (saved) {
            successCount++;
        } else {
            failedCount++;
        }
    }
    
    console.log(`批量保存完成: 成功${successCount}, 失败${failedCount}`);
    
    return { success: successCount, failed: failedCount };
}

function showLoading(message) {
    // 创建或更新 loading 提示
    let loadingEl = document.getElementById('loadingOverlay');
    if (!loadingEl) {
        loadingEl = document.createElement('div');
        loadingEl.id = 'loadingOverlay';
        loadingEl.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        `;
        document.body.appendChild(loadingEl);
    }
    loadingEl.innerHTML = `
        <div style="text-align: center; color: #0ff;">
            <div style="font-size: 48px; margin-bottom: 20px;">⏳</div>
            <div style="font-size: 18px;">${message}</div>
        </div>
    `;
    loadingEl.style.display = 'flex';
}

function hideLoading() {
    const loadingEl = document.getElementById('loadingOverlay');
    if (loadingEl) {
        loadingEl.style.display = 'none';
    }
}

// 显示更新历史
async function showUpdateHistory() {
    const modal = document.getElementById('updateHistoryModal');
    const content = document.getElementById('updateHistoryContent');
    
    modal.style.display = 'flex';
    content.innerHTML = '<div class="empty-logs">加载中...</div>';
    
    try {
        const response = await fetch('api/update_logs.php');
        const result = await response.json();
        
        if (result.success && result.logs.length > 0) {
            let html = '';
            
            result.logs.forEach(log => {
                const stats = log.stats || {};
                html += `
                    <div class="update-log-item">
                        <div class="log-time">⏰ ${log.created_at_formatted}</div>
                        <div class="log-source">📦 来源: ${log.source}</div>
                        <div class="log-stats">
                            <div class="log-stat">
                                <div class="log-stat-value">${stats.total || 0}</div>
                                <div class="log-stat-label">总节点</div>
                            </div>
                            <div class="log-stat">
                                <div class="log-stat-value" style="color: #0f0;">${stats.added || 0}</div>
                                <div class="log-stat-label">新增</div>
                            </div>
                            <div class="log-stat">
                                <div class="log-stat-value" style="color: #0ff;">${stats.updated || 0}</div>
                                <div class="log-stat-label">更新</div>
                            </div>
                            <div class="log-stat">
                                <div class="log-stat-value" style="color: #888;">${stats.unchanged || 0}</div>
                                <div class="log-stat-label">未变</div>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            content.innerHTML = html;
        } else {
            content.innerHTML = '<div class="empty-logs">暂无更新记录</div>';
        }
    } catch (error) {
        content.innerHTML = '<div class="empty-logs">加载失败: ' + error.message + '</div>';
    }
}

// 关闭更新历史
function closeUpdateHistory() {
    const modal = document.getElementById('updateHistoryModal');
    modal.style.display = 'none';
}

// 点击弹窗外部关闭
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('updateHistoryModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeUpdateHistory();
            }
        });
    }
});


// ==================== 筛选和排序功能 ====================

// 更新国家筛选器选项
function updateCountryFilter() {
    // 统计每个国家的节点数
    const countryStats = {};
    
    nodes.forEach(node => {
        const country = extractCountryFromName(node.name);
        countryStats[country] = (countryStats[country] || 0) + 1;
    });
    
    const select = document.getElementById('countryFilter');
    if (!select) return;
    
    const currentValue = select.value;
    select.innerHTML = `<option value="all">🌍 所有国家/地区 (${nodes.length})</option>`;
    
    // 排序并添加选项
    const countries = Object.keys(countryStats).sort((a, b) => {
        // "其他"排最后
        if (a === '其他') return 1;
        if (b === '其他') return -1;
        return a.localeCompare(b, 'zh-CN');
    });
    
    countries.forEach(country => {
        const count = countryStats[country];
        const option = document.createElement('option');
        option.value = country;
        option.textContent = `${country} (${count})`;
        select.appendChild(option);
    });
    
    // 恢复之前的选择
    if (currentValue && countries.includes(currentValue)) {
        select.value = currentValue;
    }
}

// 按国家筛选
function filterByCountry() {
    const select = document.getElementById('countryFilter');
    if (!select) return;
    
    currentFilter = select.value;
    displayNodes();
}

// 排序节点
function sortNodes() {
    const select = document.getElementById('sortOrder');
    if (select) {
        currentSort = select.value;
    }
    
    if (currentSort === 'latency') {
        // 按延迟排序
        nodes.sort((a, b) => {
            // 可用节点按延迟排序
            if (a.available === 1 && b.available === 1) {
                const latencyA = parseFloat(a.latency) || 99999;
                const latencyB = parseFloat(b.latency) || 99999;
                return latencyA - latencyB;
            }
            // 可用节点排前面
            if (a.available === 1) return -1;
            if (b.available === 1) return 1;
            // 未检测的排中间
            if (a.available === null && b.available === 0) return -1;
            if (b.available === null && a.available === 0) return 1;
            // 不可用节点排最后,按名称排序
            return a.name.localeCompare(b.name, 'zh-CN');
        });
    } else if (currentSort === 'purity') {
        // 按纯净度排序
        nodes.sort((a, b) => {
            // 获取纯净度分数 (0-100)
            const purityA = parseFloat(a.ip_purity_score) || -1;
            const purityB = parseFloat(b.ip_purity_score) || -1;
            
            // 有纯净度数据的节点排前面,按分数从高到低
            if (purityA >= 0 && purityB >= 0) {
                if (purityB !== purityA) {
                    return purityB - purityA; // 分数高的排前面
                }
                // 分数相同时,按延迟排序
                const latencyA = parseFloat(a.latency) || 99999;
                const latencyB = parseFloat(b.latency) || 99999;
                return latencyA - latencyB;
            }
            
            // 有纯净度数据的排前面
            if (purityA >= 0) return -1;
            if (purityB >= 0) return 1;
            
            // 都没有纯净度数据时,可用节点排前面
            if (a.available === 1 && b.available === 1) {
                const latencyA = parseFloat(a.latency) || 99999;
                const latencyB = parseFloat(b.latency) || 99999;
                return latencyA - latencyB;
            }
            if (a.available === 1) return -1;
            if (b.available === 1) return 1;
            
            // 按名称排序
            return a.name.localeCompare(b.name, 'zh-CN');
        });
    } else if (currentSort === 'name') {
        // 按名称排序
        nodes.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
    } else if (currentSort === 'country') {
        // 按国家排序
        nodes.sort((a, b) => {
            const countryA = extractCountryFromName(a.name);
            const countryB = extractCountryFromName(b.name);
            if (countryA === countryB) {
                return a.name.localeCompare(b.name, 'zh-CN');
            }
            // "其他"排最后
            if (countryA === '其他') return 1;
            if (countryB === '其他') return -1;
            return countryA.localeCompare(countryB, 'zh-CN');
        });
    }
    
    displayNodes();
}

// ==================== 自动刷新功能 ====================

// 启动自动刷新
function startAutoRefresh() {
    // 每30秒检查一次数据库更新
    autoRefreshInterval = setInterval(async () => {
        try {
            const response = await fetch('api/nodes.php?action=list');
            const result = await response.json();
            
            if (result.success) {
                const oldCount = nodes.length;
                const newCount = result.nodes.length;
                
                // 检查是否有变化
                if (newCount !== oldCount || hasNodesChanged(result.nodes)) {
                    console.log(`节点列表已更新: ${oldCount} -> ${newCount}`);
                    nodes = result.nodes;
                    updateCountryFilter();
                    sortNodes();
                    showStats();
                    
                    if (window.CyberpunkAnimations && newCount !== oldCount) {
                        CyberpunkAnimations.showNotification(
                            `节点列表已更新: ${newCount} 个节点`,
                            'info'
                        );
                    }
                }
            }
        } catch (error) {
            console.error('自动刷新失败:', error);
        }
    }, 30000); // 30秒
    
    console.log('✓ 自动刷新已启动 (每30秒)');
}

// 停止自动刷新
function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        console.log('✓ 自动刷新已停止');
    }
}

// 检查节点是否有变化
function hasNodesChanged(newNodes) {
    if (nodes.length !== newNodes.length) return true;
    
    // 简单检查:比较第一个和最后一个节点的更新时间
    if (nodes.length > 0 && newNodes.length > 0) {
        const oldFirst = nodes[0].updated_at || 0;
        const newFirst = newNodes[0].updated_at || 0;
        const oldLast = nodes[nodes.length - 1].updated_at || 0;
        const newLast = newNodes[newNodes.length - 1].updated_at || 0;
        
        if (oldFirst !== newFirst || oldLast !== newLast) {
            return true;
        }
    }
    
    return false;
}
