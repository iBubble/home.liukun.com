/**
 * 测试禁用IPv6后的连接
 * 强制使用IPv4
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const yaml = require('js-yaml');
const { execSync } = require('child_process');

const CLASH_DIR = path.join(__dirname, 'clash_bin');
const CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
const TEST_PORT = 17899;

async function testDisableIPv6() {
    console.log('========== 测试禁用IPv6 ==========\n');
    
    const proxyConfig = {
        name: 'AT_speednode_0003',
        type: 'vless',
        server: '152.53.131.209',
        port: 8443,
        tfo: true,
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
        port: TEST_PORT,
        'socks-port': TEST_PORT + 1,
        'allow-lan': false,
        mode: 'global',
        'log-level': 'info',
        'ipv6': false, // 🔥 禁用IPv6
        proxies: [proxyConfig],
        'proxy-groups': [{
            name: 'PROXY',
            type: 'select',
            proxies: ['AT_speednode_0003']
        }],
        rules: ['MATCH,PROXY']
    };
    
    const configPath = path.join(CLASH_DIR, 'test_no_ipv6_config.yaml');
    fs.writeFileSync(configPath, yaml.dump(config));
    
    console.log('✅ 配置已生成（IPv6已禁用）\n');
    
    console.log('🚀 启动Clash...\n');
    
    const clashProcess = spawn(CLASH_BIN, ['-d', CLASH_DIR, '-f', configPath], {
        stdio: ['ignore', 'pipe', 'pipe']
    });
    
    clashProcess.stdout.on('data', (data) => {
        process.stdout.write('[Clash] ' + data.toString());
    });
    
    clashProcess.stderr.on('data', (data) => {
        process.stderr.write('[Clash] ' + data.toString());
    });
    
    await new Promise(r => setTimeout(r, 3000));
    
    console.log('✅ Clash已启动\n');
    
    // 测试1: linux.do
    console.log('🔍 测试1: 访问 linux.do...');
    try {
        const result = execSync(
            `curl -s -x http://127.0.0.1:${TEST_PORT} -k --connect-timeout 10 --max-time 20 -o /dev/null -w "%{http_code}" https://linux.do`,
            { encoding: 'utf8', timeout: 25000 }
        );
        console.log(`  状态码: ${result.trim()}`);
        if (result.trim() === '200') {
            console.log('  ✅ 成功！\n');
        } else {
            console.log('  ⚠️ 非200状态码\n');
        }
    } catch (e) {
        console.log(`  ❌ 失败: ${e.message}\n`);
    }
    
    // 测试2: Google
    console.log('🔍 测试2: 访问 Google...');
    try {
        const result = execSync(
            `curl -s -x http://127.0.0.1:${TEST_PORT} -k --connect-timeout 10 --max-time 20 -o /dev/null -w "%{http_code}" https://www.google.com`,
            { encoding: 'utf8', timeout: 25000 }
        );
        console.log(`  状态码: ${result.trim()}`);
        if (result.trim() === '200') {
            console.log('  ✅ 成功！\n');
        } else {
            console.log('  ⚠️ 非200状态码\n');
        }
    } catch (e) {
        console.log(`  ❌ 失败: ${e.message}\n`);
    }
    
    // 测试3: Facebook
    console.log('🔍 测试3: 访问 Facebook...');
    try {
        const result = execSync(
            `curl -s -x http://127.0.0.1:${TEST_PORT} -k --connect-timeout 10 --max-time 20 -o /dev/null -w "%{http_code}" https://www.facebook.com`,
            { encoding: 'utf8', timeout: 25000 }
        );
        console.log(`  状态码: ${result.trim()}`);
        if (result.trim() === '200' || result.trim() === '301' || result.trim() === '302') {
            console.log('  ✅ 成功！\n');
        } else {
            console.log('  ⚠️ 非200状态码\n');
        }
    } catch (e) {
        console.log(`  ❌ 失败: ${e.message}\n`);
    }
    
    console.log('🛑 停止Clash...');
    clashProcess.kill('SIGTERM');
    
    await new Promise(r => setTimeout(r, 1000));
    
    console.log('\n========== 测试完成 ==========');
}

testDisableIPv6().catch(console.error);
