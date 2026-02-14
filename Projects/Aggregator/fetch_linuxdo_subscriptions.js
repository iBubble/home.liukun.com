#!/usr/bin/env node
/**
 * 从 Linux.do 获取订阅链接并下载节点
 * 使用付费订阅节点作为代理
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = __dirname;
const CLASH_DIR = path.join(ROOT, 'clash_bin');
const CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
const CLASH_CONFIG = path.join(ROOT, 'clash_data', 'linuxdo_fetch_config.yaml');
const PREMIUM_NODES_FILE = path.join(ROOT, 'premium_nodes.json');
const COOKIE_FILE = path.join(ROOT, 'linuxdo_cookie.txt');
const OUTPUT_FILE = path.join(ROOT, 'linuxdo_subscriptions.json');
const TEST_PORT = 7930;

let clashProcess = null;

function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

function loadPremiumNodes() {
    if (!fs.existsSync(PREMIUM_NODES_FILE)) {
        throw new Error(`付费节点文件不存在,请先运行: node premium_subscription_updater.js`);
    }
    const data = JSON.parse(fs.readFileSync(PREMIUM_NODES_FILE, 'utf8'));
    // 使用前10个节点，增加成功率
    return data.nodes.slice(0, 10);
}

function loadCookie() {
    if (!fs.existsSync(COOKIE_FILE)) {
        log('⚠️ Cookie 文件不存在');
        return '';
    }
    return fs.readFileSync(COOKIE_FILE, 'utf8').trim();
}

function createClashConfig(nodes) {
    const config = {
        port: TEST_PORT,
        'socks-port': TEST_PORT + 1,
        'allow-lan': false,
        mode: 'rule',
        'log-level': 'silent',
        proxies: nodes,
        'proxy-groups': [{
            name: 'PROXY',
            type: 'url-test',
            url: 'http://www.gstatic.com/generate_204',
            interval: 300,
            proxies: nodes.map(p => p.name)
        }],
        rules: ['MATCH,PROXY']
    };

    const configDir = path.dirname(CLASH_CONFIG);
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }

    fs.writeFileSync(CLASH_CONFIG, yaml.dump(config));
}

async function startClash() {
    return new Promise((resolve) => {
        clashProcess = spawn(CLASH_BIN, ['-d', path.dirname(CLASH_CONFIG), '-f', CLASH_CONFIG], {
            stdio: 'pipe',
            env: { ...process.env, HTTP_PROXY: '', HTTPS_PROXY: '', http_proxy: '', https_proxy: '' }
        });

        setTimeout(() => resolve(), 5000);
    });
}

function stopClash() {
    if (clashProcess && !clashProcess.killed) {
        clashProcess.kill();
        clashProcess = null;
    }
}

function curlWithProxy(url, cookie, timeout = 30) {
    return new Promise((resolve, reject) => {
        const curlArgs = [
            '-s', '-L', '--max-time', timeout.toString(),
            '-H', 'Accept: application/json',
            '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            '-x', `http://127.0.0.1:${TEST_PORT}`
        ];

        if (cookie) {
            curlArgs.push('-H', `Cookie: ${cookie}`);
        }

        curlArgs.push(url);

        const child = spawn('curl', curlArgs, {
            timeout: (timeout + 2) * 1000,
            env: { ...process.env, HTTP_PROXY: '', HTTPS_PROXY: '', http_proxy: '', https_proxy: '' }
        });

        let data = '';
        child.stdout.on('data', chunk => data += chunk);
        child.on('close', (code) => {
            if (code === 0 && data) {
                resolve(data);
            } else {
                reject(new Error(`curl 失败 (code ${code})`));
            }
        });
        child.on('error', reject);
    });
}

function extractSubscriptions(content) {
    const subs = [];
    const subPattern = /https?:\/\/[^\s<>"'\)]+(?:subscribe|sub|api|clash|v2ray)[^\s<>"'\)]*/gi;
    const matches = content.match(subPattern) || [];

    for (let url of matches) {
        url = url.replace(/&amp;/g, '&').replace(/[,;。，；]+$/, '').trim();
        // 过滤掉明显不是订阅的链接
        if (!url.includes('linux.do') &&
            !url.includes('github.com/') &&
            !url.includes('install.sh') &&
            url.length < 500) {
            subs.push(url);
        }
    }

    return [...new Set(subs)];
}

