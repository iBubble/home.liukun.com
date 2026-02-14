/**
 * 使用已经验证可以工作的配置测试HTTPS
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const yaml = require('js-yaml');
const { execSync } = require('child_process');

const CLASH_DIR = path.join(__dirname, 'clash_bin');
const CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
const HTTP_PORT = 17899;

async function testHTTPS() {
    console.log('========== 测试HTTPS连接 ==========\n');
    
    const proxyConfig = {
        name: 'AT_speednode_0003',
        type: 'vless',
        server: '152.53.131.209',
        port: 8443,
        tfo: false, // TFO=false 已验证可以工作
        'skip-cert-verify': true,
        uuid: '6202b230-417c-4d8e-b624-0f71afa9c75d',
        network: 'ws',
        tls: true,
        servername: 'sni.111000.indevs.in',
        udp: true,
        'ws-opts': {
            path: '/?ed=2560fp=chrome',
            headers: {
                Host: 'sni.111000.indevs.in'
            }
        }
    };
    
    const config = {
        port: HTTP_PORT,
        'socks-port': HTTP_PORT + 1,
        'allow-lan': false,
        mode: 'global',
        'log-level': 'info',
        proxies: [proxyConfig],
        'proxy-groups': [{
            name: 'PROXY',
            type: 'select',
            proxies: ['AT_speednode_0003']
        }],
        rules: ['MATCH,PROXY']
    };
    
    const configPath = path.join(CLASH_DIR, 'test_https_config.yaml');
    fs.writeFileSync(configPath, yaml.dump(config));
    
    console.log('✅ 配置已生成（TFO=false）\n');
    
    console.log('🚀 启动Clash...\n');
    
    const clashProcess = spawn(CLASH_BIN, ['-d', CLASH_DIR, '-f', configPath], {
        stdio: ['ignore', 'pipe', 'pipe']
    });
    
    clashProcess.stdout.on('data', (data) => {
        process.stdout.write('[Clash] ' + data.toString());
    });
    
    clashProcess.stderr.on('data', (data) => {
        process.stderr.write('[Clash Error] ' + data.toString());
    });
    
    await new Promise(r => setTimeout(r, 3000));
    
    console.log('✅ Clash已启动\n');
    
    // 测试1: HTTPS - example.com
    console.log('🔍 测试1: HTTPS访问 https://example.com...');
    try {
        const result = execSync(
            `curl -s -x http://127.0.0.1:${HTTP_PORT} -k --connect-timeout 15 --max-time 30 -o /dev/null -w "%{http_code}" https://example.com`,
            { encoding: 'utf8', timeout: 35000 }
        );
        console.log(`  状态码: ${result.trim()}`);
        if (result.trim() === '200') {
            console.log('  ✅ 成功！\n');
        }
    } catch (e) {
        console.log(`  ❌ 失败: ${e.message}\n`);
    }
    
    // 测试2: HTTPS - Google
    console.log('🔍 测试2: HTTPS访问 https://www.google.com...');
    try {
        const result = execSync(
            `curl -s -x http://127.0.0.1:${HTTP_PORT} -k --connect-timeout 15 --max-time 30 -o /dev/null -w "%{http_code}" https://www.google.com`,
            { encoding: 'utf8', timeout: 35000 }
        );
        console.log(`  状态码: ${result.trim()}`);
        if (result.trim() === '200') {
            console.log('  ✅ 成功！\n');
        }
    } catch (e) {
        console.log(`  ❌ 失败: ${e.message}\n`);
    }
    
    // 测试3: HTTPS - linux.do
    console.log('🔍 测试3: HTTPS访问 https://linux.do...');
    try {
        const result = execSync(
            `curl -s -x http://127.0.0.1:${HTTP_PORT} -k --connect-timeout 15 --max-time 30 -o /dev/null -w "%{http_code}" https://linux.do`,
            { encoding: 'utf8', timeout: 35000 }
        );
        console.log(`  状态码: ${result.trim()}`);
        if (result.trim() === '200') {
            console.log('  ✅ 成功！\n');
        }
    } catch (e) {
        console.log(`  ❌ 失败: ${e.message}\n`);
    }
    
    // 测试4: HTTPS - Facebook
    console.log('🔍 测试4: HTTPS访问 https://www.facebook.com...');
    try {
        const result = execSync(
            `curl -s -x http://127.0.0.1:${HTTP_PORT} -k --connect-timeout 15 --max-time 30 -o /dev/null -w "%{http_code}" https://www.facebook.com`,
            { encoding: 'utf8', timeout: 35000 }
        );
        console.log(`  状态码: ${result.trim()}`);
        if (result.trim() === '200' || result.trim() === '301' || result.trim() === '302') {
            console.log('  ✅ 成功！\n');
        }
    } catch (e) {
        console.log(`  ❌ 失败: ${e.message}\n`);
    }
    
    console.log('🛑 停止Clash...');
    clashProcess.kill('SIGTERM');
    
    await new Promise(r => setTimeout(r, 1000));
    
    console.log('\n========== 测试完成 ==========');
}

testHTTPS().catch(console.error);
