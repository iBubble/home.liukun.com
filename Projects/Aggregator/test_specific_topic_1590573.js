/**
 * 测试访问具体帖子：https://linux.do/t/topic/1590573
 * 用于验证 Cookie 是否有效
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

async function testSpecificTopic() {
    console.log('========== 测试访问帖子 1590573 ==========\n');
    
    // 读取 Cookie
    const cookieFile = path.join(__dirname, 'linuxdo_cookie.txt');
    let cookie = '';
    if (fs.existsSync(cookieFile)) {
        cookie = fs.readFileSync(cookieFile, 'utf8').trim();
        console.log(`✓ Cookie 已加载 (${cookie.substring(0, 50)}...)`);
    } else {
        console.log('⚠️ Cookie 文件不存在');
    }
    
    const testUrl = 'https://linux.do/t/topic/1590573.json';
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
                    'Connection': 'keep-alive'
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
        console.log(`状态码: ${result.statusCode}\n`);
        
        // 分析响应
        if (result.statusCode === 403) {
            console.log('❌ 403 Forbidden - Cookie 已失效或被 Cloudflare 拦截');
            console.log('这是 Cookie 失效的表现');
            
            if (result.data.includes('login-required')) {
                console.log('✓ 确认：需要登录（login-required）');
            }
            if (result.data.includes('Cloudflare')) {
                console.log('✓ 确认：被 Cloudflare 拦截');
            }
            
        } else if (result.statusCode === 200) {
            console.log('✓ 200 OK - Cookie 有效！');
            
            // 尝试解析 JSON
            try {
                const json = JSON.parse(result.data);
                
                if (json.title) {
                    console.log(`\n✓ 成功获取帖子信息:`);
                    console.log(`  标题: ${json.title}`);
                    console.log(`  作者: ${json.post_stream?.posts?.[0]?.username || '未知'}`);
                    console.log(`  回复数: ${json.posts_count || 0}`);
                    console.log(`  浏览数: ${json.views || 0}`);
                    
                    // 检查帖子内容
                    const firstPost = json.post_stream?.posts?.[0];
                    if (firstPost) {
                        const content = firstPost.cooked || '';
                        console.log(`\n帖子内容预览 (前200字符):`);
                        console.log(content.substring(0, 200).replace(/<[^>]+>/g, ''));
                    }
                    
                    console.log('\n✅ Cookie 完全有效，可以正常访问帖子内容！');
                    
                } else {
                    console.log('\n⚠️ JSON 格式异常，可能不是预期的帖子数据');
                    console.log(`响应内容 (前300字符):\n${result.data.substring(0, 300)}`);
                }
                
            } catch (e) {
                console.log(`\n⚠️ JSON 解析失败: ${e.message}`);
                console.log(`响应内容 (前300字符):\n${result.data.substring(0, 300)}`);
            }
            
        } else {
            console.log(`⚠️ 未预期的状态码: ${result.statusCode}`);
            console.log(`响应内容 (前300字符):\n${result.data.substring(0, 300)}`);
        }
        
    } catch (e) {
        console.log(`\n❌ 访问失败: ${e.message}`);
    }
}

testSpecificTopic().catch(console.error);
