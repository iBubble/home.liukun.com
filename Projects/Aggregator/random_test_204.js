#!/usr/bin/env node
/**
 * 随机测试20个节点
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = __dirname;
const CLASH_DIR = path.join(ROOT, 'clash_bin');
const CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
const TEST_PORT = 7905;

let clashProcess = null;

function test204(timeout = 10) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const url = 'http://www.gstatic.com/generate_204';
        
        const curlArgs = [
            '-s', '-L', '-o', '/dev/null', '-w', '%{http_code}',
            '--max-time', timeout.toString(),
            '--connect-timeout', '5',
            '-x', `http://127.0.0.1:${TEST_PORT}`,
            url
        ];
        
        const child = spawn('curl', curlArgs, { timeout: (timeout + 2) * 1000 });
        let data = '';
        
        child.stdout.on('data', chunk => data += chunk);
        
        child.on('close', (code) => {
            const elapsed = Date.now() - startTime;
            const httpCode = data.trim();
            
            if (code === 0 && httpCode === '204') {
                resolve({ success: true, time: elapsed });
            } else {
                resolve({ success: false, time: elapsed, error: httpCode || 'timeout' });
            }
        });
        
        child.on('error', () => {
            resolve({ success: false, time: Date.now() - startTime, error: 'error' });
        });
    });
}

async function testNode(proxy) {
    const config = {
        port: TEST_PORT,
        'socks-port': TEST_PORT + 1,
        'allow-lan': false,
        mode: 'global',
        'log-level': 'silent',
        proxies: [proxy],
        'proxy-groups': [{
            name: 'PROXY',
            type: 'select',
            proxies: [proxy.name]
        }],
        rules: ['MATCH,PROXY']
    };
