/**
 * 使用与Aggregator.yaml完全相同的配置测试 AT_speednode_0003
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const yaml = require('js-yaml');

const CLASH_DIR = path.join(__dirname, 'clash_bin');
const CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
const TEST_PORT = 17899;

async function testWithExactConfig() {
    console.log('========== 使用完全相同的配置测试 AT_speednode_0003 ==========\n');
    
    // 使用与Aggregator.yaml完全相同的配置
    const proxyConfig = {
        name: 'AT_speednode_0003',
        type: 'vless',
        server: '152.53.131.209',
        port: 8443,
        tfo: true, // 🔥 关键：TFO
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
        proxies: [proxyConfig],
        'proxy-groups': [{
            name: 'PROXY',
            type: 'select',
            proxies: ['AT_speednode_0003']
        }],
        rules: ['MATCH,PROXY']
    };
    
    const configPath = path.join(CLASH_DIR, 'test_at_exact_config.yaml');
    fs.writeFileSync(configPath, yaml.dump(config));
    
    console.log('✅ 配置已生成（与Aggregator.yaml完全一致）\n');
    
    // 启动Clash
    console.log('🚀 启动Clash...');
    const clashProcess = spawn(CLASH_BIN, ['-d', CLASH_DIR, '-f', configPath], {
        stdio: ['ignore', 'pipe', 'pipe']
    });
    
    clashProcess.stdout.on('data', (data) => {
        console.log('[Clash] ' + data.toString().trim());
    });
    
    clashProcess.stderr.on('data', (data) => {
        console.error('[Clash Error] ' + data.toString().trim());
    });
    
    // 等待Clash启动
    await new Promise(r => setTimeout(r, 5000));
    console.log('✅ Clash已启动\n');
    
    // 测试访问linux.do
    console.log('测试访问 linux.do...');
    
    try {
        const result = await new Promise((resolve) => {
            const curl = spawn('curl', [
                '-v',
                '-x', `http://127.0.0.1:${TEST_PORT}`,
                '--max-time', '20',
                '-k',
                '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'https://linux.do'
            ], { timeout: 25000 });
            
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
            console.log(`✅ 成功访问 linux.do！`);
            console.log(`响应长度: ${result.output.length} 字节`);
            console.log(`响应预览: ${result.output.substring(0, 200)}...`);
        } else {
            console.log(`❌ 失败 (exit code: ${result.code})`);
            // 显示详细错误
            console.log('\n完整错误信息:');
            console.log(result.error);
        }
    } catch (e) {
        console.log(`❌ 异常: ${e.message}`);
    }
    
    // 停止Clash
    console.log('\n🛑 停止Clash...');
    try {
        clashProcess.kill('SIGTERM');
        await new Promise(r => setTimeout(r, 1000));
        if (!clashProcess.killed) {
            clashProcess.kill('SIGKILL');
        }
    } catch (e) {}
    
    console.log('\n========== 测试完成 ==========');
}

testWithExactConfig().catch(console.error);
