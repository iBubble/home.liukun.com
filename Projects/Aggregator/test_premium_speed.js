#!/usr/bin/env node
/**
 * 测试付费订阅中专线节点的速度
 * 优先测试台湾、美国、日本、新加坡的专线节点
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const http = require('http');
const https = require('https');

const ROOT = __dirname;
const CLASH_DIR = path.join(ROOT, 'clash_bin');
const CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
const PREMIUM_NODES_FILE = path.join(ROOT, 'premium_nodes.json');
const TEST_PORT = 7950;

let clashProcess = null;

// 日志函数
function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

// 加载付费节点
function loadPremiumNodes() {
    if (!fs.existsSync(PREMIUM_NODES_FILE)) {
        throw new Error('付费节点文件不存在');
    }
    
    const data = JSON.parse(fs.readFileSync(PREMIUM_NODES_FILE, 'utf8'));
    return data.nodes;
}

// 筛选专线节点(优先台湾、美国、日本、新加坡)
function filterPriorityNodes(nodes) {
    const priority = ['台湾', '美国', '日本', '新加坡'];
    
    const filtered = nodes.filter(node => {
        const name = node.name || '';
        // 必须是专线节点
        if (!name.includes('专线')) return false;
        // 必须是优先地区
        return priority.some(region => name.includes(region));
    });
    
    log(`筛选出 ${filtered.length} 个优先专线节点`);
    return filtered;
}

// 创建 Clash 配置
function createClashConfig(node) {
    const config = {
        port: TEST_PORT,
        'socks-port': TEST_PORT + 1,
        'allow-lan': false,
        mode: 'global',
        'log-level': 'silent',
        proxies: [node],
        'proxy-groups': [{
            name: 'PROXY',
            type: 'select',
            proxies: [node.name]
        }],
        rules: ['MATCH,PROXY']
    };
    
    const configPath = path.join(ROOT, 'clash_data', 'speed_test_config.yaml');
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(configPath, yaml.dump(config));
    return configPath;
}

// 启动 Clash
function startClash(configPath) {
    return new Promise((resolve, reject) => {
        clashProcess = spawn(CLASH_BIN, ['-d', path.dirname(configPath), '-f', configPath], {
            stdio: 'pipe'
        });
        
        clashProcess.on('error', reject);
        
        // 等待启动
        setTimeout(() => {
            if (clashProcess && !clashProcess.killed) {
                resolve();
            } else {
                reject(new Error('Clash启动失败'));
            }
        }, 3000);
    });
}

// 停止 Clash
function stopClash() {
    if (clashProcess && !clashProcess.killed) {
        try {
            clashProcess.kill('SIGTERM');
            setTimeout(() => {
                if (clashProcess && !clashProcess.killed) {
                    clashProcess.kill('SIGKILL');
                }
            }, 1000);
        } catch (e) {
            // 忽略错误
        }
        clashProcess = null;
    }
}

// 测试节点速度(通过HTTP CONNECT隧道)
function testNodeSpeed(nodeName) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const testUrl = 'https://www.google.com';
        const urlObj = new URL(testUrl);
        
        // 先连接到代理
        const proxyReq = http.request({
            host: '127.0.0.1',
            port: TEST_PORT,
            method: 'CONNECT',
            path: `${urlObj.hostname}:443`
        });
        
        const timeout = setTimeout(() => {
            proxyReq.destroy();
            resolve({ success: false, latency: 'timeout' });
        }, 10000);
        
        proxyReq.on('connect', (res, socket) => {
            if (res.statusCode !== 200) {
                clearTimeout(timeout);
                resolve({ success: false, latency: 'connect_failed' });
                return;
            }
            
            // 通过代理隧道发送HTTPS请求
            const req = https.request({
                host: urlObj.hostname,
                port: 443,
                path: '/',
                method: 'GET',
                headers: {
                    'Host': urlObj.hostname,
                    'User-Agent': 'Mozilla/5.0'
                },
                socket: socket,
                agent: false
            }, (res) => {
                clearTimeout(timeout);
                const latency = Date.now() - startTime;
                
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    resolve({
                        success: res.statusCode === 200 || res.statusCode === 302,
                        latency: latency
                    });
                });
            });
            
            req.on('error', () => {
                clearTimeout(timeout);
                resolve({ success: false, latency: 'request_failed' });
            });
            
            req.end();
        });
        
        proxyReq.on('error', () => {
            clearTimeout(timeout);
            resolve({ success: false, latency: 'proxy_error' });
        });
        
        proxyReq.end();
    });
}

// 测试单个节点
async function testNode(node) {
    try {
        log(`\n测试节点: ${node.name}`);
        
        // 创建配置
        const configPath = createClashConfig(node);
        
        // 启动Clash
        await startClash(configPath);
        log('  Clash已启动');
        
        // 等待稳定
        await new Promise(r => setTimeout(r, 2000));
        
        // 测试3次取平均值
        const results = [];
        for (let i = 0; i < 3; i++) {
            const result = await testNodeSpeed(node.name);
            if (result.success && typeof result.latency === 'number') {
                results.push(result.latency);
                log(`  测试 ${i + 1}/3: ${result.latency}ms`);
            } else {
                log(`  测试 ${i + 1}/3: 失败 (${result.latency})`);
            }
            await new Promise(r => setTimeout(r, 1000));
        }
        
        // 停止Clash
        stopClash();
        await new Promise(r => setTimeout(r, 1000));
        
        if (results.length === 0) {
            log(`  ✗ 节点不可用`);
            return { node, avgLatency: null, success: false };
        }
        
        const avgLatency = Math.round(results.reduce((a, b) => a + b, 0) / results.length);
        log(`  ✓ 平均延迟: ${avgLatency}ms`);
        
        return { node, avgLatency, success: true };
        
    } catch (e) {
        log(`  ✗ 测试失败: ${e.message}`);
        stopClash();
        return { node, avgLatency: null, success: false };
    }
}

// 主函数
async function main() {
    try {
        log('========== 开始测试专线节点速度 ==========\n');
        
        // 1. 加载节点
        const allNodes = loadPremiumNodes();
        log(`总节点数: ${allNodes.length}`);
        
        // 2. 筛选优先专线节点
        const priorityNodes = filterPriorityNodes(allNodes);
        
        if (priorityNodes.length === 0) {
            log('未找到优先专线节点');
            process.exit(1);
        }
        
        log(`\n将测试以下节点:`);
        priorityNodes.forEach((node, i) => {
            log(`  ${i + 1}. ${node.name}`);
        });
        
        // 3. 逐个测试
        log('\n========== 开始速度测试 ==========');
        const results = [];
        
        for (const node of priorityNodes) {
            const result = await testNode(node);
            results.push(result);
        }
        
        // 4. 排序并显示结果
        log('\n========== 测试结果汇总 ==========\n');
        
        const successResults = results.filter(r => r.success);
        successResults.sort((a, b) => a.avgLatency - b.avgLatency);
        
        log(`成功: ${successResults.length}/${results.length}\n`);
        
        if (successResults.length > 0) {
            log('速度排名 (从快到慢):');
            successResults.forEach((result, i) => {
                log(`  ${i + 1}. ${result.node.name.padEnd(20)} ${result.avgLatency}ms`);
            });
            
            // 5. 保存最快的节点配置
            const topNodes = successResults.slice(0, 5);
            const fastestConfig = {
                updated_at: new Date().toISOString(),
                test_method: 'google.com访问测试',
                nodes: topNodes.map(r => ({
                    ...r.node,
                    avgLatency: r.avgLatency
                }))
            };
            
            const outputFile = path.join(ROOT, 'fastest_premium_nodes.json');
            fs.writeFileSync(outputFile, JSON.stringify(fastestConfig, null, 2));
            log(`\n✓ 最快的 ${topNodes.length} 个节点已保存到: ${outputFile}`);
            
            // 6. 更新 premium_proxy_manager.js 使用的节点
            log('\n推荐配置:');
            log('修改 premium_proxy_manager.js 中的 loadPremiumNodes() 方法');
            log('使用以下节点(按速度排序):');
            topNodes.forEach((result, i) => {
                log(`  ${i + 1}. ${result.node.name} (${result.avgLatency}ms)`);
            });
        } else {
            log('所有节点测试均失败');
        }
        
        log('\n========== 测试完成 ==========');
        
    } catch (error) {
        log(`错误: ${error.message}`);
        console.error(error);
    } finally {
        stopClash();
        process.exit(0);
    }
}

// 执行
if (require.main === module) {
    main();
}
