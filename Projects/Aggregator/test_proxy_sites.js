#!/usr/bin/env node
/**
 * 系统测试代理访问各个国外站点
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = __dirname;
const CLASH_DIR = path.join(ROOT, 'clash_bin');
const CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
const TEST_PORT = 7898;

console.log('========================================');
console.log('   代理访问测试 - 国外站点');
console.log('========================================\n');

// 读取节点 - 选择最快的10个
const proxiesFile = path.join(ROOT, 'proxies.json');
const allProxies = JSON.parse(fs.readFileSync(proxiesFile, 'utf8'));

// 选择美国、香港、日本节点
const regions = ['US', 'HK', 'JP', '美国', '香港', '日本'];
const targetProxies = allProxies.filter(p => {
    const name = (p.name || '').toUpperCase();
    return regions.some(r => name.includes(r));
}).slice(0, 10);

console.log(`📋 使用 ${targetProxies.length} 个节点\n`);
targetProxies.forEach((p, i) => {
    console.log(`  ${i+1}. ${p.name} (${p.type})`);
});
console.log('');

// 生成Clash配置 - 使用url-test自动选择最快节点
const config = {
    port: TEST_PORT,
    'socks-port': TEST_PORT + 1,
    'allow-lan': false,
    mode: 'global',
    'log-level': 'warning',
    proxies: targetProxies,
    'proxy-groups': [{
        name: 'PROXY',
        type: 'url-test',
        proxies: targetProxies.map(p => p.name),
        url: 'http://www.gstatic.com/generate_204',
        interval: 300,
        tolerance: 50
    }],
    rules: ['MATCH,PROXY']
};

const configPath = path.join(CLASH_DIR, 'test_sites_config.yaml');
fs.writeFileSync(configPath, yaml.dump(config));

console.log('🚀 启动Clash代理...\n');

const clashProcess = spawn(CLASH_BIN, ['-d', CLASH_DIR, '-f', configPath], {
    stdio: 'pipe'
});

let clashOutput = '';
clashProcess.stdout.on('data', d => clashOutput += d.toString());
clashProcess.stderr.on('data', d => clashOutput += d.toString());

// 等待Clash启动和自动测速
setTimeout(async () => {
    console.log('⏳ Clash已启动,等待自动测速...\n');
    
    await new Promise(r => setTimeout(r, 5000));
    
    console.log('开始测试各个站点...\n');
    console.log('========================================\n');
    
    // 测试站点列表
    const sites = [
        { name: 'Google', url: 'https://www.google.com', expect: '200' },
        { name: 'Google (204)', url: 'http://www.gstatic.com/generate_204', expect: '204' },
        { name: 'GitHub', url: 'https://github.com', expect: '200' },
        { name: 'Twitter', url: 'https://twitter.com', expect: '200' },
        { name: 'Facebook', url: 'https://www.facebook.com', expect: '200' },
        { name: 'YouTube', url: 'https://www.youtube.com', expect: '200' },
        { name: 'Wikipedia', url: 'https://en.wikipedia.org', expect: '200' },
        { name: 'Reddit', url: 'https://www.reddit.com', expect: '200' },
    ];
    
    const results = [];
    
    for (const site of sites) {
        process.stdout.write(`测试 ${site.name.padEnd(20)} ... `);
        const result = await testSite(site.url);
        results.push({ ...site, ...result });
        
        if (result.success) {
            console.log(`✅ ${result.httpCode} (${result.time}ms)`);
        } else {
            console.log(`❌ ${result.error} (${result.time}ms)`);
        }
        
        // 间隔1秒
        await new Promise(r => setTimeout(r, 1000));
    }
    
    // 汇总
    console.log('\n========================================');
    console.log('   测试结果汇总');
    console.log('========================================\n');
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`成功: ${successful.length}/${results.length}`);
    console.log(`失败: ${failed.length}/${results.length}`);
    console.log(`成功率: ${Math.round(successful.length/results.length*100)}%\n`);
    
    if (successful.length > 0) {
        console.log('✅ 成功访问的站点:');
        successful.forEach(r => {
            console.log(`  - ${r.name} (${r.time}ms)`);
        });
        console.log('');
    }
    
    if (failed.length > 0) {
        console.log('❌ 失败的站点:');
        failed.forEach(r => {
            console.log(`  - ${r.name}: ${r.error}`);
        });
        console.log('');
    }
    
    // 平均延迟
    if (successful.length > 0) {
        const avgTime = Math.round(successful.reduce((sum, r) => sum + r.time, 0) / successful.length);
        console.log(`平均延迟: ${avgTime}ms\n`);
    }
    
    // 结论
    if (successful.length >= results.length * 0.7) {
        console.log('✅ 代理工作正常!');
    } else if (successful.length > 0) {
        console.log('⚠️ 代理部分可用,可能存在问题');
    } else {
        console.log('❌ 代理不可用');
    }
    
    // 清理
    clashProcess.kill('SIGTERM');
    process.exit(0);
}, 3000);

function testSite(url) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        const curlArgs = [
            '-s',
            '-L',  // 跟随重定向
            '-o', '/dev/null',
            '-w', '%{http_code}',
            '--max-time', '15',
            '-x', `http://127.0.0.1:${TEST_PORT}`,
            url
        ];
        
        const child = spawn('curl', curlArgs, { timeout: 18000 });
        let data = '';
        let error = '';
        
        child.stdout.on('data', chunk => data += chunk);
        child.stderr.on('data', chunk => error += chunk);
        
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
                    error: httpCode || error || 'timeout',
                    httpCode: httpCode
                });
            }
        });
        
        child.on('error', (err) => {
            resolve({
                success: false,
                time: Date.now() - startTime,
                error: err.message
            });
        });
    });
}
