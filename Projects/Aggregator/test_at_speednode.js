/**
 * 测试 AT_speednode_0003 节点（与Clash客户端中相同的节点）
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const yaml = require('js-yaml');

const CLASH_DIR = path.join(__dirname, 'clash_bin');
const CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
const TEST_PORT = 17893;

async function testATSpeednode() {
    console.log('========== 测试 AT_speednode_0003 节点 ==========\n');
    
    // 读取节点配置
    const proxiesFile = path.join(__dirname, 'proxies.json');
    const proxies = JSON.parse(fs.readFileSync(proxiesFile, 'utf8'));
    
    const targetNode = proxies.find(p => p.name === 'AT_speednode_0003');
    
    if (!targetNode) {
        console.log('❌ 未找到 AT_speednode_0003 节点');
        return;
    }
    
    console.log('✅ 找到节点:');
    console.log(`   名称: ${targetNode.name}`);
    console.log(`   类型: ${targetNode.type}`);
    console.log(`   服务器: ${targetNode.server}:${targetNode.port}`);
    console.log(`   延迟: ${targetNode.latency}ms`);
    console.log('');
    
    // 生成Clash配置（确保包含所有必要字段）
    const proxyConfig = {
        name: targetNode.name,
        type: targetNode.type,
        server: targetNode.server,
        port: targetNode.port,
        uuid: targetNode.uuid,
        tls: targetNode.tls,
        'skip-cert-verify': true, // 🔥 关键：跳过证书验证
        network: targetNode.network,
        servername: targetNode.servername,
        udp: true, // 🔥 启用UDP
        'ws-opts': targetNode['ws-opts']
    };
    
    const config = {
        port: TEST_PORT,
        'socks-port': TEST_PORT + 1,
        'allow-lan': false,
        mode: 'global',
        'log-level': 'info', // 🔥 改为info以查看详细日志
        proxies: [proxyConfig],
        'proxy-groups': [{
            name: 'PROXY',
            type: 'select',
            proxies: [targetNode.name]
        }],
        rules: ['MATCH,PROXY']
    };
    
    const configPath = path.join(CLASH_DIR, 'test_at_speednode_config.yaml');
    fs.writeFileSync(configPath, yaml.dump(config));
    
    console.log('📝 Clash配置已生成');
    console.log('');
    
    // 启动Clash
    console.log('🚀 启动Clash...');
    const clashProcess = spawn(CLASH_BIN, ['-d', CLASH_DIR, '-f', configPath], {
        stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let clashOutput = '';
    let clashError = '';
    
    clashProcess.stdout.on('data', (data) => {
        const output = data.toString();
        clashOutput += output;
        console.log('[Clash] ' + output.trim());
    });
    
    clashProcess.stderr.on('data', (data) => {
        const error = data.toString();
        clashError += error;
        console.error('[Clash Error] ' + error.trim());
    });
    
    // 等待Clash启动
    await new Promise(r => setTimeout(r, 5000));
    
    console.log('\n✅ Clash已启动，开始测试连接...\n');
    
    // 测试连接
    const tests = [
        { name: 'Cloudflare', url: 'https://www.cloudflare.com/cdn-cgi/trace' },
        { name: 'Google', url: 'https://www.google.com' },
        { name: 'GitHub API', url: 'https://api.github.com' }
    ];
    
    for (const test of tests) {
        console.log(`测试 ${test.name}...`);
        
        try {
            const result = await new Promise((resolve) => {
                const curl = spawn('curl', [
                    '-v', // 详细输出
                    '-x', `http://127.0.0.1:${TEST_PORT}`,
                    '--max-time', '15',
                    '-k', // 忽略SSL证书验证
                    test.url
                ], { timeout: 20000 });
                
                let output = '';
                let error = '';
                
                curl.stdout.on('data', d => output += d.toString());
                curl.stderr.on('data', d => error += d.toString());
                
                curl.on('close', (code) => {
                    resolve({ code, output, error });
                });
                
                curl.on('error', (err) => {
                    resolve({ code: -1, error: err.message });
                });
            });
            
            if (result.code === 0) {
                console.log(`  ✅ ${test.name}: 成功`);
                console.log(`  响应: ${result.output.substring(0, 100)}...`);
            } else {
                console.log(`  ❌ ${test.name}: 失败 (exit code: ${result.code})`);
                if (result.error) {
                    console.log(`  错误信息: ${result.error.substring(0, 200)}`);
                }
            }
        } catch (e) {
            console.log(`  ❌ ${test.name}: 异常 - ${e.message}`);
        }
        
        console.log('');
    }
    
    // 停止Clash
    console.log('🛑 停止Clash...');
    try {
        clashProcess.kill('SIGTERM');
        await new Promise(r => setTimeout(r, 1000));
        if (!clashProcess.killed) {
            clashProcess.kill('SIGKILL');
        }
    } catch (e) {
        console.error('停止Clash失败:', e.message);
    }
    
    console.log('\n========== 测试完成 ==========');
}

testATSpeednode().catch(console.error);
