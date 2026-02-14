#!/usr/bin/env node
/**
 * 查找能够访问Facebook的节点
 * 这些节点质量更高,更适合访问各种外网站点
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = __dirname;
const CLASH_DIR = path.join(ROOT, 'clash_bin');
const CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
const TEST_PORT = 7901;

console.log('========================================');
console.log('   查找能访问Facebook的高质量节点');
console.log('========================================\n');

// 读取所有节点
const proxiesFile = path.join(ROOT, 'proxies.json');
const allProxies = JSON.parse(fs.readFileSync(proxiesFile, 'utf8'));

console.log(`📋 总节点数: ${allProxies.length}\n`);

// 关键测试站点 - 必须全部通过
const criticalSites = [
    { name: 'Facebook', url: 'https://www.facebook.com', expect: '200' },
    { name: 'Google', url: 'https://www.google.com', expect: '200' },
    { name: 'GitHub', url: 'https://github.com', expect: '200' },
];

let clashProcess = null;
let currentProxyIndex = 0;
const maxTests = 50; // 最多测试50个节点
const qualityProxies = [];

async function testProxy(proxy, index) {
    console.log(`\n[${index + 1}/${allProxies.length}] 测试节点: ${proxy.name}`);
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
    
    const configPath = path.join(CLASH_DIR, 'test_facebook_config.yaml');
    fs.writeFileSync(configPath, yaml.dump(config));
    
    // 停止旧进程
    if (clashProcess) {
        clashProcess.kill('SIGTERM');
        await new Promise(r => setTimeout(r, 500));
    }
    
    // 启动新进程
    clashProcess = spawn(CLASH_BIN, ['-d', CLASH_DIR, '-f', configPath], {
        stdio: 'pipe'
    });
    
    // 等待启动
    await new Promise(r => setTimeout(r, 2000));
    
    // 测试关键站点
    let allPassed = true;
    const results = [];
    
    for (const site of criticalSites) {
        process.stdout.write(`  ${site.name.padEnd(15)} ... `);
        const result = await testSite(site.url, 10);
        results.push({ ...site, ...result });
        
        if (result.success) {
            console.log(`✅ ${result.httpCode} (${result.time}ms)`);
        } else {
            console.log(`❌ ${result.error}`);
            allPassed = false;
        }
    }
    
    if (allPassed) {
        console.log(`  ✅ 高质量节点! 所有测试通过`);
        
        // 计算平均延迟
        const avgLatency = Math.round(
            results.reduce((sum, r) => sum + r.time, 0) / results.length
        );
        
        qualityProxies.push({
            ...proxy,
            avgLatency: avgLatency,
            testedAt: new Date().toISOString(),
            testResults: results
        });
        
        return true;
    } else {
        console.log(`  ❌ 节点不符合要求`);
        return false;
    }
}

async function findQualityProxies() {
    console.log('🔍 开始搜索高质量节点...');
    console.log('   要求: 必须能访问 Facebook + Google + GitHub\n');
    
    let tested = 0;
    
    while (currentProxyIndex < allProxies.length && tested < maxTests) {
        await testProxy(allProxies[currentProxyIndex], currentProxyIndex);
        
        currentProxyIndex++;
        tested++;
        
        // 找到10个就够了
        if (qualityProxies.length >= 10) {
            console.log(`\n✅ 已找到 ${qualityProxies.length} 个高质量节点,停止搜索`);
            break;
        }
        
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
    
    console.log(`测试节点数: ${tested}`);
    console.log(`高质量节点: ${qualityProxies.length}`);
    console.log(`成功率: ${Math.round(qualityProxies.length/tested*100)}%\n`);
    
    if (qualityProxies.length > 0) {
        // 按延迟排序
        qualityProxies.sort((a, b) => a.avgLatency - b.avgLatency);
        
        console.log('✅ 高质量节点列表 (按延迟排序):\n');
        qualityProxies.forEach((p, i) => {
            console.log(`${i + 1}. ${p.name}`);
            console.log(`   类型: ${p.type}`);
            console.log(`   服务器: ${p.server}:${p.port}`);
            console.log(`   平均延迟: ${p.avgLatency}ms`);
            console.log('');
        });
        
        // 保存到文件
        fs.writeFileSync(
            path.join(ROOT, 'quality_proxies.json'),
            JSON.stringify(qualityProxies, null, 2)
        );
        console.log('💾 已保存到 quality_proxies.json\n');
        
        // 更新种子节点
        fs.writeFileSync(
            path.join(ROOT, 'seed_proxies.json'),
            JSON.stringify(qualityProxies, null, 2)
        );
        console.log('💾 已更新 seed_proxies.json\n');
        
        console.log('========================================');
        console.log('✅ 找到高质量节点!可以用于:');
        console.log('   - 访问 Facebook');
        console.log('   - 访问 Google');
        console.log('   - 访问 GitHub');
        console.log('   - 访问 Linux.do (可能)');
        console.log('========================================');
    } else {
        console.log('❌ 未找到符合要求的节点\n');
        console.log('建议:');
        console.log('  1. 增加测试数量 (修改 maxTests)');
        console.log('  2. 从MacBook推送新节点');
        console.log('  3. 降低测试标准');
    }
    
    process.exit(qualityProxies.length > 0 ? 0 : 1);
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
            '--connect-timeout', '5',
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

// 运行
findQualityProxies().catch(e => {
    console.error('测试失败:', e);
    if (clashProcess) clashProcess.kill();
    process.exit(1);
});
