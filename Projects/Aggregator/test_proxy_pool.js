#!/usr/bin/env node

/**
 * 测试代理池选择逻辑
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

// 选择最佳代理节点池
async function selectProxyPool() {
    try {
        let proxies = [];
        
        // 第一优先: 使用已验证的excellent节点
        const validatedFile = path.join(ROOT, 'validated_nodes.json');
        if (fs.existsSync(validatedFile)) {
            try {
                const validated = JSON.parse(fs.readFileSync(validatedFile, 'utf8'));
                
                // 优先使用excellent节点
                if (validated.excellent && validated.excellent.length > 0) {
                    proxies = validated.excellent;
                    console.log(`✅ 使用 ${proxies.length} 个已验证的优质节点 (excellent)`);
                }
                // 其次使用good节点
                else if (validated.good && validated.good.length > 0) {
                    proxies = validated.good;
                    console.log(`✅ 使用 ${proxies.length} 个已验证的良好节点 (good)`);
                }
                // 最后使用basic节点
                else if (validated.basic && validated.basic.length > 0) {
                    proxies = validated.basic;
                    console.log(`✅ 使用 ${proxies.length} 个已验证的基础节点 (basic)`);
                }
            } catch (e) {
                console.log(`⚠️ validated_nodes.json 读取失败: ${e.message}`);
            }
        }
        
        if (proxies.length === 0) {
            console.log('⚠️ 未找到任何节点');
            return [];
        }
        
        console.log(`\n📊 节点列表 (共 ${proxies.length} 个):`);
        proxies.forEach((p, i) => {
            const latency = p.latency || p.avgLatency;
            console.log(`  ${i + 1}. ${p.name} - latency: ${p.latency}ms, avgLatency: ${p.avgLatency}ms`);
        });
        
        // 筛选美国、台湾、日本、香港、新加坡、德国节点，且延迟 < 2000ms
        const targetRegions = ['US', 'TW', 'JP', 'HK', 'SG', 'DE', '美国', '台湾', '日本', '香港', '新加坡', '德国'];
        const candidates = proxies.filter(p => {
            // 优先使用 latency (单次延迟)
            const latency = p.latency || p.avgLatency;
            if (!latency || latency >= 2000 || latency === 'timeout') return false;
            const name = (p.name || '').toUpperCase();
            return targetRegions.some(region => name.includes(region));
        });

        console.log(`\n🔍 筛选后的候选节点 (延迟 < 2000ms, 目标地区):`);
        if (candidates.length === 0) {
            console.log('⚠️ 未找到可用的快速代理节点');
            return [];
        }

        candidates.forEach((p, i) => {
            const latency = p.latency || p.avgLatency;
            console.log(`  ${i + 1}. ${p.name} - ${latency}ms`);
        });

        // 按延迟排序，选择前5个最快的作为代理池
        candidates.sort((a, b) => {
            const latencyA = a.latency || a.avgLatency;
            const latencyB = b.latency || b.avgLatency;
            return latencyA - latencyB;
        });
        const pool = candidates.slice(0, 5);
        
        console.log(`\n✅ 最终代理池 (前5个最快):`);
        pool.forEach((p, i) => {
            const latency = p.latency || p.avgLatency;
            console.log(`  ${i + 1}. ${p.name} - ${latency}ms`);
        });
        
        return pool;
    } catch (e) {
        console.log(`❌ 选择代理池失败: ${e.message}`);
        return [];
    }
}

// 运行测试
(async () => {
    console.log('========== 代理池选择测试 ==========\n');
    const pool = await selectProxyPool();
    console.log(`\n========== 测试完成 (代理池: ${pool.length} 个节点) ==========`);
})();
