/**
 * 测试日本节点 - (2x)IEPL专线 日本1
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const yaml = require('js-yaml');
const { execSync } = require('child_process');

const CLASH_DIR = path.join(__dirname, 'clash_bin');
const CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
const HTTP_PORT = 17899;

async function testJapanNode() {
    console.log('========== 测试日本节点 ==========\n');
    
    const proxyConfig = {
        name: '(2x)IEPL专线 日本1',
        type: 'vmess',
        server: 'jzgz.tcity8.monster',
        port: 22235,
        tfo: false,
        'skip-cert-verify': true,
        uuid: 'e1a98d14-8827-426f-893c-527301073e04',
        alterId: 0,
        cipher: 'auto',
        network: 'tcp',
        udp: true
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
            proxies: ['(2x)IEPL专线 日本1']
        }],
        rules: ['MATCH,PROXY']
    };
    
    const configPath = path.join(CLASH_DIR, 'test_japan_config.yaml');
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
    
    // 测试
    const sites = [
        { name: 'example.com', url: 'https://example.com' },
        { name: 'Google', url: 'https://www.google.com' },
        { name: 'linux.do', url: 'https://linux.do' },
        { name: 'Facebook', url: 'https://www.facebook.com' }
    ];
    
    for (const site of sites) {
        console.log(`🔍 测试: ${site.name}...`);
        try {
            const result = execSync(
                `curl -s -x http://127.0.0.1:${HTTP_PORT} -k --connect-timeout 15 --max-time 30 -o /dev/null -w "%{http_code}" ${site.url}`,
                { encoding: 'utf8', timeout: 35000 }
            );
            const code = result.trim();
            if (code === '200' || code === '301' || code === '302') {
                console.log(`  ✅ 成功！状态码: ${code}\n`);
            } else {
                console.log(`  ⚠️ 状态码: ${code}\n`);
            }
        } catch (e) {
            console.log(`  ❌ 失败\n`);
        }
    }
    
    console.log('🛑 停止Clash...');
    clashProcess.kill('SIGTERM');
    
    await new Promise(r => setTimeout(r, 1000));
    
    console.log('\n========== 测试完成 ==========');
}

testJapanNode().catch(console.error);
