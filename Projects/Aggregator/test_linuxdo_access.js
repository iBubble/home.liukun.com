#!/usr/bin/env node
/**
 * 测试通过代理访问linux.do
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = __dirname;
const CLASH_DIR = path.join(ROOT, 'clash_bin');
const CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
const TEST_PORT = 7895;
const COOKIE_FILE = path.join(ROOT, 'linuxdo_cookie.txt');

console.log('========================================');
console.log('   测试访问 Linux.do');
console.log('========================================\n');

// 读取Cookie
let cookie = '';
if (fs.existsSync(COOKIE_FILE)) {
    cookie = fs.readFileSync(COOKIE_FILE, 'utf8').trim();
    console.log('✅ Cookie已加载 (' + cookie.length + ' 字符)\n');
} else {
    console.log('⚠️ Cookie文件不存在\n');
}

// 读取节点
const proxiesFile = path.join(ROOT, 'proxies.json');
const allProxies = JSON.parse(fs.readFileSync(proxiesFile, 'utf8'));

// 选择美国、香港、台湾、日本节点
const regions = ['US', 'HK', 'TW', 'JP', '美国', '香港', '台湾', '日本'];
const targetProxies = allProxies.filter(p => {
    const name = (p.name || '').toUpperCase();
    return regions.some(r => name.includes(r));
}).slice(0, 10);

console.log(`📋 选择 ${targetProxies.length} 个目标地区节点\n`);

// 生成Clash配置
const config = {
    port: TEST_PORT,
    'socks-port': TEST_PORT + 1,
    'allow-lan': false,
    mode: 'rule',
    'log-level': 'silent',
    proxies: targetProxies,
    'proxy-groups': [{
        name: 'PROXY',
        type: 'url-test',
        proxies: targetProxies.map(p => p.name),
        url: 'http://www.gstatic.com/generate_204',
        interval: 300
    }],
    rules: ['MATCH,PROXY']
};

const configPath = path.join(CLASH_DIR, 'test_linuxdo_config.yaml');
fs.writeFileSync(configPath, yaml.dump(config));

console.log('🚀 启动Clash代理...\n');

const clashProcess = spawn(CLASH_BIN, ['-d', CLASH_DIR, '-f', configPath], {
    stdio: 'pipe'
});

// 等待Clash启动和测速
setTimeout(async () => {
    console.log('开始测试访问 Linux.do...\n');
    
    // 测试1: 访问首页
    console.log('测试1: 访问首页');
    const test1 = await testAccess('https://linux.do', cookie);
    console.log(`  结果: ${test1.success ? '✅' : '❌'} (${test1.time}ms)`);
    if (test1.success) {
        console.log(`  响应长度: ${test1.length} 字节`);
        console.log(`  包含"Linux"关键词: ${test1.content.includes('Linux') ? '是' : '否'}`);
    } else {
        console.log(`  错误: ${test1.error}`);
    }
    console.log('');
    
    // 测试2: 访问订阅节点标签页
    console.log('测试2: 访问订阅节点标签页 (JSON API)');
    const test2 = await testAccess('https://linux.do/tag/%E8%AE%A2%E9%98%85%E8%8A%82%E7%82%B9.json', cookie);
    console.log(`  结果: ${test2.success ? '✅' : '❌'} (${test2.time}ms)`);
    if (test2.success) {
        try {
            const data = JSON.parse(test2.content);
            const topics = data.topic_list?.topics || [];
            console.log(`  帖子数量: ${topics.length}`);
            if (topics.length > 0) {
                console.log(`  最新帖子: ${topics[0].title}`);
            }
        } catch (e) {
            console.log(`  JSON解析失败: ${e.message}`);
            console.log(`  响应内容: ${test2.content.substring(0, 200)}...`);
        }
    } else {
        console.log(`  错误: ${test2.error}`);
    }
    console.log('');
    
    // 测试3: 检查是否需要登录
    console.log('测试3: 检查Cookie有效性');
    if (test2.success && test2.content.includes('login-required')) {
        console.log('  ❌ Cookie已失效,需要重新登录');
    } else if (test2.success && test2.content.includes('topic_list')) {
        console.log('  ✅ Cookie有效,可以访问论坛内容');
    } else {
        console.log('  ⚠️ 无法确定Cookie状态');
    }
    
    console.log('');
    console.log('========================================');
    console.log('   测试完成');
    console.log('========================================');
    
    // 清理
    clashProcess.kill('SIGTERM');
    process.exit(0);
}, 8000);

function testAccess(url, cookie) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        const curlArgs = [
            '-s',
            '-L',
            '--max-time', '15',
            '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            '-x', `http://127.0.0.1:${TEST_PORT}`
        ];
        
        if (cookie) {
            curlArgs.push('-H', `Cookie: ${cookie}`);
        }
        
        curlArgs.push(url);
        
        const child = spawn('curl', curlArgs, { timeout: 18000 });
        let data = '';
        let error = '';
        
        child.stdout.on('data', chunk => data += chunk);
        child.stderr.on('data', chunk => error += chunk);
        
        child.on('close', (code) => {
            const elapsed = Date.now() - startTime;
            
            if (code === 0 && data) {
                resolve({
                    success: true,
                    time: elapsed,
                    length: data.length,
                    content: data
                });
            } else {
                resolve({
                    success: false,
                    time: elapsed,
                    error: error || 'Request failed'
                });
            }
        });
        
        child.on('error', (err) => {
            resolve({
                success: false,
                time: Date.now() - startTime,
                error: err.message
            });
        });
    });
}
