#!/usr/bin/env node
/**
 * 使用NodeLocalChecker的方法测试前10个节点
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = __dirname;
const CLASH_DIR = path.join(ROOT, 'clash_bin');
const CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
const TEST_PORT = 7906;

let clashProcess = null;

// 使用NodeLocalChecker的测试URL
const TEST_URL = 'http://www.google.com/generate_204';

function testSite(url, timeout = 30) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        const curlArgs = [
            '-s', '-L', '-o', '/dev/null', '-w', '%{http_code}',
            '--max-time', timeout.toString(),
            '--connect-timeout', '5',
            '-x', `http://127.0.0.1:${TEST_PORT}`,
            url
        ];
        
        const child = spawn('curl', curlArgs, { 
            timeout: (timeout + 2) * 1000,
            env: {
                ...process.env,
                HTTP_PROXY: '',
                HTTPS_PROXY: '',
                http_proxy: '',
                https_proxy: '',
                ALL_PROXY: '',
                all_proxy: ''
            }
        });
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

async function testNode(proxy) {
    const config = {
        port: TEST_PORT,
        'socks-port': TEST_PORT + 1,
        'allow-lan': false,
        mode: 'rule',  // 使用rule模式 (NodeLocalChecker使用)
        'log-level': 'silent',
        proxies: [proxy],
        'proxy-groups': [{
            name: 'test',
            type: 'select',
            proxies: [proxy.name]
        }],
        rules: ['MATCH,test']  // 所有流量通过代理
    };
    
    const configPath = path.join(CLASH_DIR, 'new_method_config.yaml');
    fs.writeFileSync(configPath, yaml.dump(config));
    
    if (clashProcess) {
        clashProcess.kill('SIGTERM');
        await new Promise(r => setTimeout(r, 500));
    }
    
    clashProcess = spawn(CLASH_BIN, ['-d', CLASH_DIR, '-f', configPath], {
        stdio: 'pipe',
        env: {
            ...process.env,
            HTTP_PROXY: '',
            HTTPS_PROXY: '',
            http_proxy: '',
            https_proxy: '',
            ALL_PROXY: '',
            all_proxy: ''
        }
    });
    
    // 等待5秒启动 (NodeLocalChecker方法)
    await new Promise(r => setTimeout(r, 5000));
    
    // 测试
    const result = await testSite(TEST_URL, 30);
    
    return result;
}

async function main() {
    console.log('使用NodeLocalChecker方法测试前10个节点\n');
    
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
                console.log(`  ✅ 可用 (${result.time}ms, HTTP ${result.httpCode})\n`);
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
