#!/usr/bin/env node
/**
 * 测试可用节点能否访问Facebook
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = __dirname;
const CLASH_DIR = path.join(ROOT, 'clash_bin');
const CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
const TEST_PORT = 7907;

let clashProcess = null;

const TEST_SITES = [
    { name: 'Google204', url: 'http://www.google.com/generate_204' },
    { name: 'Facebook', url: 'http://www.facebook.com' },
    { name: 'Twitter', url: 'http://twitter.com' },
    { name: 'YouTube', url: 'http://www.youtube.com' },
];

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
    console.log(`\n测试节点: ${proxy.name}`);
    
    const config = {
        port: TEST_PORT,
        'socks-port': TEST_PORT + 1,
        'allow-lan': false,
        mode: 'rule',
        'log-level': 'silent',
        proxies: [proxy],
        'proxy-groups': [{
            name: 'test',
            type: 'select',
            proxies: [proxy.name]
        }],
        rules: ['MATCH,test']
    };
    
    const configPath = path.join(CLASH_DIR, 'fb_test_config.yaml');
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
    
    await new Promise(r => setTimeout(r, 5000));
    
    const results = {
        excellent: 0,
        good: 0,
        basic: 0
    };
    
    for (const site of TEST_SITES) {
        const result = await testSite(site.url, 30);
        
        if (result.success) {
            console.log(`  ✅ ${site.name}: ${result.httpCode} (${result.time}ms)`);
            
            if (site.name === 'Google204') results.basic++;
            if (site.name === 'Facebook' || site.name === 'Twitter' || site.name === 'YouTube') results.excellent++;
        } else {
            console.log(`  ❌ ${site.name}: ${result.error}`);
        }
    }
    
    let quality = null;
    if (results.excellent >= 2) {
        quality = 'excellent';
    } else if (results.basic >= 1) {
        quality = 'basic';
    }
    
    console.log(`结果: ${quality || '不可用'}`);
    
    return quality;
}

async function main() {
    console.log('测试前5个节点能否访问Facebook等网站\n');
    
    const proxiesFile = path.join(ROOT, 'proxies.json');
    const allProxies = JSON.parse(fs.readFileSync(proxiesFile, 'utf8'));
    
    // 跳过第一个(CN4),测试2-6号节点
    const testProxies = allProxies.slice(1, 6);
    
    const summary = {
        excellent: 0,
        basic: 0,
        failed: 0
    };
    
    for (let i = 0; i < testProxies.length; i++) {
        console.log(`\n[${i + 1}/5] ========================================`);
        
        try {
            const quality = await testNode(testProxies[i]);
            
            if (quality === 'excellent') {
                summary.excellent++;
            } else if (quality === 'basic') {
                summary.basic++;
            } else {
                summary.failed++;
            }
        } catch (e) {
            console.log(`❌ 异常: ${e.message}`);
            summary.failed++;
        }
        
        await new Promise(r => setTimeout(r, 1000));
    }
    
    if (clashProcess) clashProcess.kill();
    
    console.log('\n\n========================================');
    console.log('测试总结');
    console.log('========================================');
    console.log(`excellent (能访问Facebook等): ${summary.excellent}`);
    console.log(`basic (只能访问Google204): ${summary.basic}`);
    console.log(`failed (不可用): ${summary.failed}`);
    
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
