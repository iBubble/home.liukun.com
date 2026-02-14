/**
 * 测试不使用代理直接访问 linux.do
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

async function testDirect() {
    console.log('========== 测试直接访问（无代理）==========\n');
    
    // 读取 Cookie
    const cookieFile = path.join(__dirname, 'linuxdo_cookie.txt');
    let cookie = '';
    if (fs.existsSync(cookieFile)) {
        cookie = fs.readFileSync(cookieFile, 'utf8').trim();
        console.log(`✓ Cookie 已加载 (${cookie.substring(0, 50)}...)\n`);
    } else {
        console.log('⚠️ Cookie 文件不存在\n');
    }
    
    const testUrl = 'https://linux.do/t/topic/1590573.json';
    
    console.log(`测试 URL: ${testUrl}`);
    console.log(`模式: 直接访问（无代理）\n`);
    
    try {
        const startTime = Date.now();
        
        const result = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('请求超时 (30秒)'));
            }, 30000);
            
            const urlObj = new URL(testUrl);
            
            const requestHeaders = {
                'Host': urlObj.hostname,
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/html, */*',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Connection': 'keep-alive'
            };
            
            if (cookie) {
                requestHeaders['Cookie'] = cookie;
            }
            
            const req = https.request({
                hostname: urlObj.hostname,
                port: 443,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: requestHeaders
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
        
        console.log(`\n✓ 请求成功 (${result.elapsed}ms)`);
        console.log(`状态码: ${result.statusCode}\n`);
        
        // 分析响应
        if (result.statusCode === 403) {
            console.log('❌ 403 Forbidden');
            console.log('可能原因：');
            console.log('  1. Cookie 绑定了特定 IP（你在 Mac 上登录的 IP）');
            console.log('  2. Cloudflare 检测到异常访问');
            console.log('  3. 服务器 IP 被限制');
            
        } else if (result.statusCode === 200) {
            console.log('✅ 200 OK - Cookie 有效！');
            
            try {
                const json = JSON.parse(result.data);
                
                if (json.title) {
                    console.log(`\n✓ 成功获取帖子信息:`);
                    console.log(`  标题: ${json.title}`);
                    console.log(`  作者: ${json.post_stream?.posts?.[0]?.username || '未知'}`);
                    console.log(`  回复数: ${json.posts_count || 0}`);
                    console.log(`  浏览数: ${json.views || 0}`);
                    
                    console.log('\n✅ Cookie 完全有效！');
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

testDirect().catch(console.error);
