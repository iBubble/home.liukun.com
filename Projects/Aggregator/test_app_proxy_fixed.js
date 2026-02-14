#!/usr/bin/env node
/**
 * 测试修复后的 app.js 代理功能
 */

const http = require('http');
const https = require('https');
const { getPremiumProxyManager } = require('./premium_proxy_manager');

// 测试网站列表
const TEST_SITES = [
    { name: 'Google', url: 'https://www.google.com' },
    { name: 'GitHub API', url: 'https://api.github.com' }
];

// 使用 HTTP CONNECT 隧道访问(和test_premium_nodes.js一样的方式)
async function testWithProxy(url, proxyPort) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const urlObj = new URL(url);
        
        // 先连接到代理
        const proxyReq = http.request({
            host: '127.0.0.1',
            port: proxyPort,
            method: 'CONNECT',
            path: `${urlObj.hostname}:${urlObj.port || 443}`
        });
        
        const timeout = setTimeout(() => {
            proxyReq.destroy();
            resolve({ success: false, error: 'timeout' });
        }, 15000);
        
        proxyReq.on('connect', (res, socket) => {
            if (res.statusCode !== 200) {
                clearTimeout(timeout);
                resolve({ success: false, error: `CONNECT failed: ${res.statusCode}` });
                return;
            }
            
            // 通过代理隧道发送 HTTPS 请求
            const req = https.request({
                host: urlObj.hostname,
                port: urlObj.port || 443,
                path: urlObj.pathname || '/',
                method: 'GET',
                headers: {
                    'Host': urlObj.hostname,
                    'User-Agent': 'Mozilla/5.0'
                },
                socket: socket,
                agent: false
            }, (res) => {
                clearTimeout(timeout);
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    const duration = Date.now() - startTime;
                    resolve({
                        success: res.statusCode === 200 || res.statusCode === 302,
                        statusCode: res.statusCode,
                        duration: duration,
                        size: data.length
                    });
                });
            });
            
            req.on('error', (error) => {
                clearTimeout(timeout);
                resolve({ success: false, error: error.message });
            });
            
            req.end();
        });
        
        proxyReq.on('error', (error) => {
            clearTimeout(timeout);
            resolve({ success: false, error: `Proxy error: ${error.message}` });
        });
        
        proxyReq.end();
    });
}

// 主函数
async function main() {
    try {
        console.log('========== 测试修复后的代理功能 ==========\n');
        
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
        console.log('等待5秒让Clash完全启动...');
        await new Promise(r => setTimeout(r, 5000));
        
        // 2. 测试各个网站
        console.log('\n2. 测试网站访问:\n');
        
        for (const site of TEST_SITES) {
            try {
                console.log(`测试 ${site.name} (${site.url})...`);
                const result = await testWithProxy(site.url, proxyConfig.port);
                
                if (result.success) {
                    console.log(`✓ ${site.name}: 成功 (${result.duration}ms, ${result.size} bytes)\n`);
                } else {
                    console.log(`✗ ${site.name}: 失败 - ${result.error}\n`);
                }
            } catch (e) {
                console.log(`✗ ${site.name}: 异常 - ${e.message}\n`);
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
        setTimeout(() => process.exit(0), 2000);
    }
}

// 执行
if (require.main === module) {
    main();
}
