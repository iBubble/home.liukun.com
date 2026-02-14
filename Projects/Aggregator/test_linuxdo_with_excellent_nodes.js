#!/usr/bin/env node
/**
 * 使用excellent节点测试访问Linux.do
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = __dirname;
const CLASH_DIR = path.join(ROOT, 'clash_bin');
const CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
const TEST_PORT = 7908;

let clashProcess = null;

// 测试URL
const LINUX_DO_URL = 'https://linux.do/tag/%E8%AE%A2%E9%98%85%E8%8A%82%E7%82%B9.json';

async function testWithNode(proxy) {
    console.log(`\n测试节点: ${proxy.name}`);
    
    const config = {
        port: TEST_PORT,
        'socks-port': TEST_PORT + 1,
        'allow-lan': false,
        mode: 'rule',
        'log-level': 'silent',
        proxies: [proxy],
        'proxy-groups': [{
            name: 'test',
            type: 'select',
            proxies: [proxy.name]
        }],
        rules: ['MATCH,test']
    };
    
    const configPath = path.join(CLASH_DIR, 'linuxdo_test_config.yaml');
    fs.writeFileSync(configPath, yaml.dump(config));
    
    if (clashProcess) {
        clashProcess.kill('SIGTERM');
        await new Promise(r => setTimeout(r, 500));
    }
    
    clashProcess = spawn(CLASH_BIN, ['-d', CLASH_DIR, '-f', configPath], {
        stdio: 'pipe',
        env: {
            ...process.env,
            HTTP_PROXY: '',
            HTTPS_PROXY: '',
            http_proxy: '',
            https_proxy: '',
            ALL_PROXY: '',
            all_proxy: ''
        }
    });
    
    await new Promise(r => setTimeout(r, 5000));
    
    // 测试访问Linux.do
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        const curlArgs = [
            '-s',
            '-L',
            '--max-time', '30',
            '-H', 'Accept: application/json',
            '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            '-x', `http://127.0.0.1:${TEST_PORT}`,
            LINUX_DO_URL
        ];
        
        const child = spawn('curl', curlArgs, { 
            timeout: 35000,
            env: {
                ...process.env,
                HTTP_PROXY: '',
                HTTPS_PROXY: '',
                http_proxy: '',
                https_proxy: '',
                ALL_PROXY: '',
                all_proxy: ''
            }
        });
        
        let data = '';
        let error = '';
        
        child.stdout.on('data', chunk => data += chunk);
        child.stderr.on('data', chunk => error += chunk);
        
        child.on('close', (code) => {
            const elapsed = Date.now() - startTime;
            
            if (code === 0 && data) {
                try {
                    const json = JSON.parse(data);
                    const topics = json.topic_list?.topics || [];
                    console.log(`  ✅ 成功访问 (${elapsed}ms)`);
                    console.log(`  📝 获取到 ${topics.length} 个主题`);
                    if (topics.length > 0) {
                        console.log(`  📌 最新主题: ${topics[0].title}`);
                    }
                    resolve({ success: true, elapsed, topicCount: topics.length });
                } catch (e) {
                    console.log(`  ❌ JSON解析失败: ${e.message}`);
                    console.log(`  响应内容: ${data.substring(0, 200)}...`);
                    resolve({ success: false, elapsed, error: 'JSON解析失败' });
                }
            } else {
                console.log(`  ❌ 访问失败 (${elapsed}ms)`);
                if (error) console.log(`  错误: ${error.substring(0, 100)}`);
                resolve({ success: false, elapsed, error: error || `curl code ${code}` });
            }
        });
        
        child.on('error', (err) => {
            console.log(`  ❌ 异常: ${err.message}`);
            resolve({ success: false, elapsed: Date.now() - startTime, error: err.message });
        });
    });
}

async function main() {
    console.log('========================================');
    console.log('使用excellent节点测试访问Linux.do');
    console.log('========================================\n');
    
    // 读取proxies.json中的前5个节点(之前测试过的excellent节点)
    const proxiesFile = path.join(ROOT, 'proxies.json');
    const allProxies = JSON.parse(fs.readFileSync(proxiesFile, 'utf8'));
    
    // 跳过第一个(CN4),使用2-6号节点
    const testProxies = allProxies.slice(1, 6);
    
    let successCount = 0;
    const results = [];
    
    for (let i = 0; i < testProxies.length; i++) {
        console.log(`\n[${i + 1}/5] ========================================`);
        
        try {
            const result = await testWithNode(testProxies[i]);
            results.push({ node: testProxies[i].name, ...result });
            
            if (result.success) {
                successCount++;
            }
        } catch (e) {
            console.log(`❌ 测试异常: ${e.message}`);
            results.push({ node: testProxies[i].name, success: false, error: e.message });
        }
        
        await new Promise(r => setTimeout(r, 1000));
    }
    
    if (clashProcess) clashProcess.kill();
    
    console.log('\n\n========================================');
    console.log('测试总结');
    console.log('========================================');
    console.log(`成功访问Linux.do: ${successCount}/5\n`);
    
    if (successCount > 0) {
        console.log('✅ 成功的节点:');
        results.filter(r => r.success).forEach(r => {
            console.log(`  - ${r.node} (${r.elapsed}ms, ${r.topicCount}个主题)`);
        });
    }
    
    if (successCount < 5) {
        console.log('\n❌ 失败的节点:');
        results.filter(r => !r.success).forEach(r => {
            console.log(`  - ${r.node}: ${r.error}`);
        });
    }
    
    process.exit(0);
}

process.on('SIGINT', () => {
    if (clashProcess) clashProcess.kill();
    process.exit(0);
});

main().catch(e => {
    console.error(e);
    if (clashProcess) clashProcess.kill();
    process.exit(1);
});
