/**
 * 测试不使用 Cookie 访问帖子
 */

const http = require('http');
const https = require('https');

async function testWithoutCookie() {
    console.log('========== 测试不使用 Cookie 访问 ==========\n');
    
    const testUrl = 'https://linux.do/t/topic/1590573.json';
    const proxyHost = '127.0.0.1';
    const proxyPort = 7940;
    
    console.log(`测试 URL: ${testUrl}`);
    console.log(`代理: ${proxyHost}:${proxyPort}`);
    console.log(`Cookie: 无\n`);
    
    try {
        const result = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('请求超时'));
            }, 30000);
            
            const urlObj = new URL(testUrl);
            
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
                
                const req = https.request({
                    host: urlObj.hostname,
                    port: 443,
                    path: urlObj.pathname,
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
                    console.log(`✓ 收到响应: ${res.statusCode} ${res.statusMessage}\n`);
                    
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        clearTimeout(timeout);
                        resolve({ data, statusCode: res.statusCode });
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
                reject(error);
            });
            
            proxyReq.end();
        });
        
        if (result.statusCode === 403) {
            console.log('❌ 403 Forbidden - 这是预期的（没有 Cookie）');
        } else if (result.statusCode === 200) {
            console.log('✓ 200 OK - 不需要 Cookie 也能访问！');
        } else {
            console.log(`状态码: ${result.statusCode}`);
        }
        
        console.log(`\n结论: ${result.statusCode === 403 ? 'Cookie 确实已失效，需要更新' : '可能不需要 Cookie'}`);
        
    } catch (e) {
        console.log(`❌ 访问失败: ${e.message}`);
    }
}

testWithoutCookie().catch(console.error);
