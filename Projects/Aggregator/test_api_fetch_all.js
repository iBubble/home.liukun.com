#!/usr/bin/env node
/**
 * 测试 /api/fetch-all-nodes API
 */

const http = require('http');

console.log('测试 /api/fetch-all-nodes API...\n');

// 发送POST请求
const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/fetch-all-nodes',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
}, (res) => {
    let data = '';
    
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('API响应:', data);
        console.log('\n等待5秒后查看日志...\n');
        
        // 等待5秒后查看日志
        setTimeout(() => {
            const { spawn } = require('child_process');
            const tail = spawn('pm2', ['logs', 'aggregator', '--lines', '50', '--nostream']);
            
            tail.stdout.on('data', (data) => {
                console.log(data.toString());
            });
            
            tail.on('close', () => {
                process.exit(0);
            });
        }, 5000);
    });
});

req.on('error', (e) => {
    console.error('请求失败:', e.message);
    process.exit(1);
});

req.end();
