/**
 * 测试添加DNS配置和更长超时
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const yaml = require('js-yaml');
const { execSync } = require('child_process');

const CLASH_DIR = path.join(__dirname, 'clash_bin');
const CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
const TEST_PORT = 17899;

async function testWithDNSConfig() {
    console.log('========== 测试添加DNS配置 ==========\n');
    
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
        ipv6: false,
        // 🔥 添加DNS配置
        dns: {
            enable: true,
            listen: '0.0.0.0:1053',
            'enhanced-mode': 'fake-ip',
            'fake-ip-range': '198.18.0.1/16',
            nameserver: [
                '8.8.8.8',
                '1.1.1.1',
                '223.5.5.5'
            ],
            fallback: [
                'tls://8.8.8.8:853',
                'tls://1.1.1.1:853'
            ]
        },
        proxies: [proxyConfig],
        'proxy-groups': [{
            name: 'PROXY',
            type: 'select',
            proxies: ['AT_speednode_0003']
        }],
        rules: ['MATCH,PROXY']
    };
    
    const configPath = path.join(CLASH_DIR, 'test_dns_config.yaml');
    fs.writeFileSync(configPath, yaml.dump(config));
    
    console.log('✅ 配置已生成（包含DNS配置）\n');
    
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
    
    // 等待更长时间让DNS初始化
    await new Promise(r => setTimeout(r, 5000));
    
    console.log('✅ Clash已启动\n');
    
    // 测试1: linux.do - 使用更长的超时
    console.log('🔍 测试1: 访问 linux.do (60秒超时)...');
    try {
        const result = execSync(
            `curl -s -x http://127.0.0.1:${TEST_PORT} -k --connect-timeout 30 --max-time 60 -o /dev/null -w "%{http_code}" https://linux.do`,
            { encoding: 'utf8', timeout: 65000 }
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
    
    // 测试2: 简单的HTTP请求（不是HTTPS）
    console.log('🔍 测试2: 访问 http://example.com...');
    try {
        const result = execSync(
            `curl -s -x http://127.0.0.1:${TEST_PORT} --connect-timeout 30 --max-time 60 -o /dev/null -w "%{http_code}" http://example.com`,
            { encoding: 'utf8', timeout: 65000 }
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
    
    console.log('🛑 停止Clash...');
    clashProcess.kill('SIGTERM');
    
    await new Promise(r => setTimeout(r, 1000));
    
    console.log('\n========== 测试完成 ==========');
}

testWithDNSConfig().catch(console.error);
