/**
 * 快速测试当前Cookie是否有效
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { SocksClient } = require('socks');

async function testCookie() {
    console.log('========== 测试Cookie有效性 ==========\n');
    
    // 读取Cookie
    const cookieFile = path.join(__dirname, 'linuxdo_cookie.txt');
    if (!fs.existsSync(cookieFile)) {
        console.log('❌ Cookie文件不存在');
        return;
    }
    
    const cookie = fs.readFileSync(cookieFile, 'utf8').trim();
    console.log(`✓ Cookie已加载 (${cookie.substring(0, 50)}...)\n`);
    
    const testUrl = 'https://linux.do/t/topic/1590573.json';
    const proxyHost = '127.0.0.1';
    const proxyPort = 7940;
    
    console.log(`测试URL: ${testUrl}`);
    console.log(`代理: socks5://${proxyHost}:${proxyPort}\n`);
    
    try {
        const startTime = Date.now();
        
        // 使用SOCKS5代理
        const urlObj = new URL(testUrl);
        
        const socksOptions = {
            proxy: {
                host: proxyHost,
                port: proxyPort,
                type: 5
            },
            command: 'connect',
            destination: {
                host: urlObj.hostname,
                port: 443
            },
            timeout: 30000
        };
        
        console.log('正在连接SOCKS5代理...');
        const info = await SocksClient.createConnection(socksOptions);
        console.log('✓ SOCKS5连接成功\n');
        
        const result = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('请求超时'));
            }, 30000);
            
            const req = https.request({
                host: urlObj.hostname,
                port: 443,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: {
                    'Host': urlObj.hostname,
                    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
                    'Accept': 'application/json',
                    'Cookie': cookie,
                    'Connection': 'close'
                },
                socket: info.socket,
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
        
        console.log(`✓ 请求完成 (${result.elapsed}ms)`);
        console.log(`状态码: ${result.statusCode}\n`);
        
        if (result.statusCode === 403) {
            console.log('❌ 403 Forbidden - Cookie已失效');
        } else if (result.statusCode === 200) {
            console.log('✅ 200 OK - Cookie有效！\n');
            
            try {
                const json = JSON.parse(result.data);
                if (json.title) {
                    console.log(`帖子标题: ${json.title}`);
                    console.log(`回复数: ${json.posts_count || 0}`);
                    console.log(`浏览数: ${json.views || 0}`);
                    console.log('\n✅ Cookie完全有效，可以正常访问帖子内容！');
                }
            } catch (e) {
                console.log('⚠️ 响应不是有效的JSON');
                console.log(`前100字符: ${result.data.substring(0, 100)}`);
            }
        } else {
            console.log(`⚠️ 未预期的状态码: ${result.statusCode}`);
            console.log(`响应前200字符:\n${result.data.substring(0, 200)}`);
        }
        
    } catch (e) {
        console.log(`\n❌ 测试失败: ${e.message}`);
        if (e.message.includes('ECONNREFUSED')) {
            console.log('\n代理连接被拒绝，请检查：');
            console.log('1. Clash是否在运行: netstat -tlnp | grep 7940');
            console.log('2. 在VNC终端运行: bash start_browser_proxy.sh');
        }
    }
}

testCookie().catch(console.error);
