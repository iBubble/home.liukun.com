/**
 * 测试 香港·2号线 节点访问 linux.do
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const yaml = require('js-yaml');

const CLASH_DIR = path.join(__dirname, 'clash_bin');
const CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
const TEST_PORT = 17897;

async function testHK2Node() {
    console.log('========== 测试 香港·2号线 节点 ==========\n');
    
    // 读取节点
    const proxiesFile = path.join(__dirname, 'proxies.json');
    const proxies = JSON.parse(fs.readFileSync(proxiesFile, 'utf8'));
    
    const targetNode = proxies.find(p => p.name && p.name.includes('香港') && p.name.includes('2号线'));
    
    if (!targetNode) {
        console.log('❌ 未找到香港·2号线节点');
        return;
    }
    
    console.log(`✅ 使用节点: ${targetNode.name}`);
    console.log(`   类型: ${targetNode.type}`);
    console.log(`   服务器: ${targetNode.server}:${targetNode.port}`);
    console.log(`   延迟: ${targetNode.latency}ms`);
    console.log('');
    
    // 生成Clash配置
    const proxyConfig = {
        ...targetNode,
        'skip-cert-verify': true,
        udp: true
    };
    
    const config = {
        port: TEST_PORT,
        'socks-port': TEST_PORT + 1,
        'allow-lan': false,
        mode: 'global',
        'log-level': 'warning',
        proxies: [proxyConfig],
        'proxy-groups': [{
            name: 'PROXY',
            type: 'select',
            proxies: [targetNode.name]
        }],
        rules: ['MATCH,PROXY']
    };
    
    const configPath = path.join(CLASH_DIR, 'test_hk2_config.yaml');
    fs.writeFileSync(configPath, yaml.dump(config));
    
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
    
    // 测试访问
    const tests = [
        { name: 'Cloudflare', url: 'https://www.cloudflare.com/cdn-cgi/trace' },
        { name: 'Linux.do 主页', url: 'https://linux.do' },
        { name: 'Linux.do API', url: 'https://linux.do/tag/%E8%AE%A2%E9%98%85%E8%8A%82%E7%82%B9.json' }
    ];
    
    for (const test of tests) {
        console.log(`测试 ${test.name}...`);
        
        try {
            const result = await new Promise((resolve) => {
                const curl = spawn('curl', [
                    '-s',
                    '-x', `http://127.0.0.1:${TEST_PORT}`,
                    '--max-time', '20',
                    '-k',
                    '-w', '\n[HTTP_CODE: %{http_code}]',
                    '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                    test.url
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
            
            if (result.code === 0 && result.output) {
                console.log(`  ✅ 成功！`);
                console.log(`  响应长度: ${result.output.length} 字节`);
                const preview = result.output.substring(0, 200).replace(/\n/g, ' ');
                console.log(`  响应预览: ${preview}...`);
            } else {
                console.log(`  ❌ 失败 (exit code: ${result.code})`);
                if (result.error) {
                    console.log(`  错误: ${result.error.substring(0, 150)}`);
                }
            }
        } catch (e) {
            console.log(`  ❌ 异常: ${e.message}`);
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
    } catch (e) {}
    
    console.log('\n========== 测试完成 ==========');
}

testHK2Node().catch(console.error);
