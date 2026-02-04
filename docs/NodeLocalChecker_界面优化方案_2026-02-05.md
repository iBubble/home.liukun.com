# NodeLocalChecker 界面优化方案

**日期**: 2026-02-05  
**需求**: 优化节点列表显示和筛选功能

## 优化需求

### 1. 可滚动列表
- 固定显示区域高度为10个节点
- 超出部分可滚动查看
- 保持表头固定不滚动

### 2. 智能排序
- 检测完成后自动按延迟排序
- 可用节点按延迟从低到高
- 不可用节点排在最后
- 未检测节点排在中间

### 3. 国家/地区筛选
- 从节点名称提取国家/地区信息
- 添加下拉选择器
- 支持筛选: 所有、具体国家、其他
- 实时更新显示

## 实现方案

### 1. 国家/地区提取规则

从节点名称中提取国家/地区标识:

```javascript
// 国家代码映射
const countryMap = {
    'US': '美国', 'HK': '香港', 'JP': '日本', 'SG': '新加坡',
    'TW': '台湾', 'KR': '韩国', 'UK': '英国', 'DE': '德国',
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

// 中文国家名称映射
const chineseCountryNames = {
    '美国': 'US', '香港': 'HK', '日本': 'JP', '新加坡': 'SG',
    '台湾': 'TW', '韩国': 'KR', '英国': 'UK', '德国': 'DE',
    // ... 更多映射
};

// 提取函数
function extractCountry(nodeName) {
    // 1. 检查emoji国旗
    const flagMatch = nodeName.match(/🇺🇸|🇭🇰|🇯🇵|🇸🇬|🇹🇼|🇰🇷|🇬🇧|🇩🇪|🇫🇷|🇨🇦/);
    
    // 2. 检查国家代码 (US, HK, JP等)
    const codeMatch = nodeName.match(/\b([A-Z]{2})\b/);
    
    // 3. 检查中文国家名
    const chineseMatch = nodeName.match(/美国|香港|日本|新加坡|台湾|韩国|英国|德国/);
    
    return country || '其他';
}
```

### 2. HTML结构调整

```html
<!-- 筛选器 -->
<div class="filter-bar">
    <label>国家/地区:</label>
    <select id="countryFilter" onchange="filterByCountry()">
        <option value="all">所有</option>
        <!-- 动态生成国家选项 -->
    </select>
    
    <label>排序:</label>
    <select id="sortOrder" onchange="sortNodes()">
        <option value="latency">按延迟</option>
        <option value="name">按名称</option>
        <option value="country">按国家</option>
    </select>
</div>

<!-- 可滚动节点列表 -->
<div class="nodes-container-wrapper">
    <div id="nodesContainer" class="scrollable-nodes">
        <!-- 节点表格 -->
    </div>
</div>
```

### 3. CSS样式

```css
/* 筛选栏 */
.filter-bar {
    display: flex;
    gap: 20px;
    align-items: center;
    padding: 15px;
    background: rgba(0, 255, 65, 0.05);
    border: 1px solid rgba(0, 255, 65, 0.2);
    border-radius: 8px;
    margin-bottom: 20px;
}

.filter-bar select {
    background: rgba(0, 0, 0, 0.5);
    color: #0ff;
    border: 1px solid rgba(0, 255, 255, 0.3);
    padding: 8px 15px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    cursor: pointer;
}

/* 可滚动容器 */
.nodes-container-wrapper {
    position: relative;
    border: 1px solid rgba(0, 255, 65, 0.2);
    border-radius: 8px;
    overflow: hidden;
}

.scrollable-nodes {
    max-height: calc(10 * 50px + 45px); /* 10行 + 表头 */
    overflow-y: auto;
    overflow-x: hidden;
}

/* 固定表头 */
.nodes-table thead {
    position: sticky;
    top: 0;
    background: rgba(0, 20, 10, 0.95);
    z-index: 10;
    box-shadow: 0 2px 10px rgba(0, 255, 65, 0.2);
}

/* 滚动条样式 */
.scrollable-nodes::-webkit-scrollbar {
    width: 10px;
}

.scrollable-nodes::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.3);
}

.scrollable-nodes::-webkit-scrollbar-thumb {
    background: rgba(0, 255, 65, 0.3);
    border-radius: 5px;
}

.scrollable-nodes::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 255, 65, 0.5);
}
```

