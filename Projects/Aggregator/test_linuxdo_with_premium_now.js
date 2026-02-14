/**
 * 测试使用付费节点代理访问 Linux.do
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

async function testLinuxDo() {
    console.log('========== 测试 Linux.do 访问 ==========\n');
    
    // 读取 Cookie
    const cookieFile = path.join(__dirname, 'linuxdo_cookie.txt');
    let cookie = '';
    if (fs.existsSync(cookieFile)) {
        cookie = fs.readFileSync(cookieFile, 'utf8').trim();
        console.log(`✓ Cookie 已加载 (${cookie.substring(0, 50)}...)`);
    } else {
        console.log('⚠️ Cookie 文件不存在');
    }
    
    const testUrl = 'https://linux.do/tag/%E8%AE%A2%E9%98%85%E8%8A%82%E7%82%B9.json';
    const proxyHost = '127.0.0.1';
    const proxyPort = 7940; // 付费节点代理端口
    
    console.log(`\n测试 URL: ${testUrl}`);
    console.log(`代理: ${proxyHost}:${proxyPort}\n`);
    
    try {
        const startTime = Date.now();
        
        const result = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('请求超时 (30秒)'));
            }, 30000);
            
            const urlObj = new URL(testUrl);
            
            // 连接到代理
            const proxyReq = http.request({
                host: proxyHost,
                port: proxyPort,
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
                const requestHeaders = {
                    'Host': urlObj.hostname,
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/html, */*',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                };
                
                if (cookie) {
                    requestHeaders['Cookie'] = cookie;
                }
                
                const req = https.request({
                    host: urlObj.hostname,
                    port: 443,
                    path: urlObj.pathname + urlObj.search,
                    method: 'GET',
                    headers: requestHeaders,
                    socket: socket,
                    agent: false
                });
                
                req.on('response', (res) => {
                    console.log(`✓ 收到响应: ${res.statusCode} ${res.statusMessage}`);
                    console.log(`响应头:`, res.headers);
                    
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        clearTimeout(timeout);
                        const elapsed = Date.now() - startTime;
                        resolve({ data, statusCode: res.statusCode, elapsed, headers: res.headers });
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
        
        console.log(`\n✓ 请求成功 (${result.elapsed}ms)`);
        console.log(`状态码: ${result.statusCode}`);
        
        // 检查响应内容
        if (result.data.includes('<!DOCTYPE') || result.data.includes('<html')) {
            console.log('\n⚠️ 返回的是 HTML 页面，可能被 Cloudflare 拦截');
            console.log(`响应内容 (前500字符):\n${result.data.substring(0, 500)}`);
            
            if (result.data.includes('login-required') || result.data.includes('Cloudflare')) {
                console.log('\n❌ 确认：被 Cloudflare 拦截或需要登录');
            }
        } else {
            // 尝试解析 JSON
            try {
                const json = JSON.parse(result.data);
                const topics = json.topic_list?.topics || [];
                console.log(`\n✓ 成功获取 JSON 数据`);
                console.log(`✓ 获取到 ${topics.length} 个帖子`);
                
                if (topics.length > 0) {
                    console.log(`\n前3个帖子:`);
                    topics.slice(0, 3).forEach((t, i) => {
                        console.log(`  ${i + 1}. ${t.title}`);
                    });
                }
            } catch (e) {
                console.log(`\n⚠️ JSON 解析失败: ${e.message}`);
                console.log(`响应内容 (前500字符):\n${result.data.substring(0, 500)}`);
            }
        }
        
    } catch (e) {
        console.log(`\n❌ 访问失败: ${e.message}`);
    }
}

testLinuxDo().catch(console.error);
