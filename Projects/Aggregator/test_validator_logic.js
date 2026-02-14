#!/usr/bin/env node
/**
 * 测试验证逻辑 - 只测试前10个节点
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = __dirname;
const CLASH_DIR = path.join(ROOT, 'clash_bin');
const CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
const TEST_PORT = 7903; // 使用不同端口避免冲突

let clashProcess = null;

// 测试站点
const TEST_SITES = {
    excellent: [
        { name: 'Facebook', url: 'https://www.facebook.com' },
        { name: 'Twitter', url: 'https://twitter.com' },
        { name: 'YouTube', url: 'https://www.youtube.com' },
    ],
    good: [
        { name: 'Google', url: 'https://www.google.com' },
        { name: 'GitHub', url: 'https://github.com' },
    ],
    basic: [
        { name: 'Google204', url: 'http://www.gstatic.com/generate_204' },
    ]
};

// 测试站点
function testSite(url, timeout = 10) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        const curlArgs = [
            '-s', '-L', '-o', '/dev/null', '-w', '%{http_code}',
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
                resolve({ success: true, time: elapsed, httpCode: httpCode });
            } else {
                resolve({ success: false, time: elapsed, error: httpCode || 'timeout' });
            }
        });
        
        child.on('error', () => {
            resolve({ success: false, time: Date.now() - startTime, error: 'error' });
        });
    });
}

// 测试单个节点
async function testNode(proxy) {
    console.log(`\n测试节点: ${proxy.name}`);
    
    // 生成配置
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
    
    const configPath = path.join(CLASH_DIR, 'test_validator_config.yaml');
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
    
    // 测试各级别站点
    const results = {
        excellent: 0,
        good: 0,
        basic: 0,
        details: []
    };
    
    // 测试excellent级别
    for (const site of TEST_SITES.excellent) {
        const result = await testSite(site.url);
        results.details.push({ ...site, ...result });
        if (result.success) {
            results.excellent++;
            console.log(`  ✅ ${site.name}: ${result.httpCode} (${result.time}ms)`);
        } else {
            console.log(`  ❌ ${site.name}: ${result.error}`);
        }
    }
    
    // 测试good级别
    for (const site of TEST_SITES.good) {
        const result = await testSite(site.url);
        results.details.push({ ...site, ...result });
        if (result.success) {
            results.good++;
            console.log(`  ✅ ${site.name}: ${result.httpCode} (${result.time}ms)`);
        } else {
            console.log(`  ❌ ${site.name}: ${result.error}`);
        }
    }
    
    // 测试basic级别
    for (const site of TEST_SITES.basic) {
        const result = await testSite(site.url);
        results.details.push({ ...site, ...result });
        if (result.success) {
            results.basic++;
            console.log(`  ✅ ${site.name}: ${result.httpCode} (${result.time}ms)`);
        } else {
            console.log(`  ❌ ${site.name}: ${result.error}`);
        }
    }
    
    // 计算平均延迟
    const successfulTests = results.details.filter(r => r.success);
    const avgLatency = successfulTests.length > 0
        ? Math.round(successfulTests.reduce((sum, r) => sum + r.time, 0) / successfulTests.length)
        : 999;
    
    // 判断节点质量
    let quality = null;
    if (results.excellent >= 2) {
        quality = 'excellent';
    } else if (results.good >= 1) {
        quality = 'good';
    } else if (results.basic >= 1) {
        quality = 'basic';
    }
    
    console.log(`\n结果: ${quality || '不可用'} (平均延迟: ${avgLatency}ms)`);
    console.log(`  excellent: ${results.excellent}/3, good: ${results.good}/2, basic: ${results.basic}/1`);
    
    return { quality, avgLatency, results };
}

// 主函数
async function main() {
    console.log('========================================');
    console.log('   验证逻辑测试 (前10个节点)');
    console.log('========================================\n');
    
    // 读取节点
    const proxiesFile = path.join(ROOT, 'proxies.json');
    const allProxies = JSON.parse(fs.readFileSync(proxiesFile, 'utf8'));
    
    console.log(`总节点数: ${allProxies.length}`);
    console.log(`测试前10个节点...\n`);
    
    const testProxies = allProxies.slice(0, 10);
    const summary = {
        excellent: 0,
        good: 0,
        basic: 0,
        failed: 0
    };
    
    for (let i = 0; i < testProxies.length; i++) {
        console.log(`\n[${i + 1}/${testProxies.length}] ========================================`);
        
        try {
            const result = await testNode(testProxies[i]);
            
            if (result.quality) {
                summary[result.quality]++;
            } else {
                summary.failed++;
            }
        } catch (e) {
            console.log(`❌ 测试异常: ${e.message}`);
            summary.failed++;
        }
        
        // 间隔1秒
        await new Promise(r => setTimeout(r, 1000));
    }
    
    // 清理
    if (clashProcess) {
        clashProcess.kill('SIGTERM');
    }
    
    // 总结
    console.log('\n\n========================================');
    console.log('   测试总结');
    console.log('========================================');
    console.log(`总测试: ${testProxies.length}`);
    console.log(`  ✅ excellent: ${summary.excellent}`);
    console.log(`  ✅ good: ${summary.good}`);
    console.log(`  ✅ basic: ${summary.basic}`);
    console.log(`  ❌ failed: ${summary.failed}`);
    console.log(`\n成功率: ${Math.round((summary.excellent + summary.good + summary.basic) / testProxies.length * 100)}%`);
    
    process.exit(0);
}

// 优雅退出
process.on('SIGINT', () => {
    console.log('\n\n正在退出...');
    if (clashProcess) clashProcess.kill();
    process.exit(0);
});

// 启动
main().catch(e => {
    console.error('错误:', e);
    if (clashProcess) clashProcess.kill();
    process.exit(1);
});
