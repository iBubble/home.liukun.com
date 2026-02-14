#!/usr/bin/env node
/**
 * 节点可用性测试脚本
 * 测试proxies.json中的节点是否真的可用
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = __dirname;
const CLASH_DIR = path.join(ROOT, 'clash_bin');
const CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
const TEST_PORT = 7894;

console.log('========================================');
console.log('   节点可用性测试');
console.log('========================================\n');

// 读取节点
const proxiesFile = path.join(ROOT, 'proxies.json');
if (!fs.existsSync(proxiesFile)) {
    console.log('❌ proxies.json 不存在');
    process.exit(1);
}

const allProxies = JSON.parse(fs.readFileSync(proxiesFile, 'utf8'));
console.log(`📋 总节点数: ${allProxies.length}`);

// 随机选择10个节点测试
const testProxies = [];
const indices = new Set();
while (testProxies.length < Math.min(10, allProxies.length)) {
    const idx = Math.floor(Math.random() * allProxies.length);
    if (!indices.has(idx)) {
        indices.add(idx);
        testProxies.push(allProxies[idx]);
    }
}

console.log(`🎲 随机选择 ${testProxies.length} 个节点进行测试\n`);

// 生成Clash配置
const config = {
    port: TEST_PORT,
    'socks-port': TEST_PORT + 1,
    'allow-lan': false,
    mode: 'global',
    'log-level': 'silent',
    proxies: testProxies,
    'proxy-groups': [{
        name: 'PROXY',
        type: 'select',
        proxies: testProxies.map(p => p.name)
    }],
    rules: ['MATCH,PROXY']
};

const configPath = path.join(CLASH_DIR, 'test_availability_config.yaml');
fs.writeFileSync(configPath, yaml.dump(config));

console.log('🚀 启动Clash进行测试...\n');

const clashProcess = spawn(CLASH_BIN, ['-d', CLASH_DIR, '-f', configPath], {
    stdio: 'pipe'
});

// 等待Clash启动
setTimeout(async () => {
    console.log('开始测试节点连接性...\n');
    
    const results = [];
    
    for (let i = 0; i < testProxies.length; i++) {
        const proxy = testProxies[i];
        console.log(`[${i+1}/${testProxies.length}] 测试: ${proxy.name}`);
        console.log(`  类型: ${proxy.type}, 服务器: ${proxy.server}:${proxy.port}`);
        
        // 测试连接
        const testUrl = 'http://www.gstatic.com/generate_204';
        const result = await testConnection(testUrl, proxy.name);
        
        results.push({
            name: proxy.name,
            type: proxy.type,
            server: `${proxy.server}:${proxy.port}`,
            ...result
        });
        
        console.log(`  结果: ${result.success ? '✅ 可用' : '❌ 不可用'} (${result.time}ms)\n`);
    }
    
    // 输出汇总
    console.log('========================================');
    console.log('   测试结果汇总');
    console.log('========================================\n');
    
    const available = results.filter(r => r.success);
    console.log(`可用节点: ${available.length}/${results.length}\n`);
    
    if (available.length > 0) {
        console.log('✅ 可用节点列表:');
        available.forEach((r, i) => {
            console.log(`  ${i+1}. ${r.name} (${r.time}ms)`);
        });
    } else {
        console.log('❌ 没有可用节点');
        console.log('\n建议:');
        console.log('  1. 从MacBook推送新节点');
        console.log('  2. 运行: ./push_nodes_from_mac.sh');
    }
    
    // 清理
    clashProcess.kill('SIGTERM');
    process.exit(available.length > 0 ? 0 : 1);
}, 3000);

function testConnection(url, proxyName) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        const curlArgs = [
            '-s',
            '-o', '/dev/null',
            '-w', '%{http_code}',
            '--max-time', '10',
            '-x', `http://127.0.0.1:${TEST_PORT}`,
            url
        ];
        
        const child = spawn('curl', curlArgs, { timeout: 12000 });
        let data = '';
        
        child.stdout.on('data', chunk => data += chunk);
        
        child.on('close', (code) => {
            const elapsed = Date.now() - startTime;
            const httpCode = data.trim();
            
            if (code === 0 && (httpCode === '200' || httpCode === '204')) {
                resolve({ success: true, time: elapsed, httpCode });
            } else {
                resolve({ success: false, time: elapsed, error: `HTTP ${httpCode || 'timeout'}` });
            }
        });
        
        child.on('error', () => {
            resolve({ success: false, time: Date.now() - startTime, error: 'Connection failed' });
        });
    });
}
