/**
 * 代理功能测试脚本
 * 测试使用 Clash 代理访问外网
 */

const { spawn } = require('child_process');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = __dirname;
const CLASH_DIR = path.join(ROOT, 'clash_bin');
const TEST_PROXY_PORT = 7892;

// 查找 Clash 二进制
let CLASH_BIN = '';
const platform = require('os').platform();
const arch = require('os').arch();

if (platform === 'darwin') {
    CLASH_BIN = path.join(CLASH_DIR, 'clash-darwin');
} else if (platform === 'linux') {
    if (arch === 'x64') CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
    else if (arch === 'arm64') CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-arm64');
    else CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
}

// 动态查找
if (!fs.existsSync(CLASH_BIN)) {
    const files = fs.readdirSync(CLASH_DIR);
    const bin = files.find(f => f.includes('clash') && !f.endsWith('.yaml'));
    if (bin) CLASH_BIN = path.join(CLASH_DIR, bin);
}

console.log('🔍 Clash 二进制:', CLASH_BIN);

// 测试节点
let testProxy = null;
let clashProcess = null;

async function selectTestProxy() {
    try {
        const proxiesFile = path.join(ROOT, 'proxies.json');
        if (!fs.existsSync(proxiesFile)) {
            console.log('❌ proxies.json 不存在');
            return null;
        }

        const proxies = JSON.parse(fs.readFileSync(proxiesFile, 'utf8'));
        
        // 选择前10个节点进行测试
        const testProxies = proxies.slice(0, 10);
        console.log(`🔍 从 ${proxies.length} 个节点中选择前 10 个进行测试...`);
        
        // 返回第一个用于测试
        if (testProxies.length > 0) {
            console.log('✅ 选择测试节点:', testProxies[0].name);
            return testProxies;
        }
        
        return null;
    } catch (e) {
        console.log('❌ 选择测试节点失败:', e.message);
        return null;
    }
}

async function startTestClash(proxies) {
    return new Promise((resolve, reject) => {
        // 生成测试配置 - 包含多个节点
        const config = {
            port: TEST_PROXY_PORT,
            'socks-port': TEST_PROXY_PORT + 1,
            'allow-lan': false,
            mode: 'rule',
            'log-level': 'info',
            proxies: proxies,
            'proxy-groups': [{
                name: 'PROXY',
                type: 'url-test',
                proxies: proxies.map(p => p.name),
                url: 'http://www.gstatic.com/generate_204',
                interval: 300
            }],
            rules: ['MATCH,PROXY']
        };

        const configPath = path.join(CLASH_DIR, 'test_proxy_config.yaml');
        fs.writeFileSync(configPath, yaml.dump(config));

        console.log('🚀 启动测试 Clash (端口:', TEST_PROXY_PORT, ')...');
        console.log('📋 配置了', proxies.length, '个节点进行自动选择');

        clashProcess = spawn(CLASH_BIN, ['-d', CLASH_DIR, '-f', configPath], {
            stdio: 'pipe'
        });

        clashProcess.stdout.on('data', (data) => {
            console.log('[Clash]', data.toString().trim());
        });

        clashProcess.stderr.on('data', (data) => {
            console.log('[Clash Error]', data.toString().trim());
        });

        clashProcess.on('error', (err) => {
            console.log('❌ Clash 启动失败:', err.message);
            reject(err);
        });

        // 等待启动和自动测速
        setTimeout(() => {
            if (clashProcess) {
                console.log('✅ Clash 已启动，正在自动测速选择最快节点...');
                resolve();
            } else {
                reject(new Error('Clash 启动超时'));
            }
        }, 5000);
    });
}

function stopTestClash() {
    if (clashProcess) {
        console.log('🛑 停止测试 Clash...');
        clashProcess.kill('SIGTERM');
        clashProcess = null;
    }
}

