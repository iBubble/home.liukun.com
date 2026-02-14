/**
 * 测试当前 Linux.do 访问情况
 * 模拟 app.js 中的 fetchWithProxy 逻辑
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { getPremiumProxyManager } = require('./premium_proxy_manager');

async function testLinuxDoAccess() {
    console.log('========== 测试 Linux.do 访问 ==========\n');
    
    const testUrl = 'https://linux.do/tag/%E8%AE%A2%E9%98%85%E8%8A%82%E7%82%B9.json';
    const premiumProxy = getPremiumProxyManager();
    
    // 1. 检查付费节点文件
    const premiumNodesFile = path.join(__dirname, 'premium_nodes.json');
    if (!fs.existsSync(premiumNodesFile)) {
        console.log('❌ 付费节点文件不存在');
        return;
    }
    console.log('✓ 付费节点文件存在');
    
    // 2. 检查代理是否运行
    console.log(`\n当前代理状态: ${premiumProxy.isProxyRunning() ? '运行中' : '未运行'}`);
    
    // 3. 尝试启动代理
    if (!premiumProxy.isProxyRunning()) {
        console.log('\n🚀 启动付费节点代理...');
        try {
            await premiumProxy.start();
            console.log('✓ 代理启动成功');
            
            // 等待代理完全启动
            await new Promise(r => setTimeout(r, 3000));
        } catch (e) {
            console.log(`❌ 代理启动失败: ${e.message}`);
            return;
        }
    }
    
    // 4. 获取代理配置
    const config = premiumProxy.getProxyConfig();
    console.log(`\n代理配置: ${config.host}:${config.port}`);
    
    // 5. 测试访问 Linux.do
    console.log(`\n测试访问: ${testUrl}`);
    console.log('使用 HTTP CONNECT 隧道方式...\n');
    
    try {
        const startTime = Date.now();
        
        const result = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('请求超时 (30秒)'));
            }, 30000);
            
            const urlObj = new URL(testUrl);
            
            // 连接到代理
            const proxyReq = http.request({
                host: config.host,
                port: config.port,
                method: 'CONNECT',
                path: `${urlObj.hostname}:443`
            });
            
            proxyReq.on('connect', (res, socket) => {
                if (res.statusCode !== 200) {
                    clearTimeout(timeout);
                    reject(new Error(`代理连接失败: ${res.statusCode}`));
                    return;
                }
                
                console.log('✓ 代理隧道建立成功');
                
                // 通过隧道发送 HTTPS 请求
                const req = https.request({
                    host: urlObj.hostname,
                    port: 443,
                    path: urlObj.pathname + urlObj.search,
                    method: 'GET',
                    headers: {
                        'Host': urlObj.hostname,
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                        'Accept': 'application/json'
                    },
                    socket: socket,
                    agent: false
                });
                
                req.on('response', (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        clearTimeout(timeout);
                        const elapsed = Date.now() - startTime;
                        resolve({ data, statusCode: res.statusCode, elapsed });
                    });
                });
                
                req.on('error', (error) => {
                    clearTimeout(timeout);
                    reject(error);
                });
                
                req.end();
            });
            
            proxyReq.on('error', (error) => {
                clearTimeout(timeout);
                reject(new Error(`代理错误: ${error.message}`));
            });
            
            proxyReq.end();
        });
        
        console.log(`✓ 请求成功 (${result.elapsed}ms)`);
        console.log(`状态码: ${result.statusCode}`);
        
        // 解析 JSON
        try {
            const json = JSON.parse(result.data);
            const topics = json.topic_list?.topics || [];
            console.log(`✓ 获取到 ${topics.length} 个帖子`);
            
            if (topics.length > 0) {
                console.log(`\n前3个帖子:`);
                topics.slice(0, 3).forEach((t, i) => {
                    console.log(`  ${i + 1}. ${t.title}`);
                });
            }
        } catch (e) {
            console.log(`⚠️ JSON 解析失败: ${e.message}`);
            console.log(`响应内容 (前200字符): ${result.data.substring(0, 200)}`);
        }
        
    } catch (e) {
        console.log(`❌ 访问失败: ${e.message}`);
    }
    
    // 6. 保持代理运行（不停止）
    console.log('\n✓ 测试完成，代理保持运行状态');
}

testLinuxDoAccess().catch(console.error);
