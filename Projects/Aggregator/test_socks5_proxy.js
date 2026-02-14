/**
 * 测试使用SOCKS5代理（而不是HTTP代理）
 * Clash的SOCKS5代理可能比HTTP代理更稳定
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const yaml = require('js-yaml');
const { execSync } = require('child_process');

const CLASH_DIR = path.join(__dirname, 'clash_bin');
const CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
const HTTP_PORT = 17899;
const SOCKS_PORT = 17900;

async function testSOCKS5Proxy() {
    console.log('========== 测试SOCKS5代理 ==========\n');
    
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
        port: HTTP_PORT,
        'socks-port': SOCKS_PORT,
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
    
    const configPath = path.join(CLASH_DIR, 'test_socks5_config.yaml');
    fs.writeFileSync(configPath, yaml.dump(config));
    
    console.log('✅ 配置已生成\n');
    
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
    
    // 测试1: 使用SOCKS5代理访问linux.do
    console.log('🔍 测试1: 使用SOCKS5代理访问 linux.do...');
    try {
        const result = execSync(
            `curl -v --socks5 127.0.0.1:${SOCKS_PORT} -k --connect-timeout 15 --max-time 30 -o /dev/null -w "%{http_code}" https://linux.do 2>&1`,
            { encoding: 'utf8', timeout: 35000 }
        );
        
        const statusCode = result.match(/\d{3}$/)?.[0];
        console.log(`  状态码: ${statusCode || '未知'}`);
        
        if (statusCode === '200') {
            console.log('  ✅ 成功！\n');
        } else {
            console.log('  ⚠️ 非200状态码');
            console.log('  详细输出:', result.substring(result.length - 500));
        }
    } catch (e) {
        console.log(`  ❌ 失败`);
        console.log('  错误:', e.stdout?.substring(e.stdout.length - 500) || e.message);
    }
    
    console.log('\n');
    
    // 测试2: 使用HTTP代理访问linux.do（对比）
    console.log('🔍 测试2: 使用HTTP代理访问 linux.do（对比）...');
    try {
        const result = execSync(
            `curl -v -x http://127.0.0.1:${HTTP_PORT} -k --connect-timeout 15 --max-time 30 -o /dev/null -w "%{http_code}" https://linux.do 2>&1`,
            { encoding: 'utf8', timeout: 35000 }
        );
        
        const statusCode = result.match(/\d{3}$/)?.[0];
        console.log(`  状态码: ${statusCode || '未知'}`);
        
        if (statusCode === '200') {
            console.log('  ✅ 成功！\n');
        } else {
            console.log('  ⚠️ 非200状态码');
            console.log('  详细输出:', result.substring(result.length - 500));
        }
    } catch (e) {
        console.log(`  ❌ 失败`);
        console.log('  错误:', e.stdout?.substring(e.stdout.length - 500) || e.message);
    }
    
    console.log('\n🛑 停止Clash...');
    clashProcess.kill('SIGTERM');
    
    await new Promise(r => setTimeout(r, 1000));
    
    console.log('\n========== 测试完成 ==========');
}

testSOCKS5Proxy().catch(console.error);