async function testProxyAccess(url, description) {
    return new Promise((resolve) => {
        console.log(`\n🌐 测试访问: ${description}`);
        console.log(`   URL: ${url}`);

        const startTime = Date.now();
        const curlArgs = [
            '-s',
            '-o', '/dev/null',
            '-w', '%{http_code}',
            '--max-time', '15',
            '-x', `http://127.0.0.1:${TEST_PROXY_PORT}`,
            url
        ];

        const child = spawn('curl', curlArgs, { timeout: 20000 });
        let data = '';
        let error = '';

        child.stdout.on('data', chunk => data += chunk);
        child.stderr.on('data', chunk => error += chunk);

        child.on('close', (code) => {
            const elapsed = Date.now() - startTime;
            const httpCode = data.trim();

            if (code === 0 && httpCode) {
                if (httpCode.startsWith('2') || httpCode.startsWith('3')) {
                    console.log(`   ✅ 成功! HTTP ${httpCode} (${elapsed}ms)`);
                    resolve({ success: true, httpCode, elapsed });
                } else {
                    console.log(`   ⚠️ HTTP ${httpCode} (${elapsed}ms)`);
                    resolve({ success: false, httpCode, elapsed });
                }
            } else {
                console.log(`   ❌ 失败: ${error || 'Unknown error'} (${elapsed}ms)`);
                resolve({ success: false, error: error || 'Unknown error', elapsed });
            }
        });

        child.on('error', (err) => {
            console.log(`   ❌ 错误: ${err.message}`);
            resolve({ success: false, error: err.message });
        });
    });
}

async function runTests() {
    console.log('========================================');
    console.log('   代理功能测试');
    console.log('========================================\n');

    // 1. 选择测试节点
    const testProxies = await selectTestProxy();
    if (!testProxies || testProxies.length === 0) {
        console.log('❌ 无可用测试节点');
        process.exit(1);
    }

    try {
        // 2. 启动 Clash (使用 url-test 自动选择最快节点)
        await startTestClash(testProxies);

        // 等待 Clash 完全启动并完成测速
        console.log('⏳ 等待节点测速完成...');
        await new Promise(r => setTimeout(r, 8000));

        // 3. 测试访问各个网站
        const tests = [
            { url: 'https://www.google.com', desc: 'Google' },
            { url: 'https://www.facebook.com', desc: 'Facebook' },
            { url: 'https://twitter.com', desc: 'Twitter (X)' },
            { url: 'https://www.youtube.com', desc: 'YouTube' },
            { url: 'https://github.com', desc: 'GitHub' },
            { url: 'https://linux.do', desc: 'Linux.do 论坛' }
        ];

        const results = [];
        for (const test of tests) {
            const result = await testProxyAccess(test.url, test.desc);
            results.push({ ...test, ...result });
            await new Promise(r => setTimeout(r, 1000)); // 间隔1秒
        }

        // 4. 输出测试结果
        console.log('\n========================================');
        console.log('   测试结果汇总');
        console.log('========================================\n');

        const successCount = results.filter(r => r.success).length;
        const totalCount = results.length;

        results.forEach((r, i) => {
            const status = r.success ? '✅' : '❌';
            const time = r.elapsed ? `${r.elapsed}ms` : 'N/A';
            console.log(`${i + 1}. ${status} ${r.desc.padEnd(20)} ${time}`);
        });

        console.log(`\n成功率: ${successCount}/${totalCount} (${Math.round(successCount/totalCount*100)}%)`);

        if (successCount > 0) {
            console.log('\n✅ 代理功能正常！可以访问外网资源');
        } else {
            console.log('\n❌ 代理功能异常！无法访问任何外网资源');
            console.log('💡 可能原因:');
            console.log('   1. 所有测试节点都不可用');
            console.log('   2. 节点需要更长时间连接');
            console.log('   3. 网络环境限制');
        }

    } catch (e) {
        console.log('\n❌ 测试过程出错:', e.message);
    } finally {
        // 5. 清理
        stopTestClash();
        console.log('\n测试完成！');
        process.exit(0);
    }
}

// 运行测试
runTests().catch(e => {
    console.error('测试失败:', e);
    stopTestClash();
    process.exit(1);
});
