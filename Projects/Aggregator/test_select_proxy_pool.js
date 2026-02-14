#!/usr/bin/env node
/**
 * 测试selectProxyPool函数是否能正确读取validated_nodes.json
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

// 模拟addLog函数
function addLog(message, level = 'info') {
    const prefix = {
        'success': '✅',
        'info': 'ℹ️',
        'warning': '⚠️',
        'error': '❌'
    }[level] || 'ℹ️';
    
    console.log(`${prefix} ${message}`);
}

// 复制selectProxyPool函数
async function selectProxyPool() {
    try {
        let proxies = [];
        
        // 🔥 第一优先: 使用已验证的excellent节点
        const validatedFile = path.join(ROOT, 'validated_nodes.json');
        if (fs.existsSync(validatedFile)) {
            try {
                const validated = JSON.parse(fs.readFileSync(validatedFile, 'utf8'));
                
                // 优先使用excellent节点 (能访问Facebook)
                if (validated.excellent && validated.excellent.length > 0) {
                    proxies = validated.excellent;
                    addLog(`使用 ${proxies.length} 个已验证的优质节点 (excellent - 能访问Facebook)`, 'success');
                }
                // 其次使用good节点 (能访问Google)
                else if (validated.good && validated.good.length > 0) {
                    proxies = validated.good;
                    addLog(`使用 ${proxies.length} 个已验证的良好节点 (good - 能访问Google)`, 'info');
                }
                // 最后使用basic节点 (能访问204)
                else if (validated.basic && validated.basic.length > 0) {
                    proxies = validated.basic;
                    addLog(`使用 ${proxies.length} 个已验证的基础节点 (basic - 能访问204)`, 'info');
                }
            } catch (e) {
                addLog(`validated_nodes.json 读取失败: ${e.message}`, 'warning');
            }
        }
        
        // 第二优先: 从 proxies.json 读取
        if (proxies.length === 0) {
            const proxiesFile = path.join(ROOT, 'proxies.json');
            if (fs.existsSync(proxiesFile)) {
                try {
                    proxies = JSON.parse(fs.readFileSync(proxiesFile, 'utf8'));
                    addLog('使用 proxies.json 中的节点', 'info');
                } catch (e) {
                    addLog('proxies.json 读取失败', 'warning');
                }
            }
        }
        
        if (proxies.length === 0) {
            addLog('未找到任何节点', 'warning');
            return [];
        }
        
        // 筛选香港节点
        const targetRegions = ['HK', '香港'];
        const candidates = proxies.filter(p => {
            // 如果有avgLatency字段(来自validated_nodes),使用它
            const latency = p.avgLatency || p.latency;
            if (!latency || latency >= 800 || latency === 'timeout') return false;
            const name = (p.name || '').toUpperCase();
            return targetRegions.some(region => name.includes(region));
        });

        if (candidates.length === 0) {
            addLog('未找到可用的香港节点', 'warning');
            return [];
        }

        // 按延迟排序，选择前5个最快的作为代理池
        candidates.sort((a, b) => {
            const latencyA = a.avgLatency || a.latency;
            const latencyB = b.avgLatency || b.latency;
            return latencyA - latencyB;
        });
        const pool = candidates.slice(0, 5);
        
        const firstLatency = pool[0].avgLatency || pool[0].latency;
        addLog(`代理池已准备: ${pool.length} 个节点 (最快: ${pool[0].name}, ${firstLatency}ms)`, 'success');
        return pool;
    } catch (e) {
        addLog(`选择代理池失败: ${e.message}`, 'error');
        return [];
    }
}

// 测试
async function main() {
    console.log('========================================');
    console.log('测试selectProxyPool函数');
    console.log('========================================\n');
    
    const pool = await selectProxyPool();
    
    console.log('\n========================================');
    console.log('结果');
    console.log('========================================');
    
    if (pool.length > 0) {
        console.log(`\n✅ 成功获取 ${pool.length} 个代理节点:\n`);
        pool.forEach((node, i) => {
            const latency = node.avgLatency || node.latency;
            const quality = node.quality || 'unknown';
            console.log(`  ${i + 1}. ${node.name}`);
            console.log(`     延迟: ${latency}ms, 质量: ${quality}`);
        });
    } else {
        console.log('\n❌ 未获取到任何代理节点');
    }
}

main().catch(console.error);
