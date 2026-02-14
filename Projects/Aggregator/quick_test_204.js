#!/usr/bin/env node
/**
 * 快速测试前10个节点能否访问Google 204
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = __dirname;
const CLASH_DIR = path.join(ROOT, 'clash_bin');
const CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
const TEST_PORT = 7904;

let clashProcess = null;

// 测试204
function test204(timeout = 10) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const url = 'http://www.gstatic.com/generate_204';
        
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
            
            if (code === 0 && httpCode === '204') {
                resolve({ success: true, time: elapsed });
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
    
    const configPath = path.join(CLASH_DIR, 'quick_test_config.yaml');
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
    
    // 测试204
    const result = await test204();
    
    return result;
}

// 主函数
async function main() {
    console.log('快速测试前10个节点 (Google 204)\n');
    
    const proxiesFile = path.join(ROOT, 'proxies.json');
    const allProxies = JSON.parse(fs.readFileSync(proxiesFile, 'utf8'));
    
    const testProxies = allProxies.slice(0, 10);
    let successCount = 0;
    
    for (let i = 0; i < testProxies.length; i++) {
        const proxy = testProxies[i];
        console.log(`[${i + 1}/10] ${proxy.name}`);
        
        try {
            const result = await testNode(proxy);
            
            if (result.success) {
                console.log(`  ✅ 可用 (${result.time}ms)\n`);
                successCount++;
            } else {
                console.log(`  ❌ 不可用 (${result.error})\n`);
            }
        } catch (e) {
            console.log(`  ❌ 异常: ${e.message}\n`);
        }
        
        await new Promise(r => setTimeout(r, 1000));
    }
    
    if (clashProcess) clashProcess.kill();
    
    console.log(`\n成功: ${successCount}/10`);
    process.exit(0);
}

process.on('SIGINT', () => {
    if (clashProcess) clashProcess.kill();
    process.exit(0);
});

main().catch(e => {
    console.error(e);
    if (clashProcess) clashProcess.kill();
    process.exit(1);
});
