/**
 * 尝试使用TUN模式或者确保流量真正走代理
 * 问题：Clash似乎在尝试直接连接目标，而不是通过代理服务器
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

async function testProperProxying() {
    console.log('========== 测试确保流量走代理 ==========\n');
    
    // 关键：检查Clash是否真的在使用代理节点
    console.log('📋 分析：');
    console.log('  问题：Clash尝试直接连接目标IP（linux.do:443）');
    console.log('  原因：虚拟机网络被限制，无法访问国外IP');
    console.log('  解决：确保Clash通过代理服务器转发流量\n');
    
    const proxyConfig = {
        name: 'AT_speednode_0003',
        type: 'vless',
        server: '152.53.131.209',
        port: 8443,
        tfo: false, // 🔥 尝试禁用TFO
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
        'mixed-port': 17901, // 混合端口
        'allow-lan': false,
        mode: 'global', // 全局模式
        'log-level': 'debug', // debug级别查看详细日志
        proxies: [proxyConfig],
        'proxy-groups': [{
            name: 'PROXY',
            type: 'select',
            proxies: ['AT_speednode_0003']
        }],
        rules: [
            'MATCH,PROXY' // 所有流量走代理
        ]
    };
    
    const configPath = path.join(CLASH_DIR, 'test_proper_proxy_config.yaml');
    fs.writeFileSync(configPath, yaml.dump(config));
    
    console.log('✅ 配置已生成（TFO=false, debug模式）\n');
    
    console.log('🚀 启动Clash...\n');
    
    const clashProcess = spawn(CLASH_BIN, ['-d', CLASH_DIR, '-f', configPath], {
        stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let clashLogs = '';
    
    clashProcess.stdout.on('data', (data) => {
        const text = data.toString();
        clashLogs += text;
        // 只显示关键日志
        if (text.includes('dial') || text.includes('connect') || text.includes('error')) {
            process.stdout.write('[Clash] ' + text);
        }
    });
    
    clashProcess.stderr.on('data', (data) => {
        const text = data.toString();
        clashLogs += text;
        process.stderr.write('[Clash Error] ' + text);
    });
    
    await new Promise(r => setTimeout(r, 3000));
    
    console.log('✅ Clash已启动\n');
    
    // 测试：访问一个简单的HTTP网站
    console.log('🔍 测试: 访问 http://example.com (简单HTTP)...');
    try {
        const result = execSync(
            `curl -v -x http://127.0.0.1:${HTTP_PORT} --connect-timeout 20 --max-time 30 http://example.com 2>&1`,
            { encoding: 'utf8', timeout: 35000 }
        );
        
        if (result.includes('Example Domain')) {
            console.log('  ✅ 成功！HTTP代理工作正常\n');
        } else {
            console.log('  ⚠️ 响应异常');
            console.log('  响应:', result.substring(0, 200));
        }
    } catch (e) {
        console.log(`  ❌ 失败`);
        const output = e.stdout || e.message;
        console.log('  错误:', output.substring(output.length - 300));
    }
    
    console.log('\n📝 保存完整Clash日志...');
    fs.writeFileSync('clash_proper_proxy_debug.log', clashLogs);
    console.log('  日志已保存到: clash_proper_proxy_debug.log\n');
    
    console.log('🛑 停止Clash...');
    clashProcess.kill('SIGTERM');
    
    await new Promise(r => setTimeout(r, 1000));
    
    console.log('\n========== 测试完成 ==========');
    console.log('\n💡 下一步：检查日志中Clash是否尝试连接到152.53.131.209（代理服务器）');
    console.log('   而不是直接连接目标IP');
}

testProperProxying().catch(console.error);
