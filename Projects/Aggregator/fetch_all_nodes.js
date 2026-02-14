#!/usr/bin/env node
/**
 * 统一节点获取管理器 (System Preferred Node Logic)
 * 
 * 核心逻辑：
 * 1. 启动代理：优先使用 "System Preferred Nodes" (seed_proxies.json)，没有则使用付费订阅。
 * 2. 验证环境：访问 Linux.do 验证 Cookie 有效性 (看门人检查)。
 * 3. 全网抓取：
 *    - Linux.do (Tag: 订阅节点)
 *    - GitHub Sources
 * 4. 结果处理：
 *    - 解析节点链接为对象
 *    - 去重合并
 *    - 保存到 proxies.json 供 Validator Service 进行筛选 (筛选出的优质节点会自动回填到 seed_proxies.json)
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const https = require('https');
const http = require('http');

const ROOT = __dirname;
const CLASH_DIR = path.join(ROOT, 'clash_bin');
const CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
const CLASH_DATA_DIR = path.join(ROOT, 'clash_data');
const FETCH_CONFIG = path.join(CLASH_DATA_DIR, 'fetch_proxy_config.yaml');
const COOKIE_FILE = path.join(ROOT, 'linuxdo_cookie.txt');
const SEED_FILE = path.join(ROOT, 'seed_proxies.json');
const PROXIES_FILE = path.join(ROOT, 'proxies.json');

// 代理端口配置
const PROXY_HTTP_PORT = 7950;
const PROXY_SOCKS_PORT = 7951;

// 订阅源配置
const SOURCES = {
    premium: {
        url: 'https://16412.nginx24ppy.xyz/link/hXvsVfrh8PP0ViD3?clash=1',
        name: '付费订阅(救急用)',
    }
};

const GITHUB_SOURCES = [
    'https://raw.githubusercontent.com/wzdnzd/aggregator/master/sub/share/clash',
    'https://raw.githubusercontent.com/wzdnzd/aggregator/master/sub/share/v2ray',
    'https://raw.githubusercontent.com/ermaozi/get_subscribe/main/subscribe/v2ray.txt',
    'https://raw.githubusercontent.com/mianfeifq/share/main/data',
    'https://raw.githubusercontent.com/peasoft/NoMoreWalls/master/list.txt',
    'https://raw.githubusercontent.com/mfuu/v2ray/master/v2ray',
    'https://raw.githubusercontent.com/ts-sf/fly/main/v2',
    'https://raw.githubusercontent.com/open-proxies/clash/main/clash.yaml',
];

let clashProcess = null;

// --- 工具函数 ---

function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString().substring(11, 19);
    console.log(`[${timestamp}] [${level}] ${message}`);
}

function loadCookie() {
    if (!fs.existsSync(COOKIE_FILE)) {
        log('Cookie文件不存在', 'WARN');
        return '';
    }
    return fs.readFileSync(COOKIE_FILE, 'utf8').trim();
}

function decodeBase64(str) {
    try {
        return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
    } catch (e) { return ''; }
}

// --- 代理管理模块 ---

// 获取系统优选节点 (作为跳板)
async function getSystemPreferredNodes() {
    log('正在寻找系统优选节点 (System Preferred Nodes)...');

    // 1. 尝试从本地优选池加载 (seed_proxies.json)
    if (fs.existsSync(SEED_FILE)) {
        try {
            const seeds = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
            if (Array.isArray(seeds) && seeds.length > 0) {
                // 简单的过滤，确保是有效节点
                const validSeeds = seeds.filter(n => n.server && n.port);
                if (validSeeds.length > 0) {
                    log(`✅ 找到 ${validSeeds.length} 个本地优选节点，将使用它们作为代理`);
                    return validSeeds.slice(0, 10); // 取前10个
                }
            }
        } catch (e) {
            log(`本地优选节点加载失败: ${e.message}`, 'WARN');
        }
    }

    // 2. 如果本地没有，使用付费订阅作为种子
    log('⚠️ 本地无优选节点，尝试获取付费订阅作为救急...');
    try {
        const premiumNodes = await downloadPremiumNodes();
        if (premiumNodes.length > 0) {
            log(`✅ 获取到 ${premiumNodes.length} 个付费节点`);
            return premiumNodes;
        }
    } catch (e) {
        log(`付费节点获取失败: ${e.message}`, 'ERROR');
    }

    throw new Error('无法获取任何可用代理节点，无法穿墙');
}

// 下载付费订阅 (Fallback)
function downloadPremiumNodes() {
    return new Promise((resolve, reject) => {
        https.get(SOURCES.premium.url, {
            headers: { 'User-Agent': 'clash-verge/1.3.8' }
        }, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const config = yaml.load(data);
                    if (config && config.proxies) {
                        // 筛选专线
                        const best = config.proxies.filter(n => n.name && n.name.includes('专线'));
                        resolve(best.length > 0 ? best.slice(0, 5) : config.proxies.slice(0, 5));
                    } else {
                        reject(new Error('无效配置'));
                    }
                } catch (e) { reject(e); }
            });
        }).on('error', reject);
    });
}

function createClashConfig(nodes) {
    const config = {
        port: PROXY_HTTP_PORT,
        'socks-port': PROXY_SOCKS_PORT,
        'allow-lan': false,
        mode: 'rule',
        'log-level': 'info',
        proxies: nodes,
        'proxy-groups': [{
            name: 'PROXY',
            type: 'url-test', // 使用 url-test 自动选择最快节点
            url: 'http://www.gstatic.com/generate_204',
            interval: 300,
            tolerance: 50,
            proxies: nodes.map(p => p.name)
        }],
        rules: ['MATCH,PROXY']
    };

    if (!fs.existsSync(CLASH_DATA_DIR)) fs.mkdirSync(CLASH_DATA_DIR, { recursive: true });
    fs.writeFileSync(FETCH_CONFIG, yaml.dump(config));
    log(`代理配置已生成: ${FETCH_CONFIG}`);
}

function startClashProxy() {
    return new Promise((resolve, reject) => {
        log('启动 Clash ...');
        // 确保清理旧进程
        try { stopClashProxy(); } catch (e) { }

        clashProcess = spawn(CLASH_BIN, ['-d', CLASH_DATA_DIR, '-f', FETCH_CONFIG], {
            stdio: 'pipe',
            env: {
                ...process.env,
                // 防止环境变量干扰
                HTTP_PROXY: '', HTTPS_PROXY: '', ALL_PROXY: ''
            }
        });

        // 捕获输出用于调试 (可选)
        // clashProcess.stdout.on('data', d => process.stdout.write(d));

        // Wait a bit
        setTimeout(() => {
            log(`Clash 代理已就绪 (Port: ${PROXY_HTTP_PORT})`);
            resolve();
        }, 5000); // Give it 5 seconds
    });
}

function stopClashProxy() {
    if (clashProcess) {
        log('停止 Clash 代理...');
        clashProcess.kill();
        clashProcess = null;
    }
}

// 通过代理请求
function fetchWithProxy(url, options = {}) {
    return new Promise((resolve, reject) => {
        const curlArgs = [
            '-s', '-L',
            '--max-time', '30',
            '-k',
            '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0',
            '-x', `http://127.0.0.1:${PROXY_HTTP_PORT}`
        ];

        if (options.cookie) curlArgs.push('-H', `Cookie: ${options.cookie}`);
        if (options.headers) {
            for (const [k, v] of Object.entries(options.headers)) {
                curlArgs.push('-H', `${k}: ${v}`);
            }
        }

        curlArgs.push(url);

        const child = spawn('curl', curlArgs);
        let data = '';
        let err = '';
        child.stdout.on('data', d => data += d);
        child.stderr.on('data', d => err += d);

        child.on('close', code => {
            if (code === 0) resolve(data);
            else reject(new Error(`Curl Failed (${code}): ${err}`));
        });
    });
}

// 检测状态码
function checkUrlStatus(url, cookie) {
    return new Promise((resolve) => {
        const curlArgs = [
            '-s', '-o', '/dev/null', '-w', '%{http_code}',
            '-L', '-k',
            '-x', `http://127.0.0.1:${PROXY_HTTP_PORT}`,
            '-H', `Cookie: ${cookie || ''}`,
            '--connect-timeout', '10',
            url
        ];
        const child = spawn('curl', curlArgs);
        let code = '';
        child.stdout.on('data', d => code += d);
        child.on('close', () => resolve(parseInt(code.trim()) || 0));
        child.on('error', () => resolve(0));
    });
}

// --- 简单解析器 ---
function parseProxyLink(link) {
    try {
        if (!link.includes('://')) return null;

        if (link.startsWith('vmess://')) {
            const b64 = link.substring(8);
            const json = JSON.parse(decodeBase64(b64));
            return {
                name: json.ps || 'VMess',
                type: 'vmess',
                server: json.add,
                port: parseInt(json.port) || 443,
                uuid: json.id,
                alterId: parseInt(json.aid) || 0,
                cipher: 'auto',
                network: json.net || 'tcp',
                tls: json.tls === 'tls',
                'skip-cert-verify': true,
                servername: json.sni || json.host,
                'ws-opts': json.net === 'ws' ? { path: json.path || '/', headers: json.host ? { Host: json.host } : undefined } : undefined
            };
        }

        // 简单处理 SS
        if (link.startsWith('ss://')) {
            const url = new URL(link);
            let method = 'aes-256-gcm', password = '';
            if (url.username) {
                const decoded = decodeBase64(url.username);
                if (decoded.includes(':')) {
                    [method, password] = decoded.split(':', 2);
                } else {
                    password = url.username; // Legacy format
                }
            }
            return {
                name: decodeURIComponent(url.hash.substring(1)) || 'SS',
                type: 'ss',
                server: url.hostname,
                port: parseInt(url.port) || 443,
                cipher: method,
                password: password
            };
        }

        // VLESS / Trojan
        if (link.startsWith('vless://') || link.startsWith('trojan://')) {
            const url = new URL(link);
            const type = link.startsWith('vless') ? 'vless' : 'trojan';
            const params = Object.fromEntries(url.searchParams);
            return {
                name: decodeURIComponent(url.hash.substring(1)) || type,
                type: type,
                server: url.hostname,
                port: parseInt(url.port) || 443,
                uuid: type === 'vless' ? url.username : undefined,
                password: type === 'trojan' ? url.username : undefined,
                network: params.type || 'tcp',
                tls: params.security === 'tls',
                flow: params.flow,
                servername: params.sni,
                'skip-cert-verify': true,
                'ws-opts': params.type === 'ws' ? { path: params.path } : undefined
            };
        }

        return null;
    } catch (e) {
        return null;
    }
}

// --- 内容抓取模块 ---

async function fetchLinuxDo() {
    log('👉 开始 Linux.do 抓取流程...');
    const cookie = loadCookie();
    if (!cookie) throw new Error('没有 Cookie，无法进行 Linux.do 抓取');

    // 1. 验证看门人
    log('🔐 正在贿赂看门人 (验证 Cookie)...');
    const validatorUrl = 'https://linux.do/t/topic/1604546';

    // Check status
    const status = await checkUrlStatus(validatorUrl, cookie);
    if (status === 404 || status === 403 || status === 0) {
        throw new Error(`看门人拒绝服务: 访问验证页面返回 ${status}，请重新获取 Cookie (提供口交服务)`);
    }

    log('🔓 看门人很满意，准许进入！(验证通过)');

    // 2. 获取 Tag
    const tagUrl = 'https://linux.do/tag/%E8%AE%A2%E9%98%85%E8%8A%82%E7%82%B9.json';
    log(`📡 扫描订阅节点 Tag: ${tagUrl}`);

    let allProxies = [];

    try {
        const tagJson = await fetchWithProxy(tagUrl, { cookie });
        let topics = [];
        try {
            const tagData = JSON.parse(tagJson);
            topics = tagData.topic_list?.topics || [];
        } catch (e) {
            throw new Error('Linux.do Tag 响应解析失败 (可能需要验证码/被拦截): ' + tagJson.substring(0, 100));
        }

        log(`📃 发现 ${topics.length} 个相关话题，准备深入挖掘...`);

        const recentTopics = topics.slice(0, 15); // Top 15 current topics

        for (const topic of recentTopics) {
            try {
                const topicUrl = `https://linux.do/t/topic/${topic.id}.json`;
                const topicBody = await fetchWithProxy(topicUrl, { cookie });
                const topicData = JSON.parse(topicBody);

                const posts = topicData.post_stream?.posts || [];
                posts.slice(0, 5).forEach(post => {
                    const content = post.cooked || '';

                    // Extract Links
                    const links = content.match(/[a-z]+:\/\/[a-zA-Z0-9%\-_@.:?&=+/]+/g) || [];
                    links.forEach(l => {
                        const p = parseProxyLink(l);
                        if (p) {
                            p.name = `LDO-${p.type}-${p.server.substring(0, 10)}`;
                            p.source = 'linux.do';
                            allProxies.push(p);
                        }
                    });
                });
            } catch (e) { }
        }

        log(`✅ Linux.do 挖掘完成，获得 ${allProxies.length} 个潜在节点`);
    } catch (e) {
        log(`Linux.do 流程异常: ${e.message}`, 'ERROR');
        throw e;
    }

    return allProxies;
}

async function fetchGithubNodes() {
    log('👉 开始 GitHub/Free 源抓取...');
    let allProxies = [];

    for (const url of GITHUB_SOURCES) {
        try {
            const data = await fetchWithProxy(url);
            // Decode if base64
            let decoded = data;
            if (!data.includes('://') && /^[A-Za-z0-9+/=]+$/.test(data.trim())) {
                decoded = decodeBase64(data.trim());
            }

            const links = decoded.match(/[a-z]+:\/\/[a-zA-Z0-9%\-_@.:?&=+/]+/g) || [];
            links.forEach(l => {
                const p = parseProxyLink(l);
                if (p) {
                    p.name = `Github-${p.type}-${Math.random().toString(36).substr(2, 4)}`;
                    allProxies.push(p);
                }
            });

            // Try YAML parse
            try {
                const doc = yaml.load(data);
                if (doc && doc.proxies) {
                    allProxies.push(...doc.proxies.map(p => ({ ...p, name: `Github-YAML-${p.name}` })));
                }
            } catch (e) { }

        } catch (e) {
            // ignore
        }
    }
    log(`✅ GitHub 抓取完成，获得 ${allProxies.length} 个潜在节点`);
    return allProxies;
}

async function main() {
    log('========================================');
    log('🦄 节点聚合服务 (Advanced)');
    log('========================================');

    try {
        // [步骤 1] 启动代理
        log('[步骤1] 准备姿势 (启动代理环境)');
        const sysNodes = await getSystemPreferredNodes();
        createClashConfig(sysNodes);
        await startClashProxy();

        // [步骤 2] 抓取
        log('\n[步骤2] 开始搜集道具 (抓取节点)');
        const collectedNodes = [];

        // Linux.do
        try {
            const lNodes = await fetchLinuxDo();
            collectedNodes.push(...lNodes);
        } catch (e) { log(`❌ Linux.do 失败: ${e.message}`, 'ERROR'); }

        // GitHub
        try {
            const gNodes = await fetchGithubNodes();
            collectedNodes.push(...gNodes);
        } catch (e) { log(`❌ GitHub 失败: ${e.message}`, 'ERROR'); }

        // [步骤 3] 停止代理
        log('\n[步骤3] 结束运动 (停止代理)');
        stopClashProxy();

        // [步骤 4] 保存与筛选
        if (collectedNodes.length > 0) {
            log(`\n[步骤4] 整理战利品: 共 ${collectedNodes.length} 个节点`);

            // 读取现有
            let finalNodes = collectedNodes;
            if (fs.existsSync(PROXIES_FILE)) {
                try {
                    const existing = JSON.parse(fs.readFileSync(PROXIES_FILE, 'utf8'));
                    // 去重 (Key: server:port)
                    const existingKeys = new Set(existing.map(n => `${n.server}:${n.port}`));
                    const uniqueNew = collectedNodes.filter(n => !existingKeys.has(`${n.server}:${n.port}`));
                    finalNodes = [...existing, ...uniqueNew];
                    log(`  (去重后新增 ${uniqueNew.length} 个节点)`);
                } catch (e) { }
            }

            fs.writeFileSync(PROXIES_FILE, JSON.stringify(finalNodes, null, 2));
            log(`💾 数据已保存至 ${PROXIES_FILE}`);
            log('👉 Validator Service 将在后台对这些节点进行"床上实战筛选"');

            // 尝试触发 Validator
            try {
                const req = http.request({
                    host: '127.0.0.1', port: 3002, path: '/validate', method: 'POST'
                });
                req.on('error', () => log('⚠️ 无法触发 Validator (但在后台会自动运行)'));
                req.end();
                log('🚀 已请求 Validator 立即开始工作');
            } catch (e) { }

        } else {
            log('⚠️ 本次没有抓取到任何新节点', 'WARN');
        }

    } catch (error) {
        log(`\n❌ 任务失败: ${error.message}`, 'ERROR');
        stopClashProxy();
        process.exit(1);
    }
}

// 信号处理
process.on('SIGINT', () => { stopClashProxy(); process.exit(); });
process.on('SIGTERM', () => { stopClashProxy(); process.exit(); });

main();
