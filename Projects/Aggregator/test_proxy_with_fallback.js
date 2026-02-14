#!/usr/bin/env node
/**
 * 带故障转移的代理测试
 * 如果当前节点失败,自动切换到下一个节点
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = __dirname;
const CLASH_DIR = path.join(ROOT, 'clash_bin');
const CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
const TEST_PORT = 7899;

console.log('========================================');
console.log('   智能代理测试 - 自动故障转移');
console.log('========================================\n');

// 读取所有节点
const proxiesFile = path.join(ROOT, 'proxies.json');
const allProxies = JSON.parse(fs.readFileSync(proxiesFile, 'utf8'));

console.log(`📋 总节点数: ${allProxies.length}\n`);

// 测试站点
const testSites = [
    { name: 'Google 204', url: 'http://www.gstatic.com/generate_204', expect: '204' },
    { name: 'GitHub', url: 'https://github.com', expect: '200' },
    { name: 'Google', url: 'https://www.google.com', expect: '200' },
];

let clashProcess = null;
let currentProxyIndex = 0;
const maxRetries = 20; // 最多尝试20个节点
const workingProxies = [];

async function testCurrentProxy() {
    const proxy = allProxies[currentProxyIndex];
    
    console.log(`\n[${currentProxyIndex + 1}/${allProxies.length}] 测试节点: ${proxy.name}`);
    console.log(`  类型: ${proxy.type}, 服务器: ${proxy.server}:${proxy.port}`);
    
    // 生成单节点配置
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
    
    const configPath = path.join(CLASH_DIR, 'test_fallback_config.yaml');
    fs.writeFileSync(configPath, yaml.dump(config));
    
    // 停止旧的Clash进程
    if (clashProcess) {
        clashProcess.kill('SIGTERM');
        await new Promise(r => setTimeout(r, 500));
    }
    
    // 启动新的Clash进程
    clashProcess = spawn(CLASH_BIN, ['-d', CLASH_DIR, '-f', configPath], {
        stdio: 'pipe'
    });
    
    // 等待启动
    await new Promise(r => setTimeout(r, 2000));
    
    // 测试所有站点
    let successCount = 0;
    const results = [];
    
    for (const site of testSites) {
        process.stdout.write(`  测试 ${site.name.padEnd(15)} ... `);
        const result = await testSite(site.url, 8); // 8秒超时
        results.push({ ...site, ...result });
        
        if (result.success) {
            console.log(`✅ ${result.httpCode} (${result.time}ms)`);
            successCount++;
        } else {
            console.log(`❌ ${result.error}`);
        }
    }
    
    // 判断节点是否可用 (至少成功访问1个站点)
    const isWorking = successCount > 0;
    
    if (isWorking) {
        console.log(`  ✅ 节点可用 (${successCount}/${testSites.length} 成功)`);
        workingProxies.push({
            index: currentProxyIndex,
            proxy: proxy,
            successCount: successCount,
            results: results
        });
        return true;
    } else {
        console.log(`  ❌ 节点不可用,切换到下一个...`);
        return false;
    }
}

async function findWorkingProxies() {
    console.log('🔍 开始搜索可用节点...\n');
    
    let attempts = 0;
    
    while (currentProxyIndex < allProxies.length && attempts < maxRetries) {
        const isWorking = await testCurrentProxy();
        
        if (isWorking && workingProxies.length >= 5) {
            console.log(`\n✅ 已找到 ${workingProxies.length} 个可用节点,停止搜索`);
            break;
        }
        
        currentProxyIndex++;
        attempts++;
        
        // 间隔1秒
        await new Promise(r => setTimeout(r, 1000));
    }
    
    // 清理
    if (clashProcess) {
        clashProcess.kill('SIGTERM');
    }
    
    // 输出结果
    console.log('\n========================================');
    console.log('   搜索结果');
    console.log('========================================\n');
    
    console.log(`测试节点数: ${attempts}`);
    console.log(`可用节点数: ${workingProxies.length}\n`);
    
    if (workingProxies.length > 0) {
        console.log('✅ 可用节点列表:\n');
        workingProxies.forEach((wp, i) => {
            console.log(`${i + 1}. ${wp.proxy.name}`);
            console.log(`   类型: ${wp.proxy.type}`);
            console.log(`   服务器: ${wp.proxy.server}:${wp.proxy.port}`);
            console.log(`   成功率: ${wp.successCount}/${testSites.length}`);
            console.log('');
        });
        
        // 保存可用节点到文件
        const workingProxiesData = workingProxies.map(wp => ({
            ...wp.proxy,
            testedAt: new Date().toISOString(),
            successRate: wp.successCount / testSites.length
        }));
        
        fs.writeFileSync(
            path.join(ROOT, 'working_proxies.json'),
            JSON.stringify(workingProxiesData, null, 2)
        );
        
        console.log('💾 可用节点已保存到 working_proxies.json\n');
        
        // 更新seed_proxies.json
        const topProxies = workingProxiesData.slice(0, 20);
        fs.writeFileSync(
            path.join(ROOT, 'seed_proxies.json'),
            JSON.stringify(topProxies, null, 2)
        );
        
        console.log('💾 前20个可用节点已更新到 seed_proxies.json\n');
        
        console.log('✅ 代理系统可以正常工作!');
    } else {
        console.log('❌ 未找到可用节点');
        console.log('\n建议:');
        console.log('  1. 从MacBook推送新节点');
        console.log('  2. 运行: ./push_nodes_from_mac.sh');
    }
    
    process.exit(workingProxies.length > 0 ? 0 : 1);
}

function testSite(url, timeout = 10) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        const curlArgs = [
            '-s',
            '-L',
            '-o', '/dev/null',
            '-w', '%{http_code}',
            '--max-time', timeout.toString(),
            '-x', `http://127.0.0.1:${TEST_PORT}`,
            url
        ];
        
        const child = spawn('curl', curlArgs, { timeout: (timeout + 2) * 1000 });
        let data = '';
        
        child.stdout.on('data', chunk => data += chunk);
        
        child.on('close', (code) => {
            const elapsed = Date.now() - startTime;
            const httpCode = data.trim();
            
            if (code === 0 && httpCode && (httpCode.startsWith('2') || httpCode.startsWith('3'))) {
                resolve({
                    success: true,
                    time: elapsed,
                    httpCode: httpCode
                });
            } else {
                resolve({
                    success: false,
                    time: elapsed,
                    error: httpCode || 'timeout',
                    httpCode: httpCode
                });
            }
        });
        
        child.on('error', () => {
            resolve({
                success: false,
                time: Date.now() - startTime,
                error: 'error'
            });
        });
    });
}

// 运行测试
findWorkingProxies().catch(e => {
    console.error('测试失败:', e);
    if (clashProcess) clashProcess.kill();
    process.exit(1);
});