async function downloadSubscription(url, cookie) {
    try {
        log(`  下载订阅: ${url}`);
        const data = await curlWithProxy(url, cookie, 20);

        // 1. 尝试解析为 YAML (Clash 格式)
        try {
            const config = yaml.load(data);
            if (config && config.proxies && Array.isArray(config.proxies)) {
                log(`  ✓ 成功解析 (Clash YAML): ${config.proxies.length} 个节点`);
                return {
                    url: url,
                    success: true,
                    format: 'clash-yaml',
                    nodeCount: config.proxies.length,
                    nodes: config.proxies
                };
            }
        } catch (e) {
            // 不是 YAML 格式
        }

        // 2. 尝试解析为 Base64 编码的节点列表
        try {
            const decoded = Buffer.from(data.trim(), 'base64').toString('utf8');
            const lines = decoded.split('\n').filter(line => line.trim());

            // 检查是否包含节点链接
            const nodeLines = lines.filter(line => {
                const l = line.trim();
                return l.startsWith('vmess://') ||
                    l.startsWith('vless://') ||
                    l.startsWith('trojan://') ||
                    l.startsWith('ss://') ||
                    l.startsWith('hysteria://') ||
                    l.startsWith('hy2://');
            });

            if (nodeLines.length > 0) {
                log(`  ✓ 成功解析 (Base64): ${nodeLines.length} 个节点`);
                return {
                    url: url,
                    success: true,
                    format: 'base64',
                    nodeCount: nodeLines.length,
                    nodeLinks: nodeLines
                };
            }
        } catch (e) {
            // 不是 Base64 格式
        }

        // 3. 检查是否直接是节点链接列表
        const lines = data.split('\n').filter(line => line.trim());
        const nodeLines = lines.filter(line => {
            const l = line.trim();
            return l.startsWith('vmess://') ||
                l.startsWith('vless://') ||
                l.startsWith('trojan://') ||
                l.startsWith('ss://') ||
                l.startsWith('hysteria://') ||
                l.startsWith('hy2://');
        });

        if (nodeLines.length > 0) {
            log(`  ✓ 成功解析 (纯文本): ${nodeLines.length} 个节点`);
            return {
                url: url,
                success: true,
                format: 'plain-text',
                nodeCount: nodeLines.length,
                nodeLinks: nodeLines
            };
        }

        log(`  ✗ 无效的订阅格式 (${data.length} 字节)`);
        return {
            url: url,
            success: false,
            error: '无效的订阅格式',
            dataSize: data.length
        };

    } catch (error) {
        log(`  ✗ 下载失败: ${error.message}`);
        return {
            url: url,
            success: false,
            error: error.message
        };
    }
}

async function main() {
    try {
        log('========== 从 Linux.do 获取订阅 ==========\n');

        // 1. 加载付费节点
        const nodes = loadPremiumNodes();
        log(`使用代理节点: ${nodes.map(n => n.name).join(', ')}\n`);

        // 2. 加载 Cookie
        const cookie = loadCookie();

        // 3. 启动 Clash
        createClashConfig(nodes);
        await startClash();
        log('✓ Clash 代理已启动\n');

        await new Promise(resolve => setTimeout(resolve, 3000));

        // 4. 获取 Linux.do 主题列表
        log('获取 Linux.do 订阅节点标签...');
        const tagUrl = 'https://linux.do/tag/%E8%AE%A2%E9%98%85%E8%8A%82%E7%82%B9.json';
        const tagData = await curlWithProxy(tagUrl, cookie);
        const tagJson = JSON.parse(tagData);
        const topics = tagJson.topic_list?.topics || [];
        log(`✓ 获取到 ${topics.length} 个主题\n`);

        // 5. 检查主题并收集订阅链接
        log('检查主题内容...\n');
        const allSubscriptions = [];

        for (let i = 0; i < Math.min(topics.length, 10); i++) {
            const topic = topics[i];
            log(`[${i + 1}/10] ${topic.title}`);

            try {
                const topicUrl = `https://linux.do/t/topic/${topic.id}.json`;
                const topicData = await curlWithProxy(topicUrl, cookie, 20);
                const topicJson = JSON.parse(topicData);
                const posts = topicJson.post_stream?.posts || [];

                let topicSubs = [];
                for (const post of posts.slice(0, 3)) {
                    const content = post.cooked || '';
                    const subs = extractSubscriptions(content);
                    topicSubs.push(...subs);
                }

                topicSubs = [...new Set(topicSubs)];

                if (topicSubs.length > 0) {
                    log(`  ✓ 找到 ${topicSubs.length} 个订阅链接`);
                    allSubscriptions.push(...topicSubs);
                } else {
                    log(`  - 无订阅链接`);
                }

                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                log(`  ✗ 失败: ${error.message}`);
            }
        }

        const uniqueSubs = [...new Set(allSubscriptions)];
        log(`\n总共找到 ${uniqueSubs.length} 个唯一订阅链接\n`);

        // 6. 下载并验证订阅
        if (uniqueSubs.length === 0) {
            log('未找到任何订阅链接');
            return;
        }

        log('========== 下载订阅 ==========\n');
        const results = [];

        for (let i = 0; i < uniqueSubs.length; i++) {
            log(`[${i + 1}/${uniqueSubs.length}]`);
            const result = await downloadSubscription(uniqueSubs[i], cookie);
            results.push(result);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // 7. 保存结果
        const successResults = results.filter(r => r.success);
        const totalNodes = successResults.reduce((sum, r) => sum + r.nodeCount, 0);

        const output = {
            updated_at: new Date().toISOString(),
            total_subscriptions: uniqueSubs.length,
            successful_subscriptions: successResults.length,
            total_nodes: totalNodes,
            subscriptions: results
        };

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

        // 8. 显示结果
        log('\n========== 结果汇总 ==========\n');
        log(`订阅总数: ${uniqueSubs.length}`);
        log(`成功下载: ${successResults.length}`);
        log(`节点总数: ${totalNodes}`);
        log(`\n结果已保存到: ${OUTPUT_FILE}`);

        if (successResults.length > 0) {
            log('\n成功的订阅:');
            successResults.forEach((r, i) => {
                log(`${i + 1}. [${r.format}] ${r.nodeCount} 个节点 - ${r.url}`);
            });
        }

        log('\n========== 完成 ==========');

    } catch (error) {
        log(`错误: ${error.message}`);
        console.error(error);
    } finally {
        stopClash();
        process.exit(0);
    }
}

process.on('SIGINT', () => {
    stopClash();
    process.exit(0);
});

if (require.main === module) {
    main();
}

module.exports = { main };
