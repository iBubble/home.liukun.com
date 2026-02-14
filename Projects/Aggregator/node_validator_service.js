#!/usr/bin/env node
/**
 * 节点验证服务 - 后台持续运行
 * 
 * 功能:
 * 1. 每小时自动验证所有节点
 * 2. 将可用节点保存到 validated_nodes.json
 * 3. 按质量分级: excellent (能访问Facebook) / good (能访问Google) / basic (能访问204)
 * 4. 自动清理失效节点
 * 5. 提供API查询可用节点
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const http = require('http');

const ROOT = __dirname;
const CLASH_DIR = path.join(ROOT, 'clash_bin');
const CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
const VALIDATED_NODES_FILE = path.join(ROOT, 'validated_nodes.json');
const VALIDATION_LOG_FILE = path.join(ROOT, 'validation_log.json');
const FAILURE_COUNT_FILE = path.join(ROOT, 'node_failure_count.json'); // 失败计数文件
const TEST_PORT = 7902;

// 配置
const CONFIG = {
    validationInterval: 60 * 60 * 1000, // 1小时
    batchSize: 5, // 每批测试5个节点
    testTimeout: 30, // 单个测试超时30秒 (参考NodeLocalChecker)
    maxConcurrent: 1, // 串行测试,避免端口冲突
    maxFailureCount: 3, // 连续失败3次才标记为不可用
    clashStartupWait: 5000, // Clash启动等待时间5秒 (参考NodeLocalChecker)
};

// 测试站点分级 (参考NodeLocalChecker使用http而不是https)
const TEST_SITES = {
    excellent: [
        { name: 'Facebook', url: 'http://www.facebook.com' },
        { name: 'Twitter', url: 'http://twitter.com' },
        { name: 'YouTube', url: 'http://www.youtube.com' },
    ],
    good: [
        { name: 'Google', url: 'http://www.google.com/generate_204' }, // 使用NodeLocalChecker的URL
        { name: 'GitHub', url: 'http://github.com' },
    ],
    basic: [
        { name: 'Google204', url: 'http://www.gstatic.com/generate_204' },
        { name: 'Cloudflare', url: 'http://cp.cloudflare.com/generate_204' }, // 备用
    ]
};

// 全局状态
let validatedNodes = {
    excellent: [], // 优质节点 (能访问Facebook等)
    good: [],      // 良好节点 (能访问Google/GitHub)
    basic: [],     // 基础节点 (能访问204测试页)
    lastUpdate: null,
    totalTested: 0,
    totalValid: 0
};

// 节点失败计数器 (用于跟踪连续失败次数)
let nodeFailureCount = {}; // { "节点名称": 失败次数 }

let validationLogs = [];
let isValidating = false;
let clashProcess = null;
let validationRound = 0; // 验证轮次计数器

// 加载已验证的节点
function loadValidatedNodes() {
    try {
        if (fs.existsSync(VALIDATED_NODES_FILE)) {
            validatedNodes = JSON.parse(fs.readFileSync(VALIDATED_NODES_FILE, 'utf8'));
            console.log(`✅ 加载已验证节点: excellent=${validatedNodes.excellent.length}, good=${validatedNodes.good.length}, basic=${validatedNodes.basic.length}`);
        }
    } catch (e) {
        console.log('⚠️ 加载已验证节点失败:', e.message);
    }

    // 加载失败计数
    try {
        if (fs.existsSync(FAILURE_COUNT_FILE)) {
            nodeFailureCount = JSON.parse(fs.readFileSync(FAILURE_COUNT_FILE, 'utf8'));
            console.log(`✅ 加载失败计数: ${Object.keys(nodeFailureCount).length} 个节点有记录`);
        }
    } catch (e) {
        console.log('⚠️ 加载失败计数失败:', e.message);
    }
}

// 保存已验证的节点
function saveValidatedNodes() {
    try {
        fs.writeFileSync(VALIDATED_NODES_FILE, JSON.stringify(validatedNodes, null, 2));
        console.log(`💾 已保存验证结果: excellent=${validatedNodes.excellent.length}, good=${validatedNodes.good.length}, basic=${validatedNodes.basic.length}`);
    } catch (e) {
        console.log('❌ 保存失败:', e.message);
    }
}

// 保存失败计数
function saveFailureCount() {
    try {
        fs.writeFileSync(FAILURE_COUNT_FILE, JSON.stringify(nodeFailureCount, null, 2));
    } catch (e) {
        console.log('❌ 保存失败计数失败:', e.message);
    }
}

// 添加验证日志
function addLog(message, level = 'info') {
    const log = {
        timestamp: new Date().toISOString(),
        level: level,
        message: message
    };

    validationLogs.push(log);

    // 只保留最近1000条
    if (validationLogs.length > 1000) {
        validationLogs = validationLogs.slice(-1000);
    }

    // 保存日志
    try {
        fs.writeFileSync(VALIDATION_LOG_FILE, JSON.stringify(validationLogs, null, 2));
    } catch (e) { }

    console.log(`[${new Date().toLocaleTimeString()}] [${level.toUpperCase()}] ${message}`);
}

// 测试单个节点
// 测试单个节点 (使用 Python 脚本 check_node_clash.py)
async function testNode(proxy) {
    return new Promise((resolve, reject) => {
        const pythonScript = path.join(ROOT, 'check_node_clash.py');
        const nodeJson = JSON.stringify(proxy);

        const child = spawn('python3', [pythonScript, nodeJson, CLASH_BIN], {
            stdio: ['ignore', 'pipe', 'pipe'],
            env: { ...process.env } // 继承环境
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', data => stdout += data);
        child.stderr.on('data', data => stderr += data);

        child.on('close', code => {
            if (code === 0) {
                try {
                    const result = JSON.parse(stdout);

                    // 转换 Python 脚本结果到 Validator 格式
                    // Python 返回: { available: bool, latency: "200ms", details: str, real_ip: str }
                    // 我们需要: { quality: 'excellent'|'good'|'basic'|null, avgLatency: int, ... }

                    if (result.available) {
                        const latency = parseInt(result.latency.replace('ms', '')) || 999;

                        // 简单评级：能通就是 Basic，延迟低就是 Good/Excellent
                        // 更好的逻辑是 Python 脚本里做更详细测试，但目前 Python 脚本只测了 Google 204
                        // 我们暂定：能连上 Google 算 Good，延迟 < 500 算 Excellent

                        let quality = 'good';
                        if (latency < 800) quality = 'excellent';
                        if (latency > 2000) quality = 'basic';

                        resolve({
                            quality: quality,
                            avgLatency: latency,
                            testResults: { description: result.details, real_ip: result.real_ip },
                            testedAt: new Date().toISOString()
                        });
                    } else {
                        resolve({ quality: null, error: result.details });
                    }
                } catch (e) {
                    addLog(`解析 Python 输出失败: ${e.message} \nRaw: ${stdout}`, 'error');
                    resolve({ quality: null, error: 'Parse Error' });
                }
            } else {
                addLog(`Python 脚本执行失败 (Code ${code}): ${stderr}`, 'error');
                resolve({ quality: null, error: 'Script Error' });
            }
        });

        child.on('error', err => {
            addLog(`Python 进程启动失败: ${err.message}`, 'error');
            resolve({ quality: null, error: 'Spawn Error' });
        });
    });
}

// 验证所有节点
async function validateAllNodes() {
    if (isValidating) {
        addLog('验证任务已在运行中,跳过', 'warning');
        return;
    }

    isValidating = true;
    validationRound++; // 增加轮次
    addLog(`========== 开始节点验证 (第 ${validationRound} 轮) ==========`, 'info');

    try {
        // 🔄 策略: 优先测试已验证的节点,然后测试新节点
        // 1. 收集所有已验证的节点
        const verifiedNodes = [
            ...validatedNodes.excellent,
            ...validatedNodes.good,
            ...validatedNodes.basic
        ];

        // 2. 读取proxies.json中的所有节点
        const proxiesFile = path.join(ROOT, 'proxies.json');
        let allProxies = [];
        if (fs.existsSync(proxiesFile)) {
            allProxies = JSON.parse(fs.readFileSync(proxiesFile, 'utf8'));
        }

        // 3. 找出新节点 (在proxies.json中但不在已验证列表中)
        const verifiedNames = new Set(verifiedNodes.map(n => n.name));
        const newNodes = allProxies.filter(p => !verifiedNames.has(p.name));

        // 4. 合并: 已验证节点 + 新节点
        const nodesToTest = [...verifiedNodes, ...newNodes];

        addLog(`总节点数: ${nodesToTest.length} (已验证: ${verifiedNodes.length}, 新节点: ${newNodes.length})`, 'info');

        // 重置验证结果 (但会保留失败次数 < 3 的节点)
        const newValidated = {
            excellent: [],
            good: [],
            basic: [],
            lastUpdate: new Date().toISOString(),
            totalTested: 0,
            totalValid: 0
        };

        // 分批测试
        for (let i = 0; i < nodesToTest.length; i++) {
            const proxy = nodesToTest[i];
            const nodeName = proxy.name;

            addLog(`[${i + 1}/${allProxies.length}] 测试: ${nodeName}`, 'info');

            try {
                const result = await testNode(proxy);
                newValidated.totalTested++;

                if (result.quality) {
                    // ✅ 节点可用 - 重置失败计数
                    if (nodeFailureCount[nodeName]) {
                        delete nodeFailureCount[nodeName];
                    }

                    newValidated.totalValid++;

                    const validatedProxy = {
                        ...proxy,
                        quality: result.quality,
                        avgLatency: result.avgLatency,
                        testedAt: result.testedAt,
                        testResults: result.testResults
                    };

                    newValidated[result.quality].push(validatedProxy);

                    addLog(`  ✅ ${result.quality} (${result.avgLatency}ms)`, 'success');
                } else {
                    // ❌ 节点不可用 - 增加失败计数
                    if (!nodeFailureCount[nodeName]) {
                        nodeFailureCount[nodeName] = 0;
                    }
                    nodeFailureCount[nodeName]++;

                    const failCount = nodeFailureCount[nodeName];

                    if (failCount >= CONFIG.maxFailureCount) {
                        addLog(`  ❌ 不可用 (连续失败 ${failCount} 次,已标记为不可用)`, 'warning');
                    } else {
                        addLog(`  ⚠️ 暂时不可用 (失败 ${failCount}/${CONFIG.maxFailureCount} 次)`, 'warning');

                        // 🔄 虽然本次失败,但未达到3次,仍保留在已验证列表中(如果之前是可用的)
                        // 从之前的validatedNodes中查找
                        let previousNode = null;
                        for (const quality of ['excellent', 'good', 'basic']) {
                            const found = validatedNodes[quality].find(n => n.name === nodeName);
                            if (found) {
                                previousNode = { ...found, quality };
                                break;
                            }
                        }

                        if (previousNode) {
                            // 保留之前的质量等级,但更新测试时间
                            const retainedProxy = {
                                ...proxy,
                                quality: previousNode.quality,
                                avgLatency: previousNode.avgLatency,
                                testedAt: new Date().toISOString(),
                                testResults: previousNode.testResults,
                                failureCount: failCount // 记录失败次数
                            };

                            newValidated[previousNode.quality].push(retainedProxy);
                            newValidated.totalValid++;
                            addLog(`  🔄 保留之前的 ${previousNode.quality} 状态`, 'info');
                        }
                    }
                }
            } catch (e) {
                addLog(`  ❌ 测试失败: ${e.message}`, 'error');

                // 测试异常也计入失败
                if (!nodeFailureCount[nodeName]) {
                    nodeFailureCount[nodeName] = 0;
                }
                nodeFailureCount[nodeName]++;
            }

            // 每10个节点保存一次
            if ((i + 1) % 10 === 0) {
                validatedNodes = newValidated;
                saveValidatedNodes();
                saveFailureCount(); // 保存失败计数
                addLog(`进度: ${i + 1}/${nodesToTest.length}, 有效: ${newValidated.totalValid}`, 'info');
            }

            // 间隔1秒
            await new Promise(r => setTimeout(r, 1000));
        }

        // 最终保存
        validatedNodes = newValidated;
        saveValidatedNodes();
        saveFailureCount(); // 保存失败计数

        // 按延迟排序
        validatedNodes.excellent.sort((a, b) => a.avgLatency - b.avgLatency);
        validatedNodes.good.sort((a, b) => a.avgLatency - b.avgLatency);
        validatedNodes.basic.sort((a, b) => a.avgLatency - b.avgLatency);

        saveValidatedNodes();

        // 更新种子节点 (使用excellent节点)
        if (validatedNodes.excellent.length > 0) {
            const seedNodes = validatedNodes.excellent.slice(0, 20);
            fs.writeFileSync(
                path.join(ROOT, 'seed_proxies.json'),
                JSON.stringify(seedNodes, null, 2)
            );
            addLog(`已更新种子节点: ${seedNodes.length} 个`, 'success');
        }

        addLog('========== 验证完成 ==========', 'success');
        addLog(`总测试: ${newValidated.totalTested}, 有效: ${newValidated.totalValid} (${Math.round(newValidated.totalValid / newValidated.totalTested * 100)}%)`, 'success');
        addLog(`excellent: ${newValidated.excellent.length}, good: ${newValidated.good.length}, basic: ${newValidated.basic.length}`, 'success');

        // 🔥 触发主服务生成Aggregator.yaml
        try {
            addLog('🔄 触发Aggregator.yaml更新...', 'info');
            const http = require('http');
            const req = http.request({
                hostname: '127.0.0.1',
                port: 3000,
                path: '/api/generate_yaml',
                method: 'POST',
                timeout: 10000
            }, (res) => {
                if (res.statusCode === 200) {
                    addLog('✅ Aggregator.yaml已更新', 'success');
                } else {
                    addLog(`⚠️ yaml更新返回状态码: ${res.statusCode}`, 'warning');
                }
            });
            req.on('error', (e) => {
                addLog(`⚠️ 触发yaml更新失败: ${e.message}`, 'warning');
            });
            req.end();
        } catch (e) {
            addLog(`⚠️ 触发yaml更新异常: ${e.message}`, 'warning');
        }

    } catch (e) {
        addLog(`验证过程出错: ${e.message}`, 'error');
    } finally {
        // 清理
        if (clashProcess) {
            clashProcess.kill('SIGTERM');
            clashProcess = null;
        }
        isValidating = false;

        // 🔄 持续循环: 完成后等待5秒立即开始下一轮
        addLog('⏳ 5秒后开始下一轮验证...', 'info');
        setTimeout(() => {
            validateAllNodes();
        }, 5000);
    }
}

// HTTP API服务
const apiServer = http.createServer((req, res) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    };

    res.writeHead(200, headers);

    if (req.url === '/status') {
        res.end(JSON.stringify({
            isValidating: isValidating,
            validationRound: validationRound,
            validatedNodes: {
                excellent: validatedNodes.excellent.length,
                good: validatedNodes.good.length,
                basic: validatedNodes.basic.length,
                total: validatedNodes.totalValid,
                lastUpdate: validatedNodes.lastUpdate
            },
            failureTracking: {
                totalTracked: Object.keys(nodeFailureCount).length,
                nearFailure: Object.entries(nodeFailureCount).filter(([_, count]) => count >= 2).length,
                maxFailureCount: CONFIG.maxFailureCount
            }
        }));
    } else if (req.url === '/nodes/excellent') {
        res.end(JSON.stringify(validatedNodes.excellent));
    } else if (req.url === '/nodes/good') {
        res.end(JSON.stringify(validatedNodes.good));
    } else if (req.url === '/nodes/basic') {
        res.end(JSON.stringify(validatedNodes.basic));
    } else if (req.url === '/nodes/all') {
        res.end(JSON.stringify(validatedNodes));
    } else if (req.url === '/logs') {
        res.end(JSON.stringify(validationLogs.slice(-100)));
    } else if (req.url === '/validate' && req.method === 'POST') {
        if (!isValidating) {
            validateAllNodes();
            res.end(JSON.stringify({ success: true, message: '验证任务已启动' }));
        } else {
            res.end(JSON.stringify({ success: false, message: '验证任务已在运行中' }));
        }
    } else {
        res.end(JSON.stringify({ error: 'Unknown endpoint' }));
    }
});

// 启动服务
function startService() {
    console.log('========================================');
    console.log('   节点验证服务');
    console.log('========================================\n');

    // 加载已有数据
    loadValidatedNodes();

    // 启动API服务器
    const API_PORT = 3002;
    apiServer.listen(API_PORT, () => {
        console.log(`✅ API服务已启动: http://127.0.0.1:${API_PORT}`);
        console.log('');
        console.log('API端点:');
        console.log(`  GET  /status          - 查看状态`);
        console.log(`  GET  /nodes/excellent - 获取优质节点`);
        console.log(`  GET  /nodes/good      - 获取良好节点`);
        console.log(`  GET  /nodes/basic     - 获取基础节点`);
        console.log(`  GET  /nodes/all       - 获取所有节点`);
        console.log(`  GET  /logs            - 查看日志`);
        console.log(`  POST /validate        - 手动触发验证`);
        console.log('');
    });

    // 立即执行一次验证
    console.log('🚀 启动初始验证...\n');
    validateAllNodes();

    // 定时验证
    setInterval(() => {
        console.log('\n⏰ 定时验证触发...\n');
        validateAllNodes();
    }, CONFIG.validationInterval);

    console.log(`⏰ 定时验证已设置: 每 ${CONFIG.validationInterval / 1000 / 60} 分钟\n`);
}

// 优雅退出
process.on('SIGINT', () => {
    console.log('\n\n正在关闭服务...');
    if (clashProcess) clashProcess.kill();
    apiServer.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\n正在关闭服务...');
    if (clashProcess) clashProcess.kill();
    apiServer.close();
    process.exit(0);
});

// 启动
startService();
