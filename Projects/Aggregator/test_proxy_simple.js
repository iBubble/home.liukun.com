#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = __dirname;
const CLASH_DIR = path.join(ROOT, 'clash_bin');
const CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
const TEST_PORT = 7891;

console.log('========== 简单代理测试 ==========\n');

// 1. 读取一个good节点
const validatedFile = path.join(ROOT, 'validated_nodes.json');
const validated = JSON.parse(fs.readFileSync(validatedFile, 'utf8'));
const testNode = validated.good[0];

console.log(`测试节点: ${testNode.name}`);
console.log(`延迟: ${testNode.latency}ms\n`);

// 2. 生成Clash配置
const config = {
    port: TEST_PORT,
    'socks-port': TEST_PORT + 1,
    'allow-lan': false,
    mode: 'global',
    'log-level': 'info',
    proxies: [testNode],
    'proxy-groups': [{
        name: 'PROXY',
        type: 'select',
        proxies: [testNode.name]
    }],
    rules: ['MATCH,PROXY']
};

const configPath = path.join(CLASH_DIR, 'test_proxy_config.yaml');
fs.writeFileSync(configPath, yaml.dump(config));
console.log('✅ 配置文件已生成\n');

// 3. 启动Clash
console.log('🚀 启动Clash...');
const clashProcess = spawn(CLASH_BIN, ['-d', CLASH_DIR, '-f', configPath], {
    stdio: ['ignore', 'pipe', 'pipe']
});

clashProcess.stdout.on('data', (data) => {
    console.log(`[Clash] ${data.toString().trim()}`);
});

clashProcess.stderr.on('data', (data) => {
    console.error(`[Clash Error] ${data.toString().trim()}`);
});

clashProcess.on('exit', (code) => {
    console.log(`\n❌ Clash进程退出 (code: ${code})`);
    process.exit(1);
});

// 4. 等待5秒后测试
setTimeout(async () => {
    console.log('\n📡 测试代理连接...\n');
    
    // 测试1: Google 204
    console.log('测试1: Google 204');
    const test1 = spawn('curl', [
        '-v', '-x', `http://127.0.0.1:${TEST_PORT}`,
        '--max-time', '10',
        'http://www.gstatic.com/generate_204'
    ]);
    
    test1.stdout.on('data', (data) => console.log(data.toString()));
    test1.stderr.on('data', (data) => console.log(data.toString()));
    
    test1.on('close', (code) => {
        console.log(`\n结果: ${code === 0 ? '✅ 成功' : '❌ 失败'}\n`);
        
        // 测试2: Cloudflare
        console.log('测试2: Cloudflare 204');
        const test2 = spawn('curl', [
            '-v', '-x', `http://127.0.0.1:${TEST_PORT}`,
            '--max-time', '10',
            'http://cp.cloudflare.com/generate_204'
        ]);
        
        test2.stdout.on('data', (data) => console.log(data.toString()));
        test2.stderr.on('data', (data) => console.log(data.toString()));
        
        test2.on('close', (code2) => {
            console.log(`\n结果: ${code2 === 0 ? '✅ 成功' : '❌ 失败'}\n`);
            
            // 清理
            console.log('🛑 停止Clash...');
            clashProcess.kill('SIGTERM');
            setTimeout(() => process.exit(0), 1000);
        });
    });
}, 5000);

console.log('⏳ 等待Clash启动 (5秒)...\n');
