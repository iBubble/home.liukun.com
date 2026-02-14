/**
 * 直接测试种子节点是否可用
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const yaml = require('js-yaml');

const CLASH_DIR = path.join(__dirname, 'clash_bin');
const CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
const TEST_PORT = 17890;

async function testNode(proxy, index) {
    console.log(`\n========== 测试节点 ${index + 1}: ${proxy.name} ==========`);
    console.log(`服务器: ${proxy.server}`);
    console.log(`延迟: ${proxy.latency || proxy.avgLatency}ms`);
    
    // 生成Clash配置
    const config = {
        port: TEST_PORT,
        'socks-port': TEST_PORT + 1,
        'allow-lan': false,
        mode: 'global',
        'log-level': 'silent',
        proxies: [proxy],
        'proxy-groups': [{
            name: 'PROXY',
            type: 'select',
            proxies: [proxy.name]
        }],
        rules: ['MATCH,PROXY']
    };
    
    const configPath = path.join(CLASH_DIR, 'test_node_config.yaml');
    fs.writeFileSync(configPath, yaml.dump(config));
    
    // 启动Clash
    const clashProcess = spawn(CLASH_BIN, ['-d', CLASH_DIR, '-f', configPath], {
        stdio: ['ignore', 'pipe', 'pipe']
    });
    
    // 等待启动
    await new Promise(r => setTimeout(r, 2000));
    
    // 测试连接
    const tests = [
        { name: 'Cloudflare', url: 'https://www.cloudflare.com/cdn-cgi/trace' },
        { name: 'Google', url: 'https://www.google.com' },
        { name: 'GitHub', url: 'https://api.github.com' }
    ];
    
    const results = [];
    
    for (const test of tests) {
        try {
            const result = await new Promise((resolve) => {
                const curl = spawn('curl', [
                    '-s',
                    '-o', '/dev/null',
                    '-w', '%{http_code}',
                    '-x', `http://127.0.0.1:${TEST_PORT}`,
                    '--max-time', '10',
                    '--insecure', // 忽略SSL证书验证
                    test.url
                ]);
                
                let output = '';
                curl.stdout.on('data', d => output += d.toString());
                
                curl.on('close', (code) => {
                    if (code === 0 && output.trim() === '200') {
                        resolve({ success: true, code: output.trim() });
                    } else {
                        resolve({ success: false, code: code, output: output.trim() });
                    }
                });
                
                curl.on('error', () => resolve({ success: false }));
            });
            
            if (result.success) {
                console.log(`  ✅ ${test.name}: 成功 (${result.code})`);
                results.push(true);
            } else {
                console.log(`  ❌ ${test.name}: 失败 (exit: ${result.code}, http: ${result.output})`);
                results.push(false);
            }
        } catch (e) {
            console.log(`  ❌ ${test.name}: 异常 - ${e.message}`);
            results.push(false);
        }
    }
    
    // 停止Clash
    try {
        clashProcess.kill('SIGKILL');
    } catch (e) {}
    
    const successCount = results.filter(r => r).length;
    console.log(`\n结果: ${successCount}/${tests.length} 测试通过`);
    
    return successCount;
}

async function main() {
    console.log('========== 种子节点可用性测试 ==========\n');
    
    const seedFile = path.join(__dirname, 'seed_proxies.json');
    const proxies = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
    
    // 过滤掉CN节点
    const nonCNProxies = proxies.filter(p => {
        const name = (p.name || '').toLowerCase();
        return !name.includes('cn') && !name.includes('中国') && !name.includes('大陆') && !name.includes('家宽');
    });
    
    console.log(`总节点数: ${proxies.length}`);
    console.log(`非CN节点: ${nonCNProxies.length}\n`);
    
    // 测试前5个节点
    const testNodes = nonCNProxies.slice(0, 5);
    const scores = [];
    
    for (let i = 0; i < testNodes.length; i++) {
        const score = await testNode(testNodes[i], i);
        scores.push({ node: testNodes[i], score });
        await new Promise(r => setTimeout(r, 1000));
    }
    
    console.log('\n========== 测试总结 ==========');
    scores.forEach((s, i) => {
        console.log(`${i + 1}. ${s.node.name}: ${s.score}/3`);
    });
    
    const bestNode = scores.reduce((best, curr) => curr.score > best.score ? curr : best);
    console.log(`\n最佳节点: ${bestNode.node.name} (${bestNode.score}/3)`);
}

main().catch(console.error);
