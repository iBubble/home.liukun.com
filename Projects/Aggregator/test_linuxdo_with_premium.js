#!/usr/bin/env node
/**
 * 使用付费订阅节点访问 Linux.do 获取订阅节点
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = __dirname;
const CLASH_DIR = path.join(ROOT, 'clash_bin');
const CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
const CLASH_CONFIG = path.join(ROOT, 'clash_data', 'linuxdo_premium_config.yaml');
const PREMIUM_NODES_FILE = path.join(ROOT, 'premium_nodes.json');
const COOKIE_FILE = path.join(ROOT, 'linuxdo_cookie.txt');
const TEST_PORT = 7925;

let clashProcess = null;

// 日志函数
function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

// 加载付费节点
function loadPremiumNodes() {
    if (!fs.existsSync(PREMIUM_NODES_FILE)) {
        throw new Error(`付费节点文件不存在: ${PREMIUM_NODES_FILE}\n请先运行: node premium_subscription_updater.js`);
    }

    const data = JSON.parse(fs.readFileSync(PREMIUM_NODES_FILE, 'utf8'));
    log(`加载付费节点: ${data.total_nodes} 个`);

    // 使用前10个节点，增加成功率
    return data.nodes.slice(0, 10);
}

// 加载 Cookie
function loadCookie() {
    if (!fs.existsSync(COOKIE_FILE)) {
        log('⚠️ Cookie 文件不存在,将尝试无 Cookie 访问');
        return '';
    }

    const cookie = fs.readFileSync(COOKIE_FILE, 'utf8').trim();
    log(`✓ Cookie 已加载 (${cookie.length} 字符)`);
    return cookie;
}

// 创建 Clash 配置
function createClashConfig(nodes) {
    const config = {
        port: TEST_PORT,
        'socks-port': TEST_PORT + 1,
        'allow-lan': false,
        mode: 'rule',
        'log-level': 'info',
        'external-controller': `127.0.0.1:${TEST_PORT + 100}`,
        proxies: nodes,
        'proxy-groups': [{
            name: 'PROXY',
            type: 'url-test',
            url: 'http://www.gstatic.com/generate_204',
            interval: 300,
            proxies: nodes.map(p => p.name)
        }],
        rules: [
            'MATCH,PROXY'
        ]
    };

    const configDir = path.dirname(CLASH_CONFIG);
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }

    fs.writeFileSync(CLASH_CONFIG, yaml.dump(config));
    log(`Clash 配置已创建: ${CLASH_CONFIG}`);
}

// 启动 Clash
function startClash() {
    return new Promise((resolve, reject) => {
        log(`启动 Clash: ${CLASH_BIN}`);

        clashProcess = spawn(CLASH_BIN, ['-d', path.dirname(CLASH_CONFIG), '-f', CLASH_CONFIG], {
            stdio: ['ignore', 'pipe', 'pipe'],
            env: {
                ...process.env,
                HTTP_PROXY: '',
                HTTPS_PROXY: '',
                http_proxy: '',
                https_proxy: ''
            }
        });

        let output = '';

        clashProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        clashProcess.stderr.on('data', (data) => {
            output += data.toString();
            if (output.includes('HTTP proxy listening') || output.includes('SOCKS proxy listening')) {
                log('✓ Clash 启动成功');
                resolve();
            }
        });

        clashProcess.on('error', reject);

        setTimeout(() => {
            if (clashProcess && !clashProcess.killed) {
                log('✓ Clash 已启动 (超时检测)');
                resolve();
            }
        }, 5000);
    });
}

// 停止 Clash
function stopClash() {
    if (clashProcess && !clashProcess.killed) {
        log('停止 Clash');
        clashProcess.kill();
        clashProcess = null;
    }
}

// 使用 curl 通过代理访问
function curlWithProxy(url, cookie, timeout = 30) {
    return new Promise((resolve, reject) => {
        const curlArgs = [
            '-s', '-L',
            '--max-time', timeout.toString(),
            '-H', 'Accept: application/json',
            '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            '-x', `http://127.0.0.1:${TEST_PORT}`,
        ];

        if (cookie) {
            curlArgs.push('-H', `Cookie: ${cookie}`);
        }

        curlArgs.push(url);

        log(`执行 curl: ${url}`);

        const child = spawn('curl', curlArgs, {
            timeout: (timeout + 2) * 1000,
            env: {
                ...process.env,
                HTTP_PROXY: '',
                HTTPS_PROXY: '',
                http_proxy: '',
                https_proxy: ''
            }
        });

        let data = '';
        let error = '';

        child.stdout.on('data', chunk => data += chunk);
        child.stderr.on('data', chunk => error += chunk);

        child.on('close', (code) => {
            if (code === 0 && data) {
                resolve(data);
            } else {
                reject(new Error(`curl 失败 (code ${code}): ${error || '无数据'}`));
            }
        });

        child.on('error', reject);
    });
}

// 提取节点链接
function extractNodes(content) {
    const nodes = [];
    const patterns = [
        /vmess:\/\/[A-Za-z0-9+\/=_-]+/g,
        /vless:\/\/[A-Za-z0-9@.:_\-?&=%#\/]+/g,
        /trojan:\/\/[A-Za-z0-9@.:_\-?&=%#\/]+/g,
        /ss:\/\/[A-Za-z0-9@.:_\-?&=%#\/]+/g,
        /hysteria2?:\/\/[A-Za-z0-9@.:_\-?&=%#\/]+/g,
        /hy2:\/\/[A-Za-z0-9@.:_\-?&=%#\/]+/g
    ];

    for (const pattern of patterns) {
        const matches = content.match(pattern) || [];
        nodes.push(...matches);
    }

    return [...new Set(nodes)]; // 去重
}

// 提取订阅链接
function extractSubscriptions(content) {
    const subs = [];
    const subPattern = /https?:\/\/[^\s<>"'\)]+(?:subscribe|sub|api|clash|v2ray)[^\s<>"'\)]*/gi;
    const matches = content.match(subPattern) || [];

    for (let url of matches) {
        url = url.replace(/&amp;/g, '&').replace(/[,;。，；]+$/, '').trim();
        if (!url.includes('linux.do') && !url.includes('github.com') && url.length < 500) {
            subs.push(url);
        }
    }

    return [...new Set(subs)]; // 去重
}

