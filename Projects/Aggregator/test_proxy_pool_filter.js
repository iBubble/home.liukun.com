/**
 * 测试代理池筛选逻辑 - 验证是否正确排除CN节点
 */

const fs = require('fs');
const path = require('path');

// 模拟selectProxyPool的筛选逻辑
function testProxyFilter() {
    console.log('========== 测试代理池CN节点过滤 ==========\n');
    
    // 读取种子节点
    const seedFile = path.join(__dirname, 'seed_proxies.json');
    let proxies = [];
    
    if (fs.existsSync(seedFile)) {
        proxies = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
        console.log(`📦 加载种子节点: ${proxies.length} 个\n`);
    }
    
    // 筛选逻辑（与app.js中的selectProxyPool一致）
    const candidates = proxies.filter(p => {
        const latency = p.latency || p.avgLatency;
        if (!latency || latency >= 3000 || latency === 'timeout') return false;
        
        // 🔥 关键修复：排除所有国内节点（CN/中国/大陆）
        const name = (p.name || '').toLowerCase();
        const server = (p.server || '').toLowerCase();
        
        // 排除明确标记为CN的节点
        if (name.includes('cn') || name.includes('中国') || name.includes('大陆') || name.includes('家宽')) {
            console.log(`❌ 排除CN节点: ${p.name} (${p.server})`);
            return false;
        }
        
        // 排除国内IP段（简单判断）
        if (server.match(/^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.)/)) {
            console.log(`❌ 排除内网IP: ${p.name} (${p.server})`);
            return false;
        }
        
        return true;
    });
    
    console.log(`\n✅ 筛选后剩余: ${candidates.length} 个节点\n`);
    
    // 按延迟排序
    candidates.sort((a, b) => {
        const latencyA = a.latency || a.avgLatency;
        const latencyB = b.latency || b.avgLatency;
        return latencyA - latencyB;
    });
    
    // 显示前10个节点
    const pool = candidates.slice(0, 10);
    console.log('========== 代理池节点列表 (前10个) ==========\n');
    pool.forEach((p, i) => {
        const latency = p.latency || p.avgLatency;
        console.log(`${i + 1}. ${p.name}`);
        console.log(`   服务器: ${p.server}`);
        console.log(`   延迟: ${latency}ms`);
        console.log('');
    });
    
    // 检查是否还有CN节点
    const hasCN = pool.some(p => {
        const name = (p.name || '').toLowerCase();
        return name.includes('cn') || name.includes('中国') || name.includes('大陆') || name.includes('家宽');
    });
    
    if (hasCN) {
        console.log('⚠️ 警告：代理池中仍然包含CN节点！');
    } else {
        console.log('✅ 验证通过：代理池中没有CN节点');
    }
}

testProxyFilter();