### 4. JavaScript功能

```javascript
// 全局变量
let currentFilter = 'all';
let currentSort = 'latency';
let availableCountries = new Set();

// 提取国家信息
function extractCountryFromName(name) {
    // 实现国家提取逻辑
    // 返回国家代码或"其他"
}

// 更新国家筛选器
function updateCountryFilter() {
    availableCountries.clear();
    
    nodes.forEach(node => {
        const country = extractCountryFromName(node.name);
        availableCountries.add(country);
    });
    
    const select = document.getElementById('countryFilter');
    select.innerHTML = '<option value="all">所有</option>';
    
    // 排序并添加选项
    Array.from(availableCountries).sort().forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        select.appendChild(option);
    });
}

// 筛选节点
function filterByCountry() {
    currentFilter = document.getElementById('countryFilter').value;
    displayNodes();
}

// 排序节点
function sortNodes() {
    currentSort = document.getElementById('sortOrder').value;
    
    if (currentSort === 'latency') {
        nodes.sort((a, b) => {
            // 可用节点按延迟排序
            if (a.available === 1 && b.available === 1) {
                const latencyA = parseFloat(a.latency) || 9999;
                const latencyB = parseFloat(b.latency) || 9999;
                return latencyA - latencyB;
            }
            // 可用节点排前面
            if (a.available === 1) return -1;
            if (b.available === 1) return 1;
            // 不可用节点排最后
            if (a.available === 0 && b.available !== 0) return 1;
            if (b.available === 0 && a.available !== 0) return -1;
            // 其他按名称排序
            return a.name.localeCompare(b.name);
        });
    } else if (currentSort === 'name') {
        nodes.sort((a, b) => a.name.localeCompare(b.name));
    } else if (currentSort === 'country') {
        nodes.sort((a, b) => {
            const countryA = extractCountryFromName(a.name);
            const countryB = extractCountryFromName(b.name);
            return countryA.localeCompare(countryB);
        });
    }
    
    displayNodes();
}

// 显示节点(带筛选)
function displayNodes() {
    let filteredNodes = nodes;
    
    // 应用国家筛选
    if (currentFilter !== 'all') {
        filteredNodes = nodes.filter(node => {
            const country = extractCountryFromName(node.name);
            return country === currentFilter;
        });
    }
    
    // 渲染节点列表
    // ...
}

// 检测完成后自动排序
function onCheckComplete() {
    if (currentSort === 'latency') {
        sortNodes();
    }
}
```

### 5. 实时更新机制

```javascript
// 定时刷新节点列表(用于计划任务更新)
let autoRefreshInterval = null;

function startAutoRefresh() {
    // 每30秒检查一次数据库更新
    autoRefreshInterval = setInterval(async () => {
        const response = await fetch('api/nodes.php?action=list');
        const result = await response.json();
        
        if (result.success) {
            const oldCount = nodes.length;
            const newCount = result.nodes.length;
            
            if (newCount !== oldCount) {
                // 有变化,重新加载
                nodes = result.nodes;
                updateCountryFilter();
                sortNodes();
                showStats();
                
                if (window.CyberpunkAnimations) {
                    CyberpunkAnimations.showNotification(
                        `节点列表已更新: ${newCount} 个节点`,
                        'info'
                    );
                }
            }
        }
    }, 30000); // 30秒
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// 页面加载时启动自动刷新
document.addEventListener('DOMContentLoaded', function() {
    // ...
    startAutoRefresh();
});

// 页面卸载时停止自动刷新
window.addEventListener('beforeunload', function() {
    stopAutoRefresh();
});
```

## 实现步骤

1. ✅ 创建优化方案文档
2. ⏳ 修改HTML结构,添加筛选器
3. ⏳ 添加CSS样式,实现可滚动列表
4. ⏳ 实现国家提取函数
5. ⏳ 实现筛选和排序功能
6. ⏳ 添加自动刷新机制
7. ⏳ 测试所有功能

## 预期效果

- 节点列表固定高度,可流畅滚动
- 检测完成后自动按延迟排序
- 可按国家/地区快速筛选
- 计划任务更新后自动刷新显示
- 保持赛博朋克科幻风格

---

**创建时间**: 2026-02-05  
**状态**: 设计中