// 主函数
async function main() {
    try {
        log('========== 使用付费节点访问 Linux.do ==========\n');

        // 1. 加载付费节点
        const nodes = loadPremiumNodes();
        log(`使用节点: ${nodes.map(n => n.name).join(', ')}\n`);

        // 2. 加载 Cookie
        const cookie = loadCookie();

        // 3. 创建 Clash 配置
        createClashConfig(nodes);

        // 4. 启动 Clash
        await startClash();
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 5. 访问 Linux.do 标签页
        log('\n========== 获取订阅节点标签页 ==========\n');
        const tagUrl = 'https://linux.do/tag/%E8%AE%A2%E9%98%85%E8%8A%82%E7%82%B9.json';

        const tagData = await curlWithProxy(tagUrl, cookie);
        const tagJson = JSON.parse(tagData);
        const topics = tagJson.topic_list?.topics || [];

        log(`✓ 获取到 ${topics.length} 个主题\n`);

        // 6. 检查前5个主题
        log('========== 检查主题内容 ==========\n');

        const results = [];

        for (let i = 0; i < Math.min(topics.length, 5); i++) {
            const topic = topics[i];
            log(`[${i + 1}/5] ${topic.title}`);

            try {
                const topicUrl = `https://linux.do/t/topic/${topic.id}.json`;
                const topicData = await curlWithProxy(topicUrl, cookie, 20);
                const topicJson = JSON.parse(topicData);
                const posts = topicJson.post_stream?.posts || [];

                let allNodes = [];
                let allSubs = [];

                // 检查前3个帖子
                for (const post of posts.slice(0, 3)) {
                    const content = post.cooked || '';
                    const nodes = extractNodes(content);
                    const subs = extractSubscriptions(content);
                    allNodes.push(...nodes);
                    allSubs.push(...subs);
                }

                allNodes = [...new Set(allNodes)];
                allSubs = [...new Set(allSubs)];

                if (allNodes.length > 0 || allSubs.length > 0) {
                    log(`  ✓ 找到: ${allNodes.length} 个节点, ${allSubs.length} 个订阅`);
                    results.push({
                        topic: topic.title,
                        id: topic.id,
                        nodes: allNodes,
                        subscriptions: allSubs
                    });
                } else {
                    log(`  - 无节点或订阅`);
                }

                // 等待1秒避免请求过快
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                log(`  ✗ 失败: ${error.message}`);
            }

            log('');
        }

        // 7. 显示结果
        log('========== 结果汇总 ==========\n');

        if (results.length === 0) {
            log('未找到任何节点或订阅链接');
        } else {
            log(`找到 ${results.length} 个包含节点/订阅的主题:\n`);

            results.forEach((result, index) => {
                log(`${index + 1}. ${result.topic} (ID: ${result.id})`);

                if (result.nodes.length > 0) {
                    log(`   节点数: ${result.nodes.length}`);
                    result.nodes.slice(0, 3).forEach(node => {
                        const protocol = node.split('://')[0];
                        log(`   - ${protocol}://...`);
                    });
                    if (result.nodes.length > 3) {
                        log(`   ... 还有 ${result.nodes.length - 3} 个节点`);
                    }
                }

                if (result.subscriptions.length > 0) {
                    log(`   订阅数: ${result.subscriptions.length}`);
                    result.subscriptions.forEach(sub => {
                        log(`   - ${sub}`);
                    });
                }

                log('');
            });

            // 统计总数
            const totalNodes = results.reduce((sum, r) => sum + r.nodes.length, 0);
            const totalSubs = results.reduce((sum, r) => sum + r.subscriptions.length, 0);

            log(`总计: ${totalNodes} 个节点, ${totalSubs} 个订阅链接`);
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

// 信号处理
process.on('SIGINT', () => {
    stopClash();
    process.exit(0);
});

// 执行
if (require.main === module) {
    main();
}

module.exports = { main };
