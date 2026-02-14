#!/usr/bin/env node
/**
 * 测试 app.js 使用付费节点代理获取节点
 */

const http = require('http');

function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

async function testFetchAll() {
    log('========== 测试全网获取(使用付费节点代理) ==========\n');
    
    try {
        // 1. 触发全网获取
        log('发送全网获取请求...');
        
        const postData = JSON.stringify({ pages: 5 }); // 只获取5页,快速测试
        
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/fetch_all',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const result = JSON.parse(data);
                log(`✓ 请求响应: ${result.message}`);
                
                if (result.success) {
                    log('\n开始监控日志...\n');
                    monitorLogs();
                } else {
                    log(`✗ 请求失败: ${result.message}`);
                }
            });
        });
        
        req.on('error', (error) => {
            log(`✗ 请求错误: ${error.message}`);
        });
        
        req.write(postData);
        req.end();
        
    } catch (error) {
        log(`错误: ${error.message}`);
    }
}

function monitorLogs() {
    const interval = setInterval(() => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/status',
            method: 'GET'
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const status = JSON.parse(data);
                    
                    log(`状态: ${status.status}, 总节点: ${status.total}, 有效节点: ${status.active}`);
                    
                    // 显示最新的几条日志
                    if (status.logs && status.logs.length > 0) {
                        const recentLogs = status.logs.slice(-3);
                        recentLogs.forEach(logEntry => {
                            console.log(`  [${logEntry.level}] ${logEntry.message}`);
                        });
                    }
                    
                    // 如果任务完成,停止监控
                    if (status.status === 'idle' && status.total > 0) {
                        log('\n========== 任务完成 ==========');
                        log(`总节点: ${status.total}`);
                        log(`有效节点: ${status.active}`);
                        log(`成功率: ${((status.active / status.total) * 100).toFixed(2)}%`);
                        clearInterval(interval);
                        process.exit(0);
                    }
                } catch (e) {
                    log(`解析状态失败: ${e.message}`);
                }
            });
        });
        
        req.on('error', () => {
            // 忽略错误
        });
        
        req.end();
        
    }, 5000); // 每5秒检查一次
    
    // 10分钟后超时
    setTimeout(() => {
        log('\n超时,停止监控');
        clearInterval(interval);
        process.exit(1);
    }, 600000);
}

// 检查服务器是否运行
function checkServer() {
    return new Promise((resolve) => {
        const req = http.get('http://localhost:3000/api/status', (res) => {
            resolve(true);
        });
        
        req.on('error', () => {
            resolve(false);
        });
        
        req.setTimeout(2000, () => {
            req.destroy();
            resolve(false);
        });
    });
}

async function main() {
    log('检查服务器状态...');
    
    const isRunning = await checkServer();
    
    if (!isRunning) {
        log('✗ 服务器未运行,请先启动: node app.js');
        process.exit(1);
    }
    
    log('✓ 服务器正在运行\n');
    
    await testFetchAll();
}

if (require.main === module) {
    main();
}
