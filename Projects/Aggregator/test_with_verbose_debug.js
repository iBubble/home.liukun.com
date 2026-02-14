/**
 * 详细调试模式测试 AT_speednode_0003
 * 输出所有Clash日志和网络请求细节
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const yaml = require('js-yaml');
const { execSync } = require('child_process');

const CLASH_DIR = path.join(__dirname, 'clash_bin');
const CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
const TEST_PORT = 17899;

async function testWithVerboseDebug() {
    console.log('========== 详细调试模式测试 ==========\n');
    
    // 1. 检查系统环境
    console.log('📋 系统环境信息:');
    console.log('  操作系统:', execSync('uname -a').toString().trim());
    console.log('  DNS配置:', execSync('cat /etc/resolv.conf | grep nameserver').toString().trim());
    console.log('  Clash版本:', execSync(`${CLASH_BIN} -v`).toString().trim());
    console.log('\n');
    
    // 2. 使用完全相同的配置
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
        'log-level': 'debug', // 🔥 使用debug级别查看详细日志
        proxies: [proxyConfig],
        'proxy-groups': [{
            name: 'PROXY',
            type: 'select',
            proxies: ['AT_speednode_0003']
        }],
        rules: ['MATCH,PROXY']
    };
    
    const configPath = path.join(CLASH_DIR, 'test_verbose_config.yaml');
    fs.writeFileSync(configPath, yaml.dump(config));
    
    console.log('✅ 配置已生成\n');
    
    // 3. 启动Clash并捕获所有输出
    console.log('🚀 启动Clash (debug模式)...\n');
    
    const clashProcess = spawn(CLASH_BIN, ['-d', CLASH_DIR, '-f', configPath], {
        stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let allOutput = '';
    
    clashProcess.stdout.on('data', (data) => {
        const text = data.toString();
        allOutput += text;
        process.stdout.write(text);
    });
    
    clashProcess.stderr.on('data', (data) => {
        const text = data.toString();
        allOutput += text;
        process.stderr.write(text);
    });
    
    // 等待Clash启动
    await new Promise(r => setTimeout(r, 3000));
    
    console.log('\n✅ Clash已启动\n');
    
    // 4. 测试连接 - 使用更详细的curl参数
    console.log('🔍 测试访问 linux.do (详细模式)...\n');
    
    try {
        const result = execSync(
            `curl -v -x http://127.0.0.1:${TEST_PORT} ` +
            `-k --connect-timeout 10 --max-time 30 ` +
            `-H "User-Agent: Mozilla/5.0" ` +
            `https://linux.do 2>&1`,
            { encoding: 'utf8', timeout: 35000 }
        );
        
        console.log('\n✅ 成功！\n');
        console.log('响应内容（前500字符）:');
        console.log(result.substring(0, 500));
        
    } catch (e) {
        console.log('\n❌ 失败\n');
        console.log('错误信息:');
        console.log(e.stdout || e.message);
    }
    
    // 5. 保存完整日志
    fs.writeFileSync('clash_debug_full.log', allOutput);
    console.log('\n📝 完整Clash日志已保存到: clash_debug_full.log');
    
    // 6. 停止Clash
    console.log('\n🛑 停止Clash...');
    clashProcess.kill('SIGTERM');
    
    await new Promise(r => setTimeout(r, 1000));
    
    console.log('\n========== 测试完成 ==========');
}

testWithVerboseDebug().catch(console.error);
