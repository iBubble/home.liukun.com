#!/usr/bin/env node
/**
 * 测试付费订阅节点
 * 使用优先节点访问国外网站
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const https = require('https');
const http = require('http');

const ROOT = __dirname;
const CLASH_DIR = path.join(ROOT, 'clash_bin');
const CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
const CLASH_CONFIG = path.join(ROOT, 'clash_data', 'premium_test_config.yaml');
const PREMIUM_NODES_FILE = path.join(ROOT, 'premium_nodes.json');
const TEST_PORT = 7920;

// 测试网站列表
const TEST_SITES = [
    { name: 'Google', url: 'https://www.google.com', keyword: 'Google', acceptRedirect: true },
    { name: 'Facebook', url: 'https://www.facebook.com', keyword: 'Facebook' },
    { name: 'GitHub', url: 'https://github.com', keyword: 'GitHub' },
    { name: 'Linux.do', url: 'https://linux.do', keyword: 'Linux' }
];

let clashProcess = null;

// 日志函数
function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

// 加载付费节点
function loadPremiumNodes() {
    if (!fs.existsSync(PREMIUM_NODES_FILE)) {
        throw new Error(`付费节点文件不存在: ${PREMIUM_NODES_FILE}\n请先运行: node premium_subscription_updater.js`);
    }
    
    const data = JSON.parse(fs.readFileSync(PREMIUM_NODES_FILE, 'utf8'));
    log(`加载付费节点: ${data.total_nodes} 个节点`);
    log(`更新时间: ${data.updated_at}`);
    
    return data.nodes;
}

// 创建 Clash 配置
function createClashConfig(nodes) {
    const config = {
        port: TEST_PORT,
        'socks-port': TEST_PORT + 1,
        'allow-lan': false,
        mode: 'rule',
        'log-level': 'info',
        'external-controller': `127.0.0.1:${TEST_PORT + 100}`,
        proxies: nodes,
        'proxy-groups': [{
            name: 'PROXY',
            type: 'select',
            proxies: nodes.map(p => p.name)
        }],
        rules: [
            'MATCH,PROXY'
        ]
    };
    
    // 确保目录存在
    const configDir = path.dirname(CLASH_CONFIG);
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(CLASH_CONFIG, yaml.dump(config));
    log(`Clash 配置已创建: ${CLASH_CONFIG}`);
}

// 启动 Clash
function startClash() {
    return new Promise((resolve, reject) => {
        log(`启动 Clash: ${CLASH_BIN}`);
        
        clashProcess = spawn(CLASH_BIN, ['-d', path.dirname(CLASH_CONFIG), '-f', CLASH_CONFIG], {
            stdio: ['ignore', 'pipe', 'pipe']
        });
        
        let output = '';
        
        clashProcess.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        clashProcess.stderr.on('data', (data) => {
            output += data.toString();
            if (output.includes('HTTP proxy listening') || output.includes('SOCKS proxy listening')) {
                log('✓ Clash 启动成功');
                resolve();
            }
        });
        
        clashProcess.on('error', reject);
        
        // 5秒超时
        setTimeout(() => {
            if (clashProcess && !clashProcess.killed) {
                log('✓ Clash 已启动 (超时检测)');
                resolve();
            }
        }, 5000);
    });
}

// 停止 Clash
function stopClash() {
    if (clashProcess && !clashProcess.killed) {
        log('停止 Clash');
        clashProcess.kill();
        clashProcess = null;
    }
}

// 测试网站访问 (通过 HTTP CONNECT 代理)
function testSite(site, proxyPort) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const url = new URL(site.url);
        
        // 先连接到代理
        const proxyReq = http.request({
            host: '127.0.0.1',
            port: proxyPort,
            method: 'CONNECT',
            path: `${url.hostname}:${url.port || 443}`
        });
        
        proxyReq.on('connect', (res, socket) => {
            if (res.statusCode !== 200) {
                resolve({
                    name: site.name,
                    url: site.url,
                    success: false,
                    error: `Proxy CONNECT failed: ${res.statusCode}`,
                    duration: Date.now() - startTime
                });
                return;
            }
            
            // 通过代理隧道发送 HTTPS 请求
            const options = {
                host: url.hostname,
                port: url.port || 443,
                path: url.pathname || '/',
                method: 'GET',
                headers: {
                    'Host': url.hostname,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                socket: socket,
                agent: false
            };
            
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    const duration = Date.now() - startTime;
                    // 接受 200 和 302 (重定向) 作为成功
                    const isSuccessCode = res.statusCode === 200 || (site.acceptRedirect && res.statusCode === 302);
                    const success = isSuccessCode && (data.includes(site.keyword) || site.acceptRedirect);
                    
                    resolve({
                        name: site.name,
                        url: site.url,
                        success: success,
                        statusCode: res.statusCode,
                        duration: duration,
                        size: data.length
                    });
                });
            });
            
            req.on('error', (error) => {
                resolve({
                    name: site.name,
                    url: site.url,
                    success: false,
                    error: error.message,
                    duration: Date.now() - startTime
                });
            });
            
            req.setTimeout(15000, () => {
                req.destroy();
                resolve({
                    name: site.name,
                    url: site.url,
                    success: false,
                    error: 'Timeout',
                    duration: 15000
                });
            });
            
            req.end();
        });
        
        proxyReq.on('error', (error) => {
            resolve({
                name: site.name,
                url: site.url,
                success: false,
                error: `Proxy error: ${error.message}`,
                duration: Date.now() - startTime
            });
        });
        
        proxyReq.setTimeout(15000, () => {
            proxyReq.destroy();
            resolve({
                name: site.name,
                url: site.url,
                success: false,
                error: 'Proxy timeout',
                duration: 15000
            });
        });
        
        proxyReq.end();
    });
}

// 测试所有网站
async function testAllSites() {
    log('\n========== 开始测试网站访问 ==========\n');
    
    const results = [];
    
    for (const site of TEST_SITES) {
        log(`测试 ${site.name} (${site.url})...`);
        const result = await testSite(site, TEST_PORT);
        results.push(result);
        
        if (result.success) {
            log(`✓ ${site.name}: 成功 (${result.duration}ms, ${result.size} bytes)`);
        } else {
            log(`✗ ${site.name}: 失败 - ${result.error || `HTTP ${result.statusCode}`}`);
        }
    }
    
    return results;
}

// 显示测试结果
function showResults(results) {
    log('\n========== 测试结果汇总 ==========\n');
    
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    log(`成功: ${successCount}/${totalCount}`);
    log('');
    
    results.forEach(result => {
        const status = result.success ? '✓' : '✗';
        const info = result.success 
            ? `${result.duration}ms` 
            : result.error || `HTTP ${result.statusCode}`;
        log(`${status} ${result.name.padEnd(15)} ${info}`);
    });
    
    log('');
}

// 主函数
async function main() {
    try {
        log('========== 付费节点测试开始 ==========\n');
        
        // 1. 加载节点
        const nodes = loadPremiumNodes();
        
        // 2. 创建配置
        createClashConfig(nodes);
        
        // 3. 启动 Clash
        await startClash();
        
        // 等待 Clash 完全启动
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 4. 测试网站
        const results = await testAllSites();
        
        // 5. 显示结果
        showResults(results);
        
        log('========== 测试完成 ==========');
        
    } catch (error) {
        log(`错误: ${error.message}`);
        console.error(error);
    } finally {
        stopClash();
        process.exit(0);
    }
}

// 执行
if (require.main === module) {
    main();
}

module.exports = { main, testSite };
