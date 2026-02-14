/**
 * 快速测试 Linux.do 访问
 */

const http = require('http');

async function testLinuxDoAPI() {
    console.log('测试 Linux.do 导入功能...\n');
    
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: '/api/import_linuxdo',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('API 响应:', result);
                    
                    if (result.success) {
                        console.log('\n✓ Linux.do 导入任务已启动');
                        console.log('请查看 http://localhost:3000 的日志输出');
                    } else {
                        console.log('\n⚠️', result.message);
                    }
                    resolve();
                } catch (e) {
                    console.error('解析响应失败:', e.message);
                    reject(e);
                }
            });
        });
        
        req.on('error', (e) => {
            console.error('请求失败:', e.message);
            reject(e);
        });
        
        req.end();
    });
}

testLinuxDoAPI().catch(console.error);
