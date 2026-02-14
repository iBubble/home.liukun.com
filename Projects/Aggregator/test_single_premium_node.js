#!/usr/bin/env node
/**
 * 测试单个付费节点 - 详细调试版本
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const http = require('http');
const https = require('https');

const ROOT = __dirname;
const CLASH_DIR = path.join(ROOT, 'clash_bin');
const CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
const PREMIUM_NODES_FILE = path.join(ROOT, 'premium_nodes.json');
const TEST_PORT = 7960;

let clashProcess = null;

// 加载第一个专线台湾节点
function loadTestNode() {
    const data = JSON.parse(fs.readFileSync(PREMIUM_NODES_FILE, 'utf8'));
    const node = data.nodes.find(n => n.name.includes('专线') && n.name.includes('台湾'));
    if (!node) {
        throw new Error('未找到专线台湾节点');
    }
    return node;
}

// 创建 Clash 配置
function createClashConfig(node) {
    const config = {
        port: TEST_PORT,
        'socks-port': TEST_PORT + 1,
        'allow-lan': false,
        mode: 'global',
        'log-level': 'debug', // 使用debug级别查看详细日志
        proxies: [node],
        'proxy-groups': [{
            name: 'PROXY',
            type: 'select',
            proxies: [node.name]
        }],
        rules: ['MATCH,PROXY']
    };
    
    const configPath = path.join(ROOT, 'clash_data', 'debug_config.yaml');
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(configPath, yaml.dump(config));
    console.log('配置文件已创建:', configPath);
    console.log('节点信息:', JSON.stringify(node, null, 2));
    return configPath;
}

// 启动 Clash (显示所有输出)
function startClash(configPath) {
    return new Promise((resolve, reject) => {
        console.log('\n启动 Clash...');
        console.log('命令:', CLASH_BIN, '-d', path.dirname(configPath), '-f', configPath);
        
        clashProcess = spawn(CLASH_BIN, ['-d', path.dirname(configPath), '-f', configPath], {
            stdio: ['ignore', 'pipe', 'pipe']
        });
        
        clashProcess.stdout.on('data', (data) => {
            console.log('[Clash STDOUT]', data.toString().trim());
        });
        
        clashProcess.stderr.on('data', (data) => {
            console.log('[Clash STDERR]', data.toString().trim());
        });
        
        clashProcess.on('error', (err) => {
            console.error('[Clash ERROR]', err);
            reject(err);
        });
        
        clashProcess.on('exit', (code, signal) => {
            console.log(`[Clash EXIT] code=${code}, signal=${signal}`);
        });
        
        // 等待启动
        setTimeout(() => {
            if (clashProcess && !clashProcess.killed) {
                console.log('✓ Clash 已启动');
                resolve();
            } else {
                reject(new Error('Clash启动失败'));
            }
        }, 5000);
    });
}

// 停止 Clash
function stopClash() {
    if (clashProcess && !clashProcess.killed) {
        console.log('\n停止 Clash...');
        clashProcess.kill('SIGTERM');
        clashProcess = null;
    }
}

// 测试HTTP代理(简单方式)
async function testHttpProxy() {
    console.log('\n========== 测试1: 简单HTTP代理 ==========');
    
    return new Promise((resolve) => {
        const req = http.request({
            host: '127.0.0.1',
            port: TEST_PORT,
            path: 'http://www.google.com',
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        }, (res) => {
            console.log('HTTP响应状态:', res.statusCode);
            console.log('HTTP响应头:', res.headers);
            
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log('响应大小:', data.length, 'bytes');
                resolve({ success: res.statusCode === 200, method: 'http' });
            });
        });
        
        req.on('error', (err) => {
            console.error('HTTP请求错误:', err.message);
            resolve({ success: false, error: err.message });
        });
        
        req.setTimeout(10000, () => {
            req.destroy();
            console.error('HTTP请求超时');
            resolve({ success: false, error: 'timeout' });
        });
        
        req.end();
    });
}

// 测试HTTPS CONNECT隧道
async function testHttpsConnect() {
    console.log('\n========== 测试2: HTTPS CONNECT隧道 ==========');
    
    return new Promise((resolve) => {
        const proxyReq = http.request({
            host: '127.0.0.1',
            port: TEST_PORT,
            method: 'CONNECT',
            path: 'www.google.com:443'
        });
        
        console.log('发送CONNECT请求到代理...');
        
        proxyReq.on('connect', (res, socket) => {
            console.log('CONNECT响应状态:', res.statusCode);
            console.log('CONNECT响应头:', res.headers);
            
            if (res.statusCode !== 200) {
                resolve({ success: false, error: `CONNECT failed: ${res.statusCode}` });
                return;
            }
            
            console.log('✓ CONNECT隧道已建立');
            console.log('发送HTTPS请求...');
            
            const req = https.request({
                host: 'www.google.com',
                port: 443,
                path: '/',
                method: 'GET',
                headers: {
                    'Host': 'www.google.com',
                    'User-Agent': 'Mozilla/5.0'
                },
                socket: socket,
                agent: false
            }, (res) => {
                console.log('HTTPS响应状态:', res.statusCode);
                
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    console.log('响应大小:', data.length, 'bytes');
                    resolve({ success: res.statusCode === 200 || res.statusCode === 302, method: 'connect' });
                });
            });
            
            req.on('error', (err) => {
                console.error('HTTPS请求错误:', err.message);
                resolve({ success: false, error: err.message });
            });
            
            req.setTimeout(10000, () => {
                req.destroy();
                console.error('HTTPS请求超时');
                resolve({ success: false, error: 'timeout' });
            });
            
            req.end();
        });
        
        proxyReq.on('error', (err) => {
            console.error('CONNECT请求错误:', err.message);
            resolve({ success: false, error: err.message });
        });
        
        proxyReq.setTimeout(10000, () => {
            proxyReq.destroy();
            console.error('CONNECT请求超时');
            resolve({ success: false, error: 'timeout' });
        });
        
        proxyReq.end();
    });
}

// 主函数
async function main() {
    try {
        console.log('========== 单节点详细测试 ==========\n');
        
        // 1. 加载节点
        const node = loadTestNode();
        console.log('测试节点:', node.name);
        
        // 2. 创建配置
        const configPath = createClashConfig(node);
        
        // 3. 启动Clash
        await startClash(configPath);
        
        // 等待稳定
        console.log('\n等待5秒让Clash完全启动...');
        await new Promise(r => setTimeout(r, 5000));
        
        // 4. 测试HTTP代理
        const httpResult = await testHttpProxy();
        console.log('HTTP代理测试结果:', httpResult);
        
        // 5. 测试HTTPS CONNECT
        const httpsResult = await testHttpsConnect();
        console.log('HTTPS CONNECT测试结果:', httpsResult);
        
        // 6. 总结
        console.log('\n========== 测试总结 ==========');
        console.log('HTTP代理:', httpResult.success ? '✓ 成功' : '✗ 失败');
        console.log('HTTPS CONNECT:', httpsResult.success ? '✓ 成功' : '✗ 失败');
        
        if (httpResult.success || httpsResult.success) {
            console.log('\n✓ 节点可用!');
            console.log('推荐使用方式:', httpResult.success ? 'HTTP代理' : 'HTTPS CONNECT');
        } else {
            console.log('\n✗ 节点不可用');
        }
        
    } catch (error) {
        console.error('错误:', error.message);
        console.error(error);
    } finally {
        stopClash();
        setTimeout(() => process.exit(0), 2000);
    }
}

// 执行
if (require.main === module) {
    main();
}
