// Aggregator 节点数量显示功能 - 浏览器控制台测试脚本
// 在 https://home.liukun.com:8443/Projects/Aggregator/ 页面的控制台中运行

console.log('🔍 Aggregator 节点数量显示测试');
console.log('================================\n');

// 测试1: 检查元素是否存在
console.log('📋 测试1: 检查HTML元素');
const elements = {
    'totalNodeCount': document.getElementById('totalNodeCount'),
    'availableNodeCount': document.getElementById('availableNodeCount'),
    'scanPanelNodeCount': document.getElementById('scanPanelNodeCount'),
    'scanPanelVerifiedCount': document.getElementById('scanPanelVerifiedCount')
};

let allElementsExist = true;
for (const [id, elem] of Object.entries(elements)) {
    if (elem) {
        console.log(`✓ ${id}: 存在 (当前值: ${elem.textContent})`);
    } else {
        console.log(`✗ ${id}: 不存在`);
        allElementsExist = false;
    }
}

if (allElementsExist) {
    console.log('\n✅ 所有元素检查通过\n');
} else {
    console.log('\n❌ 部分元素缺失\n');
}

// 测试2: 测试手动更新
console.log('📋 测试2: 手动更新测试');
function testManualUpdate() {
    const testScanned = 123;
    const testVerified = 45;
    
    elements.totalNodeCount.textContent = testScanned;
    elements.availableNodeCount.textContent = testVerified;
    elements.scanPanelNodeCount.textContent = testScanned;
    elements.scanPanelVerifiedCount.textContent = testVerified;
    
    console.log(`✓ 手动更新成功: 已扫描=${testScanned}, 可用=${testVerified}`);
}
testManualUpdate();

// 测试3: 测试API获取
console.log('\n📋 测试3: API数据获取');
async function testAPIFetch() {
    try {
        const response = await fetch('/Projects/Aggregator/api/index.php?path=/scan/status');
        const data = await response.json();
        
        console.log('API响应:', data);
        
        if (data.success) {
            console.log(`✓ node_count: ${data.node_count}`);
            console.log(`✓ verified_count: ${data.verified_count}`);
            console.log(`✓ running: ${data.running}`);
            
            // 更新显示
            if (window.aggregator && typeof window.aggregator.updateNodeCount === 'function') {
                window.aggregator.updateNodeCount(data.node_count, data.verified_count);
                console.log('✓ 通过 aggregator.updateNodeCount() 更新成功');
            } else {
                console.log('⚠ window.aggregator 不可用，直接更新元素');
                elements.totalNodeCount.textContent = data.node_count;
                elements.availableNodeCount.textContent = data.verified_count;
            }
        } else {
            console.log('✗ API返回失败');
        }
    } catch (error) {
        console.log(`✗ API请求失败: ${error.message}`);
    }
}
await testAPIFetch();

// 测试4: 检查轮询机制
console.log('\n📋 测试4: 检查轮询机制');
if (window.aggregator) {
    console.log('✓ window.aggregator 对象存在');
    console.log(`  - scanStatusInterval: ${window.aggregator.scanStatusInterval ? '运行中' : '未运行'}`);
    console.log(`  - isScanRunning: ${window.aggregator.isScanRunning}`);
} else {
    console.log('✗ window.aggregator 对象不存在');
}

console.log('\n================================');
console.log('✅ 测试完成！');
console.log('\n💡 提示:');
console.log('  - 点击"开始扫描"按钮开始真实测试');
console.log('  - 观察节点数量是否每3秒更新');
console.log('  - 检查扫描面板是否正确显示/隐藏');
