#!/usr/bin/env node
/**
 * 测试修复后的代理功能
 * 验证 HTTP CONNECT 隧道方式是否正常工作
 */

const http = require('http');
const https = require('https');
const { getPremiumProxyManager } = require('./premium_proxy_manager');

// 测试网站列表
const TEST_SITES = [
    { name: 'Google', url: 'https://www.google.com' },
    { name: 'GitHub', url: 'https://api.github.com' },
    { name: 'Linux.do', url: 'https://linux.do' }
];

// 使用 HTTP CONNECT 隧道方式访问网站
async function fetchWithProxy(url, proxyConfig) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const urlObj = new URL(url);
        const timeout = 15000;
        
        const timeoutId = setTimeout(() => {
            reject(new Error('请求超时'));
        }, timeout);
        
        // 先连接到代理
        const proxyReq = http.request({
            host: proxyConfig.host,
            port: proxyConfig.port,
            method: 'CONNECT',
            path: `${urlObj.hostname}:${urlObj.port || 443}`
        });
        
        proxyReq.on('connect', (res, socket) => {
            if (res.statusCode !== 200) {
                clearTimeout(timeoutId);
                reject(new Error(`代理连接失败: ${res.statusCode}`));
                return;
            }
            
            // 通过代理隧道发送 HTTPS 请求
            const requestOptions = {
                host: urlObj.hostname,
                port: urlObj.port || 443,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: {
                    'Host': urlObj.hostname,
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                },
                socket: socket,
                agent: false
            };
            
            const req = https.request(requestOptions, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    clearTimeout(timeoutId);
                    const duration = Date.now() - startTime;
                    resolve({
                        success: true,
                        statusCode: res.statusCode,
                        duration: duration,
                        size: data.length
                    });
                });
            });
            
            req.on('error', (error) => {
                clearTimeout(timeoutId);
                reject(error);
            });
            
            req.end();
        });
        
        proxyReq.on('error', (error) => {
            clearTimeout(timeoutId);
            reject(new Error(`代理错误: ${error.message}`));
        });
        
        proxyReq.end();
    });
}

// 主函数
async function main() {
    console.log('========== 测试修复后的代理功能 ==========\n');
    
    try {
        // 1. 启动付费节点代理
        console.log('1. 启动付费节点代理...');
        const premiumProxy = getPremiumProxyManager();
        const started = await premiumProxy.start();
        
        if (!started) {
            console.error('✗ 代理启动失败');
            process.exit(1);
        }
        
        const proxyConfig = premiumProxy.getProxyConfig();
        console.log(`✓ 代理已启动: ${proxyConfig.host}:${proxyConfig.port}\n`);
        
        // 等待代理完全启动
        await new Promise(r => setTimeout(r, 3000));
        
        // 2. 测试各个网站
        console.log('2. 测试网站访问:\n');
        
        for (const site of TEST_SITES) {
            try {
                console.log(`测试 ${site.name} (${site.url})...`);
                const result = await fetchWithProxy(site.url, proxyConfig);
                
                if (result.success) {
                    console.log(`✓ ${site.name}: 成功`);
                    console.log(`  状态码: ${result.statusCode}`);
                    console.log(`  耗时: ${result.duration}ms`);
                    console.log(`  大小: ${result.size} bytes\n`);
                } else {
                    console.log(`✗ ${site.name}: 失败\n`);
                }
            } catch (e) {
                console.log(`✗ ${site.name}: 失败 - ${e.message}\n`);
            }
        }
        
        // 3. 停止代理
        console.log('3. 停止代理...');
        premiumProxy.stop();
        console.log('✓ 代理已停止\n');
        
        console.log('========== 测试完成 ==========');
        
    } catch (error) {
        console.error('错误:', error.message);
        console.error(error);
    } finally {
        process.exit(0);
    }
}

// 执行
if (require.main === module) {
    main();
}

module.exports = { fetchWithProxy };
