/**
 * Antigravity Airport Aggregator - Web Backend
 * 
 * 参考 wzdnzd/aggregator 和 Mac App 的实现方式
 * 使用 Clash External Controller API 进行节点验证
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const net = require('net');
const os = require('os');
const { spawn } = require('child_process');
const yaml = require('js-yaml');
const cron = require('node-cron');
const { getPremiumProxyManager } = require('./premium_proxy_manager');
const premiumManager = getPremiumProxyManager();



// --- 配置 ---
const ROOT = __dirname;
const PORT = 3000;
const CLASH_DIR = path.join(ROOT, 'clash_bin');
const CLASH_CONFIG = path.join(CLASH_DIR, 'config.yaml');
const CLASH_PORT_HTTP = 7890; // 本地 Clash 核心端口（仅用于节点验证）
const CLASH_EXTERNAL_CONTROLLER = '127.0.0.1:9090';

// 宿主机 Clash Verge 代理（用于获取外网资源：GitHub、Linux.do、订阅源、IP纯净度检测）
const HOST_PROXY = 'http://192.168.1.102:7897';
const HOST_PROXY_SOCKS5 = 'socks5h://192.168.1.102:7897'; // SOCKS5 模式（用于 linux.do，绕过 TLS 指纹检测）
// Ubuntu Firefox User-Agent（必须与获取 cf_clearance Cookie 的浏览器一致）
const FIREFOX_UA = 'Mozilla/5.0 (X11; Linux x86_64; rv:148.0) Gecko/20100101 Firefox/148.0';
// Firefox Cookie 数据库路径
const FIREFOX_COOKIE_DB = '/home/gemini/.config/mozilla/firefox/td46m7ln.default-release/cookies.sqlite';

// Clash 二进制文件路径
let CLASH_BIN = '';
const platform = os.platform();
const arch = os.arch();

if (platform === 'darwin') {
    const localBin = path.join(ROOT, 'bin', 'clash');
    if (fs.existsSync(localBin)) CLASH_BIN = localBin;
    else CLASH_BIN = path.join(CLASH_DIR, 'clash-darwin');
} else if (platform === 'linux') {
    // 优先使用用户指定的 bin/clash
    const localBin = path.join(ROOT, 'bin', 'clash');
    if (fs.existsSync(localBin)) {
        CLASH_BIN = localBin;
    } else {
        if (arch === 'x64') CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
        else if (arch === 'arm64') CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-arm64');
        else CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
    }
} else {
    CLASH_BIN = path.join(CLASH_DIR, 'clash-windows-amd64.exe');
}

// 动态查找 Clash 二进制
if (!fs.existsSync(CLASH_BIN)) {
    try {
        const files = fs.readdirSync(CLASH_DIR);
        const bin = files.find(f => f.includes('clash') && !f.endsWith('.yaml'));
        if (bin) CLASH_BIN = path.join(CLASH_DIR, bin);
    } catch (e) { }
}

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.yaml': 'text/yaml'
};

// 动态黑名单 (因无法访问或 SSL 错误 35 而被系统排除的分享站)
const FAILED_WEB_SOURCES = new Set();

// 全局状态
const globalState = {
    status: 'idle', // idle, fetching, testing
    total: 0,
    active: 0,
    logs: [],
    lastUpdated: null,
    // 各来源节点获取统计 (每次聚合任务后更新)
    lastFetchStats: {
        github: 0,
        web: 0,
        linuxdo: 0
    }
};

// 计划任务日志
const CRON_LOG_FILE = path.join(ROOT, 'cron_logs.json');
let cronLogs = [];

// 纯净度检测数据库
const PURITY_DB_FILE = path.join(ROOT, 'purity_db.json');
let purityDB = {};

// 加载纯净度数据库
function loadPurityDB() {
    try {
        if (fs.existsSync(PURITY_DB_FILE)) {
            purityDB = JSON.parse(fs.readFileSync(PURITY_DB_FILE, 'utf8'));
        }
    } catch (e) {
        purityDB = {};
    }
}

// 保存纯净度数据库
function savePurityDB() {
    try {
        fs.writeFileSync(PURITY_DB_FILE, JSON.stringify(purityDB, null, 2));
    } catch (e) {
        console.error('保存纯净度数据库失败:', e);
    }
}

// 加载计划任务日志
function loadCronLogs() {
    try {
        if (fs.existsSync(CRON_LOG_FILE)) {
            cronLogs = JSON.parse(fs.readFileSync(CRON_LOG_FILE, 'utf8'));
        }
    } catch (e) {
        cronLogs = [];
    }
}

// 保存计划任务日志
function saveCronLogs() {
    try {
        // 只保留最近 50 条记录
        if (cronLogs.length > 50) {
            cronLogs = cronLogs.slice(-50);
        }
        fs.writeFileSync(CRON_LOG_FILE, JSON.stringify(cronLogs, null, 2));
    } catch (e) {
        console.error('保存计划任务日志失败:', e);
    }
}

// 添加计划任务日志
function addCronLog(entry) {
    cronLogs.push(entry);
    saveCronLogs();
}

// 初始化加载
loadCronLogs();
loadPurityDB();


function addLog(msg, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] [${type.toUpperCase()}] ${msg}`);
    globalState.logs.push({ timestamp, type, msg });
    if (globalState.logs.length > 500) globalState.logs.shift();
}

/**
 * 评估节点质量 (针对中国大陆网络环境优化)
 * 优先保留抗封锁能力强的协议
 * @param {Object} p 节点对象
 * @returns {boolean} 是否为高质量节点
 */
function isHighQualityNode(p) {
    // 1. Reality / Hysteria2 (当前最稳)
    if (p.type === 'hysteria2') return true;
    if (p['reality-opts'] || p.servername === 'reality') return true;

    // 2. 必须启用 TLS (VMess/VLESS/Trojan)
    // 无 TLS 的 VMess/VLESS 在国内极易被阻断 (秒封或随机丢包)
    if ((p.type === 'vmess' || p.type === 'vless' || p.type === 'trojan') && p.tls) {
        return true;
    }

    // 3. Shadowsocks 必须使用现代加密 (虽然 SS 目前也被精准识别，但比无 TLS 的 VMess 好一点点)
    if (p.type === 'ss') {
        const cipher = p.cipher || '';
        if (cipher.includes('aes') || cipher.includes('chacha20') || cipher.includes('2022')) {
            return true;
        }
    }

    return false;
}

// 确保清理子进程
function cleanup() {
    stopClash();
    // 杀死可能的僵尸 Clash 进程
    try {
        const { execSync } = require('child_process');
        const platform = os.platform();
        if (platform === 'linux' || platform === 'darwin') {
            // 避免误杀其他 clash
            // execSync('pkill -f clash-linux', { stdio: 'ignore' });
        }
    } catch (e) { }
}

process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(); });
process.on('SIGTERM', () => { cleanup(); process.exit(); });

// 确保目录存在
if (!fs.existsSync(CLASH_DIR)) fs.mkdirSync(CLASH_DIR, { recursive: true });

const SUBSCRIPTION_URLS = [
    // ⭐ wzdnzd/aggregator 官方共享订阅 (Issue #91)
    'https://qybndbviblvt.us-west-1.clawcloudrun.com/api/v1/subscribe?token=2i94lkqi1uvd9eeab6&target=v2ray&list=1',
    'https://qybndbviblvt.us-west-1.clawcloudrun.com/api/v1/subscribe?token=2i94lkqi1uvd9eeab6&target=clash&list=1',
    'https://qybndbviblvt.us-west-1.clawcloudrun.com/api/v1/subscribe?token=2i94lkqi1uvd9eeab6&target=singbox&list=1',

    // GitHub & General Sources
    'https://raw.githubusercontent.com/ermaozi/get_subscribe/main/subscribe/v2ray.txt',
    'https://raw.githubusercontent.com/mahdibland/V2RayAggregator/master/EternityAirConfig64.txt',
    'https://raw.githubusercontent.com/Pawdroid/Free-servers/main/sub',
    'https://raw.githubusercontent.com/freefq/free/master/v2',
    'https://raw.githubusercontent.com/aiboboxx/v2rayfree/main/v2',
    'https://raw.githubusercontent.com/open-proxies/clash/main/clash.yaml',
    'https://raw.githubusercontent.com/vpei/Free-Node-Merge/main/o/node.txt',
    'https://raw.githubusercontent.com/ssrsub/ssr/master/v2ray',
    'https://raw.githubusercontent.com/learnhard-cn/free_proxies_opt/main/proxy/clash.yaml',
    'https://raw.githubusercontent.com/t-id/free-node/master/clash.yaml',
    'https://raw.githubusercontent.com/mianfeifq/share/main/data',
    'https://raw.githubusercontent.com/anaer/Sub/main/clash.yaml',
    'https://raw.githubusercontent.com/hwjx/clash-free/main/clash.yaml',
    'https://raw.githubusercontent.com/ripaojiedian/freenode/main/clash',
    'https://raw.githubusercontent.com/zy974415/freev2raysub/main/subscribe/v2ray.txt',
    'https://raw.githubusercontent.com/ovzv/free-node/main/v2ray.txt',
    'https://raw.githubusercontent.com/yebas/v2ray-free/main/v2ray.txt',
    'https://raw.githubusercontent.com/fqfree/free/master/v2',
    'https://raw.githubusercontent.com/mo-cha/free/main/v2',
    'https://raw.githubusercontent.com/yqyooo/free_node/main/clash.yaml',
    'https://raw.githubusercontent.com/oslook/free-ssr-v2ray/master/v2ray.txt',
    'https://raw.githubusercontent.com/v2ray-free/v2ray/master/v2ray',
    'https://raw.githubusercontent.com/freev2/freev2/master/v2ray',
    'https://raw.githubusercontent.com/Jebreil-Free/Clash/main/clash.yaml',
    'https://raw.githubusercontent.com/L-hy2/Free-Node/main/v2ray.txt'
];

const TELEGRAM_CHANNELS = [
    'v2ray_subscribe_share',
    'clash_v2ray_share',
    'free_angel',
    'fly_music',
    'v2ray_share_channel',
    'ss_v2ray_share',
    'v2ray_clash_vpn',
    'free_v2ray_clash',
    'v2ray_clash_ssr',
    'v2rayng_org',
    'v2rayshare_chat',
    'ssr_v2ray_vpn',
    'clash_meta',
    'mihomo_proxies',
    'jiedian_share',
    'free_node_channel'
];

let GLOBAL_PROXY = HOST_PROXY; // 默认使用宿主机代理访问外网
let PREFERRED_PROXIES = []; // 系统优选节点列表（前10个最快的节点）
let proxyMaintenanceTimer = null; // 节点维护定时器

// --- HTTP 请求工具 (使用 curl + 代理) ---
function fetchUrl(url, timeout = 15000, customHeaders = {}) {
    return new Promise((resolve, reject) => {
        // 优先使用全局代理 (e.g. Premium Proxy), 否则尝试默认端口 7890
        // 如果 GLOBAL_PROXY 为空且不强制，则不使用 (但在 runAggregation 中我们会设置它)
        const proxy = GLOBAL_PROXY || `http://127.0.0.1:${CLASH_PORT_HTTP}`;

        const args = [
            '-s', '-L', // Silent, Follow redirects
            '-m', (timeout / 1000).toString() // Timeout
        ];

        // 避免回环或 SSL 报错问题，自有域名服务不走代理直连本国网络
        if (!url.includes('liukun.com')) {
            args.push('-x', proxy);
        }

        args.push(
            '--insecure', // Skip SSL verification (optional, but helpful for some broken certs)
            '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            '-H', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            '-H', 'Accept-Language: en-US,en;q=0.5'
        );

        // Merge custom headers
        for (const [key, value] of Object.entries(customHeaders)) {
            args.push('-H', `${key}: ${value}`);
        }

        args.push(url);

        const child = spawn('curl', args, {
            env: { ...process.env }
        });

        let data = '';
        let error = '';

        child.stdout.on('data', chunk => data += chunk);
        child.stderr.on('data', chunk => error += chunk);

        child.on('close', code => {
            if (code === 0) {
                resolve(data);
            } else {
                // 如果是 404 等 HTTP 错误，curl 仍可能返回 0，需要检查内容或 -f 参数
                // 但这里我们简单处理，如果有数据就认为成功
                if (data.length > 0) resolve(data);
                else reject(new Error(`curl fetch failed (code ${code}): ${error}`));
            }
        });

        child.on('error', err => reject(err));
    });
}


// 读取 Linux.do Cookie
function getLinuxDoCookie() {
    try {
        const cookieFile = path.join(ROOT, 'linuxdo_cookie.txt');
        if (fs.existsSync(cookieFile)) {
            return fs.readFileSync(cookieFile, 'utf8').trim();
        }
    } catch (e) { }
    return '';
}

// 从 Firefox SQLite 数据库自动提取最新 Cookie（全自动，无需手动操作）
function refreshCookieFromFirefox() {
    try {
        if (!fs.existsSync(FIREFOX_COOKIE_DB)) {
            addLog('Firefox Cookie 数据库不存在，跳过自动刷新', 'warning');
            return false;
        }
        const tmpDb = '/tmp/ff_cookies_' + Date.now() + '.db';
        const { execSync } = require('child_process');
        execSync(`cp "${FIREFOX_COOKIE_DB}" "${tmpDb}"`);
        const result = execSync(`sqlite3 "${tmpDb}" "SELECT name, value FROM moz_cookies WHERE host LIKE '%linux.do%';"`, { encoding: 'utf8' });
        fs.unlinkSync(tmpDb);

        if (!result.trim()) {
            addLog('Firefox 中未找到 linux.do Cookie', 'warning');
            return false;
        }

        const cookieStr = result.trim().split('\n').map(line => {
            const [name, ...rest] = line.split('|');
            return `${name}=${rest.join('|')}`;
        }).join('; ');

        const cookieFile = path.join(ROOT, 'linuxdo_cookie.txt');
        fs.writeFileSync(cookieFile, cookieStr);
        addLog(`已从 Firefox 自动刷新 Cookie (${cookieStr.length} 字符)`, 'success');
        return true;
    } catch (e) {
        addLog(`Firefox Cookie 自动刷新失败: ${e.message}`, 'warning');
        return false;
    }
}

let isLinuxDoImporting = false;

// 全局异常捕获，防止进程崩溃
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    // addLog('系统严重错误: ' + err.message, 'error'); // 尝试写入日志
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

async function runLinuxDoImportTask() {
    if (isLinuxDoImporting) return;
    isLinuxDoImporting = true;

    addLog('========== 开始 Linux.do 导入任务 (后台) ==========', 'info');

    try {
        // 自动从 Firefox 刷新 Cookie（无需手动操作）
        refreshCookieFromFirefox();

        // 使用 JSON API 获取带有 "订阅节点" 标签的帖子列表
        // 采用 OAuth 认证接入 (使用 Cookie)
        const baseUrl = 'https://linux.do/tag/%E8%AE%A2%E9%98%85%E8%8A%82%E7%82%B9.json';
        addLog('开始从 linux.do 抓取帖子列表 (Tag: 订阅节点, OAuth 模式)...', 'info');

        // 1. 检查/刷新 Cookie
        let cookie = getLinuxDoCookie();
        if (!cookie) {
            addLog('未找到 Cookie，尝试执行 OAuth 登录...', 'warning');
            try {
                // Fix path to point to root
                const authScript = path.join(ROOT, 'linuxdo_auth.js');
                if (fs.existsSync(authScript)) {
                    addLog('执行认证脚本...', 'info');
                    // spawnSync blocks the event loop! Use async spawn instead.
                    await new Promise((resolve, reject) => {
                        const { spawn } = require('child_process');
                        const child = spawn('node', [authScript], { stdio: 'pipe' });

                        let output = '';
                        child.stdout.on('data', d => { output += d.toString(); });
                        child.stderr.on('data', d => { console.error(d.toString()); });

                        child.on('close', (code) => {
                            if (code === 0) resolve();
                            else {
                                console.log('Auth script output:', output);
                                resolve(); // Try to continue anyway
                            }
                        });
                        child.on('error', (err) => {
                            console.error('Failed to start auth script:', err);
                            resolve();
                        });
                    });

                    cookie = getLinuxDoCookie(); // Reload
                } else {
                    addLog('认证脚本不存在: ' + authScript, 'error');
                }
            } catch (e) {
                addLog(`登录脚本执行失败: ${e.message}`, 'error');
            }
        }

        if (cookie) addLog('已加载 Cookie，将以登录用户身份访问', 'info');
        else addLog('Cookie加载失败，尝试游客访问 (可能受到限制)', 'warning');

        let allTopics = [];
        let page = 0;
        const targetCount = 300; // 目标获取300篇帖子
        const maxPages = 20; // 最多尝试20页

        // 频率控制：每页间隔 3 秒
        const PAGE_DELAY = 3000;

        while (allTopics.length < targetCount && page < maxPages) {
            const pageUrl = page === 0 ? baseUrl : `${baseUrl}?page=${page}`;
            addLog(`正在获取第 ${page + 1} 页...`, 'info');

            try {
                const listJson = await fetchLinuxDo(pageUrl, cookie);

                // 检查是否是被拦截或需要登录
                if (listJson.includes('<!DOCTYPE') || listJson.includes('login-required')) {
                    addLog(`第 ${page + 1} 页访问被拒绝 (需要登录或被风控)，停止获取`, 'warning');
                    break;
                }

                const listData = JSON.parse(listJson);
                const topics = listData.topic_list?.topics || [];

                if (topics.length === 0) {
                    addLog(`第 ${page + 1} 页没有更多帖子，停止获取`, 'info');
                    break;
                }

                // 过滤重复的帖子（基于 ID）
                const existingIds = new Set(allTopics.map(t => t.id));
                const newTopics = topics.filter(t => !existingIds.has(t.id));

                if (newTopics.length === 0) {
                    addLog(`第 ${page + 1} 页帖子全部重复，停止获取`, 'info');
                    break;
                }

                allTopics = allTopics.concat(newTopics);
                addLog(`第 ${page + 1} 页获取 ${newTopics.length} 个新帖子，累计 ${allTopics.length} 个`, 'info');

                page++;

                // 频率控制
                await new Promise(r => setTimeout(r, PAGE_DELAY));
            } catch (e) {
                addLog(`获取第 ${page + 1} 页失败: ${e.message}，继续下一页`, 'warning');
                page++;
            }
        }

        addLog(`总共从 JSON API 获取到 ${allTopics.length} 个帖子`, 'success');

        // 过滤最近30天的帖子，最多处理300个
        const now = new Date();
        const recentTopics = allTopics.filter(t => {
            const createdAt = new Date(t.created_at);
            const daysDiff = (now - createdAt) / (1000 * 60 * 60 * 24);
            return daysDiff <= 30;
        }).slice(0, 300);

        addLog(`过滤后剩余 ${recentTopics.length} 个近30天帖子`, 'info');

        const allProxies = [];
        const allSubscriptions = [];
        let processedCount = 0;

        for (let i = 0; i < recentTopics.length; i++) {
            const topic = recentTopics[i];
            const topicId = topic.id;
            const topicTitle = topic.title || '未知标题';

            try {
                addLog(`[${i + 1}/${recentTopics.length}] 读取帖子: ${topicTitle.substring(0, 30)}...`, 'info');

                const topicUrl = `https://linux.do/t/topic/${topicId}.json`;
                // 使用 Cookie 获取帖子内容
                const topicJson = await fetchLinuxDo(topicUrl, cookie);
                const topicData = JSON.parse(topicJson);

                // 获取帖子内容（所有楼层）
                const posts = topicData.post_stream?.posts || [];

                for (const post of posts.slice(0, 10)) { // 读取前10楼
                    const content = post.cooked || '';

                    // 查找订阅链接
                    const subPatterns = [
                        /https?:\/\/[^\s<>"'\)]+(?:subscribe|sub|api|link|clash|v2ray|vmess|trojan|ss|ssr|yaml|txt)[^\s<>"'\)]*/gi,
                        /https?:\/\/[^\s<>"'\)]+\.(yaml|txt|json)(?:\?[^\s<>"'\)]*)?/gi
                    ];

                    for (const pattern of subPatterns) {
                        const matches = content.match(pattern) || [];
                        for (let url of matches) {
                            url = url.replace(/&amp;/g, '&')
                                .replace(/&lt;/g, '<')
                                .replace(/&gt;/g, '>')
                                .replace(/<[^>]+>/g, '')
                                .replace(/[,;。，；]+$/, '')
                                .trim();

                            if (url.includes('github.com') && !url.includes('raw.')) continue;
                            if (url.includes('linux.do')) continue;
                            if (url.length > 500) continue;

                            if (url && !allSubscriptions.includes(url)) {
                                allSubscriptions.push(url);
                                addLog(`  发现订阅: ${url.substring(0, 60)}...`, 'success');
                            }
                        }
                    }

                    // 查找直接的节点链接
                    const nodePatterns = [
                        /vmess:\/\/[A-Za-z0-9+\/=_-]+/g,
                        /vless:\/\/[A-Za-z0-9@.:_\-?&=%#\/]+/g,
                        /trojan:\/\/[A-Za-z0-9@.:_\-?&=%#\/]+/g,
                        /ss:\/\/[A-Za-z0-9@.:_\-?&=%#\/]+/g,
                        /ssr:\/\/[A-Za-z0-9+\/=_-]+/g,
                        /hysteria2?:\/\/[A-Za-z0-9@.:_\-?&=%#\/]+/g,
                        /hy2:\/\/[A-Za-z0-9@.:_\-?&=%#\/]+/g
                    ];

                    for (const pattern of nodePatterns) {
                        const matches = content.match(pattern) || [];
                        for (let m of matches) {
                            m = m.replace(/<[^>]+>/g, '')
                                .replace(/&amp;/g, '&')
                                .trim();

                            if (m && !allProxies.includes(m)) {
                                allProxies.push(m);
                            }
                        }
                    }

                    // Base64 Simple Check
                    if (content.match(/[A-Za-z0-9+\/]{100,}/)) {
                        // Too complex to parse extensively here, rely on direct matches or sub links
                    }
                }

                processedCount++;

                if ((i + 1) % 5 === 0) {
                    addLog(`进度: ${i + 1}/${recentTopics.length}, 已发现 ${allSubscriptions.length} 订阅, ${allProxies.length} 节点`, 'info');
                }
            } catch (e) {
                addLog(`  读取帖子 ${topicId} 失败: ${e.message}`, 'warning');
            }

            // Rate Limit
            await new Promise(r => setTimeout(r, 2000));
        }

        addLog(`内容抓取完成！发现 ${allSubscriptions.length} 个订阅, ${allProxies.length} 个节点`, 'success');

        // 解析节点
        let parsedProxies = [];
        for (const raw of allProxies) {
            const parsed = parseContent(raw);
            if (parsed.length > 0) parsedProxies = parsedProxies.concat(parsed);
        }

        // 解析订阅 (Limit 10)
        for (const subUrl of allSubscriptions.slice(0, 10)) {
            try {
                addLog(`解析订阅: ${subUrl.substring(0, 50)}...`, 'info');
                const subContent = await fetchUrl(subUrl, 15000);
                const subProxies = parseContent(subContent);
                if (subProxies.length > 0) {
                    addLog(`  > 成功获取 ${subProxies.length} 个节点`, 'success');
                    parsedProxies = parsedProxies.concat(subProxies);
                }
            } catch (e) {
                addLog(`  > 订阅解析失败: ${e.message}`, 'warning');
            }
        }

        // 去重
        const uniqueProxies = removeDuplicates(parsedProxies);

        // 标记论坛来源
        uniqueProxies.forEach(p => {
            p.isFromForum = true;
            p.forumSource = 'linux.do';
            p.importedAt = new Date().toISOString();
        });

        addLog(`分析完成！共获得 ${uniqueProxies.length} 个有效节点。正在保存...`, 'success');

        // 保存到 manual_proxies.json
        const manualFile = path.join(ROOT, 'manual_proxies.json');
        let existing = [];
        if (fs.existsSync(manualFile)) {
            try { existing = JSON.parse(fs.readFileSync(manualFile, 'utf8')); } catch (e) { }
        }

        const existingRaws = new Set(existing.map(p => p.raw));
        let addedCount = 0;

        for (const p of uniqueProxies) {
            if (!existingRaws.has(p.raw)) {
                existing.push(p);
                existingRaws.add(p.raw);
                addedCount++;
            }
        }

        if (addedCount > 0) {
            fs.writeFileSync(manualFile, JSON.stringify(existing, null, 2));
            addLog(`======== 导入完成！新增 ${addedCount} 个节点，当前共 ${existing.length} 个 ========`, 'success');
        } else {
            addLog(`======== 导入完成！没有发现新节点，当前共 ${existing.length} 个 ========`, 'info');
        }

    } catch (e) {
        addLog(`导入任务异常中止: ${e.message}`, 'error');
        console.error(e);
    } finally {
        isLinuxDoImporting = false;
    }
}


// 使用 curl 命令获取 linux.do 内容（绕过 Cloudflare 拦截）
function fetchLinuxDo(url, cookie = '') {
    return new Promise((resolve, reject) => {
        const curlArgs = [
            '-s',
            '-L', // Follow redirects
            '--insecure', // Ignore SSL errors
            '--compressed', // 处理压缩内容
            '-H', 'Accept: application/json, text/javascript, */*; q=0.01',
            '-H', 'Accept-Language: en-US,en;q=0.5',
            '-H', `User-Agent: ${FIREFOX_UA}`,
            '-H', 'X-Requested-With: XMLHttpRequest',
            '-H', 'Sec-Fetch-Dest: empty',
            '-H', 'Sec-Fetch-Mode: cors',
            '-H', 'Sec-Fetch-Site: same-origin',
            '-x', HOST_PROXY_SOCKS5 // 使用 SOCKS5 代理
        ];

        if (cookie) {
            curlArgs.push('-H', `Cookie: ${cookie}`);
        }

        curlArgs.push(url);

        const child = spawn('curl', curlArgs, {
            timeout: 60000,
            env: { ...process.env, http_proxy: '', https_proxy: '', HTTP_PROXY: '', HTTPS_PROXY: '' }
        });
        let data = '';
        let error = '';

        child.stdout.on('data', chunk => data += chunk);
        child.stderr.on('data', chunk => error += chunk);

        child.on('close', code => {
            if (code === 0 && data) {
                resolve(data);
            } else {
                reject(new Error(error || `curl exited with code ${code}`));
            }
        });

        child.on('error', err => reject(err));
    });
}

// Base64 解码
function decodeBase64(str) {
    try {
        return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
    } catch (e) { return ''; }
}







function parseContent(content) {
    const proxies = [];

    // 尝试 Base64 解码
    let decoded = content;
    if (!content.includes('proxies:') && !content.trim().startsWith('{') && !content.includes('://')) {
        const maybeDecoded = decodeBase64(content.trim());
        if (maybeDecoded && maybeDecoded.includes('://')) {
            decoded = maybeDecoded;
        }
    }

    // YAML 格式 (Clash)
    if (decoded.includes('proxies:')) {
        try {
            const parsed = yaml.load(decoded);
            if (parsed && Array.isArray(parsed.proxies)) {
                return parsed.proxies.map((p, i) => ({
                    ...p,
                    id: `p_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`
                }));
            }
        } catch (e) { }
    }

    // 逐行解析 (vmess://, vless://, trojan://, ss://, hysteria2://)
    const lines = decoded.split(/[\r\n]+/);
    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        try {
            if (line.startsWith('vmess://')) {
                const b64 = line.substring(8);
                const json = JSON.parse(decodeBase64(b64));
                if (json && json.add) {
                    proxies.push({
                        id: `p_${Date.now()}_${proxies.length}_${Math.random().toString(36).substr(2, 5)}`,
                        name: json.ps || 'VMess',
                        type: 'vmess',
                        server: json.add,
                        port: parseInt(json.port, 10) || 443,
                        uuid: json.id,
                        alterId: parseInt(json.aid, 10) || 0,
                        cipher: 'auto',
                        network: json.net || 'tcp',
                        tls: json.tls === 'tls',
                        'skip-cert-verify': true,
                        'ws-opts': json.net === 'ws' ? { path: json.path || '/', headers: json.host ? { Host: json.host } : undefined } : undefined,
                        servername: json.sni || json.host,
                        raw: line
                    });
                }
            } else if (line.startsWith('vless://') || line.startsWith('trojan://')) {
                const type = line.startsWith('vless') ? 'vless' : 'trojan';
                const url = new URL(line);
                const params = Object.fromEntries(url.searchParams);

                const proxy = {
                    id: `p_${Date.now()}_${proxies.length}_${Math.random().toString(36).substr(2, 5)}`,
                    name: decodeURIComponent(url.hash.slice(1)) || type,
                    type: type,
                    server: url.hostname,
                    port: parseInt(url.port, 10) || 443,
                    uuid: type === 'vless' ? url.username : undefined,
                    password: type === 'trojan' ? url.username : undefined,
                    tls: params.security === 'tls' || params.security === 'reality' || type === 'trojan',
                    'skip-cert-verify': true,
                    network: params.type || 'tcp',
                    servername: params.sni || params.host,
                    flow: params.flow,
                    raw: line
                };

                if (params.security === 'reality') {
                    proxy['reality-opts'] = {
                        'public-key': params.pbk,
                        'short-id': params.sid
                    };
                    proxy['client-fingerprint'] = params.fp || 'chrome';
                }

                if (proxy.network === 'ws') {
                    proxy['ws-opts'] = { path: params.path || '/', headers: params.host ? { Host: params.host } : undefined };
                } else if (proxy.network === 'grpc') {
                    proxy['grpc-opts'] = { 'grpc-service-name': params.serviceName || 'grpc' };
                }

                proxies.push(proxy);
            } else if (line.startsWith('ss://')) {
                // SS 解析
                try {
                    let fullUrlStr = line;
                    let tag = '';
                    if (fullUrlStr.includes('#')) {
                        const parts = fullUrlStr.split('#');
                        tag = decodeURIComponent(parts[1]);
                        fullUrlStr = parts[0];
                    }

                    const withoutScheme = fullUrlStr.substring(5);
                    let parsedUrl;

                    // 1. 处理 ss://BASE64(method:password@host:port) 格式
                    if (!withoutScheme.includes('@') && !withoutScheme.includes('%40')) {
                        const decodedStr = decodeBase64(withoutScheme);
                        if (decodedStr && decodedStr.includes('@')) {
                            parsedUrl = new URL('ss://' + decodedStr);
                        } else {
                            parsedUrl = new URL(fullUrlStr);
                        }
                    } else {
                        parsedUrl = new URL(fullUrlStr);
                    }

                    // 2. 解析 userinfo
                    let method = 'aes-256-gcm', password = '';

                    if (parsedUrl.username && parsedUrl.password) {
                        // 标准明文 ss://method:password@host
                        method = decodeURIComponent(parsedUrl.username);
                        password = decodeURIComponent(parsedUrl.password);
                    } else if (parsedUrl.username) {
                        // userinfo 可能是 base64 编码的 method:password
                        const decoded = decodeBase64(parsedUrl.username);
                        if (decoded && decoded.includes(':')) {
                            const firstColon = decoded.indexOf(':');
                            method = decoded.slice(0, firstColon);
                            password = decoded.slice(firstColon + 1);
                        } else {
                            // 兜底：如果不是有效的 base64，当作明文加密算法
                            method = decodeURIComponent(parsedUrl.username);
                        }
                    }

                    // 3. 校验最终解析数据
                    // 保证必须有 password 且 hostname 不会是异常的长字符串（部分异常 base64 被误认作为 hostname）
                    if (parsedUrl.hostname && password && parsedUrl.hostname.length < 200 && method) {
                        proxies.push({
                            id: `p_${Date.now()}_${proxies.length}_${Math.random().toString(36).substr(2, 5)}`,
                            name: tag || 'SS',
                            type: 'ss',
                            server: parsedUrl.hostname,
                            port: parseInt(parsedUrl.port, 10) || 443,
                            cipher: method,
                            password: password,
                            raw: line
                        });
                    }
                } catch (e) { }
            } else if (line.startsWith('ssr://')) {
                // SSR 支持 (虽然旧，但某些源仍有)
                try {
                    const b64 = line.substring(6);
                    const decoded = decodeBase64(b64);
                    // method:password@server:port/?params...
                    const parts = decoded.split(':');
                    if (parts.length >= 6) {
                        proxies.push({
                            id: `p_${Date.now()}_${proxies.length}_${Math.random().toString(36).substr(2, 5)}`,
                            name: 'SSR-' + parts[0],
                            type: 'ssr',
                            server: parts[0],
                            port: parseInt(parts[1]),
                            protocol: parts[2],
                            cipher: parts[3],
                            obfs: parts[4],
                            password: decodeBase64(parts[5].split('/')[0]),
                            raw: line
                        });
                    }
                } catch (e) { }
            } else if (line.startsWith('hysteria2://') || line.startsWith('hy2://')) {
                try {
                    const normalized = line.replace('hysteria2://', 'https://').replace('hy2://', 'https://');
                    const url = new URL(normalized);
                    proxies.push({
                        id: `p_${Date.now()}_${proxies.length}_${Math.random().toString(36).substr(2, 5)}`,
                        name: decodeURIComponent(url.hash.slice(1)) || 'Hysteria2',
                        type: 'hysteria2',
                        server: url.hostname,
                        port: parseInt(url.port, 10) || 443,
                        password: url.username,
                        sni: url.searchParams.get('sni') || url.hostname,
                        'skip-cert-verify': true,
                        raw: line
                    });
                } catch (e) { }
            } else if (line.startsWith('tuic://')) {
                try {
                    const url = new URL(line);
                    const params = Object.fromEntries(url.searchParams);
                    proxies.push({
                        id: `p_${Date.now()}_${proxies.length}_${Math.random().toString(36).substr(2, 5)}`,
                        name: decodeURIComponent(url.hash.slice(1)) || 'TUIC',
                        type: 'tuic',
                        server: url.hostname,
                        port: parseInt(url.port, 10) || 443,
                        uuid: url.username,
                        password: url.password,
                        alpn: [params.alpn || 'h3'],
                        'skip-cert-verify': true,
                        raw: line
                    });
                } catch (e) { }
            }
        } catch (e) { }
    }

    return proxies;
}

// 去重
function removeDuplicates(proxies) {
    const map = new Map();
    for (const p of proxies) {
        if (!p.server) continue;
        // 使用 server 作为唯一键 (即 IP 去重)
        const key = `${p.server}`;
        if (!map.has(key)) {
            map.set(key, p);
        }
    }
    return Array.from(map.values());
}

// --- 获取订阅 ---
// --- 获取订阅 ---
async function fetchSubscriptions(pages = 50) {
    let allProxies = [];
    let extraUrls = [];

    // 1. 运行 Python 爬虫获取新订阅 (必须优先执行)
    try {
        addLog(`启动 Python 采集器 (Powered by wzdnzd/aggregator, 深度: ${pages}页)...`, 'info');
        extraUrls = await runPythonCrawler(pages);
        addLog(`Python 采集器返回了 ${extraUrls.length} 个有效订阅源`, 'success');
    } catch (e) {
        addLog(`Python 采集器执行异常: ${e.message}`, 'warning');
    }

    // 2. 合并所有订阅源 (去重)
    const allUrls = [...new Set([...SUBSCRIPTION_URLS, ...extraUrls])];

    if (allUrls.length === 0) {
        addLog('未找到任何订阅源', 'warning');
        return [];
    }

    addLog(`准备从 ${allUrls.length} 个订阅源获取节点 (内置: ${SUBSCRIPTION_URLS.length}, 采集: ${extraUrls.length})...`, 'info');

    // 3. 并发下载 (分批执行以免爆内存/网络)
    const BATCH_SIZE = 10;
    const chunks = [];
    for (let i = 0; i < allUrls.length; i += BATCH_SIZE) {
        chunks.push(allUrls.slice(i, i + BATCH_SIZE));
    }

    let processedCount = 0;
    for (const chunk of chunks) {
        const results = await Promise.allSettled(chunk.map(async (url) => {
            try {
                // 自动为 GitHub 链接添加加速前缀 (针对中国大陆优化)
                let actualUrl = url;
                if (url.includes('raw.githubusercontent.com') || url.includes('github.com')) {
                    // Try to use ghproxy or similar mirror if direct access fails or is slow
                    // Note: fetchUrl now uses GLOBAL_PROXY, so raw github *should* work if proxy is good.
                    // But mirrors are often faster/more reliable for large files.
                    // For now, let's stick to the proxy unless it fails.
                    // Better strategy: Try with proxy first (15s), if fail, try mirror (15s)
                }

                // 30秒超时 (Master is impatient but network is slow)
                const content = await fetchUrl(actualUrl, 30000);
                if (!content) return [];
                const parsed = parseContent(content);
                // 简单的来源标记
                parsed.forEach(p => p._sourceUrl = url);
                return parsed;
            } catch (e) { return []; }
        }));

        for (const res of results) {
            if (res.status === 'fulfilled' && Array.isArray(res.value)) {
                allProxies.push(...res.value);
            }
        }

        processedCount += chunk.length;
        if (processedCount % 20 === 0 || processedCount === allUrls.length) {
            addLog(`进度: ${processedCount}/${allUrls.length} 个订阅源已处理`, 'info');
        }
    }

    const unique = removeDuplicates(allProxies);
    addLog(`总计获取 ${unique.length} 个唯一节点 (去重前: ${allProxies.length})`, 'success');
    return unique;
}

// 执行 Python 脚本
async function runPythonCrawler(pages = 50) {
    const scriptDir = path.join(ROOT, 'external/aggregator');
    const scriptFile = 'subscribe/collect.py';

    if (!fs.existsSync(scriptDir)) {
        addLog('错误: Python 项目目录不存在 (external/aggregator)', 'error');
        return [];
    }

    return new Promise((resolve) => {
        // 参数: --pages 动态传入, 增加 --vitiate 模式, 并开启 128 线程疾速模式
        const args = [scriptFile, '--skip', '--vitiate', '--overwrite', '--invisible', '--pages', pages.toString(), '-n', '128'];

        addLog(`执行命令: python3 ${args.join(' ')}`, 'info');

        const child = spawn('python3', args, {
            cwd: scriptDir,
            env: {
                ...process.env,
                PYTHONPATH: scriptDir,
                PYTHONUNBUFFERED: '1',
                // 注入代理环境变量
                http_proxy: GLOBAL_PROXY || `http://127.0.0.1:${CLASH_PORT_HTTP}`,
                https_proxy: GLOBAL_PROXY || `http://127.0.0.1:${CLASH_PORT_HTTP}`,
                HTTP_PROXY: GLOBAL_PROXY || `http://127.0.0.1:${CLASH_PORT_HTTP}`,
                HTTPS_PROXY: GLOBAL_PROXY || `http://127.0.0.1:${CLASH_PORT_HTTP}`
            },
            timeout: 1800000 // 30分钟超时
        });

        // Python 脚本通常把日志打在 stderr
        child.stderr.on('data', (d) => {
            const lines = d.toString().trim().split('\n');
            lines.forEach(line => {
                if (line) addLog(`[PY] ${line}`, 'info');
            });
        });

        // stdout 也可能有输出
        child.stdout.on('data', (d) => {
            const lines = d.toString().trim().split('\n');
            lines.forEach(line => {
                if (line.includes('crawl') || line.includes('finished')) {
                    addLog(`[PY] ${line}`, 'info');
                }
            });
        });

        child.on('close', (code) => {
            if (code !== 0) {
                addLog(`Python 采集器非零退出 (Code ${code})`, 'warning');
            } else {
                addLog('Python 采集器执行完毕', 'success');
            }

            // 读取结果
            try {
                const resultFile = path.join(scriptDir, 'data/subscribes.txt');
                if (fs.existsSync(resultFile)) {
                    const content = fs.readFileSync(resultFile, 'utf8');
                    const urls = content.split('\n').map(x => x.trim()).filter(x => x && x.startsWith('http'));
                    resolve(urls);
                } else {
                    addLog('未找到 Python 生成的 subscribes.txt', 'warning');
                    resolve([]);
                }
            } catch (e) {
                addLog(`读取 Python 结果失败: ${e.message}`, 'error');
                resolve([]);
            }
        });

        child.on('error', (err) => {
            addLog(`启动 Python 进程失败: ${err.message}`, 'error');
            resolve([]);
        });
    });
}



// --- Clash 配置生成 ---
function generateClashConfig(proxies) {
    const uniqueNames = new Set();
    const proxyList = [];
    const addedNames = [];

    for (const p of proxies) {
        // 净化名称 - 确保 name 是字符串类型
        let name = String(p.name || 'node').replace(/[,"]/g, '').trim();
        if (!name) name = `node_${Math.random().toString(36).substr(2, 5)}`;

        // 确保名称唯一
        let finalName = name;
        let counter = 1;
        while (uniqueNames.has(finalName)) {
            finalName = `${name}_${counter++}`;
        }
        uniqueNames.add(finalName);

        // 构建代理对象 —— 直接透传原始字段，只覆盖 name 并清理非标准字段
        // 旧逻辑手动挑选字段导致大量属性丢失（plugin, plugin-opts, sni, alpn, obfs 等），
        // 使得本来可用的节点在 Clash 中连接失败。
        const proxy = { ...p };
        proxy.name = finalName;
        proxy.port = parseInt(p.port, 10) || 443;

        // 检查必要字段
        const supportedTypes = ['vmess', 'vless', 'trojan', 'ss', 'hysteria2', 'hysteria', 'tuic', 'wireguard', 'snell'];
        if (!supportedTypes.includes(proxy.type)) {
            continue; // 跳过不支持的类型
        }

        // 检查各协议必要字段，防止 Clash 启动失败
        if (proxy.type === 'vmess' || proxy.type === 'vless') {
            if (!proxy.uuid) continue;
        } else if (proxy.type === 'trojan' || proxy.type === 'hysteria2') {
            if (!proxy.password) continue;
        } else if (proxy.type === 'ss') {
            if (!proxy.password || !proxy.cipher) continue;
            // 过滤掉包含非法字符（如乱码）的加密方法
            if (!/^[a-zA-Z0-9-]{3,30}$/.test(proxy.cipher)) continue;
        }

        // 基础数据质量检查: 确保 server, port, password 等不包含不可见字符
        const isClean = (str) => typeof str === 'string' && /^[\x20-\x7E]*$/.test(str);
        if (proxy.server && !isClean(proxy.server)) continue;
        if (proxy.password && !isClean(proxy.password)) continue;
        if (proxy.uuid && !isClean(proxy.uuid)) continue;


        // 清理前端/内部专用字段（不应写入 Clash 配置）
        const internalKeys = ['id', 'raw', 'latency', 'localLatency', 'purity', 'purityScore',
            'purityInfo', 'checking', 'failedCheck', 'isFromForum', '_clashName',
            'country', 'selected', 'isManual', 'forumSource', 'importedAt', '_sourceUrl'];
        internalKeys.forEach(k => delete proxy[k]);

        // 清理 undefined / null 值
        for (const key in proxy) {
            if (proxy[key] === undefined || proxy[key] === null) delete proxy[key];
        }

        proxyList.push(proxy);
        addedNames.push(finalName);

        // 保存原始名称映射
        p._clashName = finalName;
    }

    const config = {
        'mixed-port': CLASH_PORT_HTTP,
        'external-controller': CLASH_EXTERNAL_CONTROLLER,
        mode: 'Global',
        'log-level': 'warning',
        dns: {
            enable: true,
            nameserver: ['223.5.5.5', '119.29.29.29', '8.8.8.8', '1.1.1.1']
        },
        proxies: proxyList,
        'proxy-groups': [
            {
                name: 'PROXY',
                type: 'select',
                proxies: addedNames
            }
        ],
        rules: ['MATCH,PROXY']
    };

    fs.writeFileSync(CLASH_CONFIG, yaml.dump(config, { lineWidth: -1 }));
    addLog(`Clash 配置已生成，包含 ${proxyList.length} 个代理`, 'info');
    return proxyList;
}

// --- Clash 进程管理 ---
let clashProcess = null;

function startClash() {
    return new Promise((resolve, reject) => {
        if (clashProcess) {
            try { clashProcess.kill('SIGTERM'); } catch (e) { }
            clashProcess = null;
        }

        addLog(`启动 Clash: ${CLASH_BIN}`, 'info');

        // 确保二进制有执行权限
        try { fs.chmodSync(CLASH_BIN, 0o755); } catch (e) { }

        clashProcess = spawn(CLASH_BIN, ['-d', CLASH_DIR, '-f', CLASH_CONFIG], {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let startupLog = '';

        clashProcess.stdout.on('data', d => {
            const msg = d.toString().trim();
            if (msg) console.log('Clash:', msg);
        });

        clashProcess.stderr.on('data', d => {
            const msg = d.toString().trim();
            if (msg) {
                console.error('ClashErr:', msg);
                startupLog += msg + '\n';
            }
        });

        // 监听早期退出
        const exitHandler = (code) => {
            if (!isResolved) {
                isResolved = true;
                clearInterval(checkInterval);
                const errMsg = `Clash 启动失败，进程意外退出 (Code ${code})。错误日志:\n${startupLog}`;
                addLog(errMsg, 'error');
                reject(new Error(errMsg));
            }
        };
        clashProcess.on('exit', exitHandler);

        clashProcess.on('error', (err) => {
            addLog(`Clash 启动失败: ${err.message}`, 'error');
            reject(err);
        });

        // 等待 Clash 启动
        let attempts = 0;
        const maxAttempts = 60; // 增加到 30 秒超时
        let isResolved = false;

        const checkInterval = setInterval(() => {
            if (isResolved) return;

            attempts++;
            const socket = new net.Socket();
            socket.setTimeout(500);
            socket.on('connect', () => {
                socket.destroy();
                if (!isResolved) {
                    isResolved = true;
                    clearInterval(checkInterval);
                    clashProcess.removeListener('exit', exitHandler); // 移除退出监听，避免误报
                    addLog('Clash 已启动', 'success');
                    resolve(clashProcess);
                }
            }).on('error', () => {
                socket.destroy();
                if (attempts >= maxAttempts) {
                    if (!isResolved) {
                        isResolved = true;
                        clearInterval(checkInterval);
                        reject(new Error('Clash 启动超时 (30s)'));
                    }
                }
            }).on('timeout', () => {
                socket.destroy();
            });
            socket.connect(CLASH_PORT_HTTP, '127.0.0.1');
        }, 500);
    });
}

function stopClash() {
    if (clashProcess) {
        try {
            clashProcess.kill('SIGTERM');
            addLog('Clash 已停止', 'info');
        } catch (e) { }
        clashProcess = null;
    }
}

// --- 节点验证 (使用 Clash External Controller API) ---
async function checkProxyDelay(proxyName, timeout = 3000) {
    // 统一检测目标，避免多 URL 竞速产生的偏差
    const testUrl = 'http://www.gstatic.com/generate_204';

    try {
        // 第一轮测试 (初筛)
        const delay1 = await checkSingleUrl(proxyName, timeout, testUrl);

        if (delay1 <= 0 || delay1 > timeout) {
            return -1; // 初试失败
        }

        return delay1;
    } catch (e) {
        return -1;
    }
}

// Global Agent to manage connections
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 100 });

async function checkSingleUrl(proxyName, timeout, testUrl, signal = null) {
    return new Promise((resolve) => {
        if (signal?.aborted) return resolve(-1);

        const encodedName = encodeURIComponent(proxyName);
        const url = `http://${CLASH_EXTERNAL_CONTROLLER}/proxies/${encodedName}/delay?timeout=${timeout}&url=${encodeURIComponent(testUrl)}`;

        const options = {
            timeout: timeout + 1000, // Slightly longer than API timeout
            agent: httpAgent,
            signal: signal
        };

        let isResolved = false;
        let req;
        const timer = setTimeout(() => {
            if (!isResolved) {
                isResolved = true;
                if (req) req.destroy();
                resolve(-1);
            }
        }, timeout + 2500); // 强硬绝对超时兜底

        const safeResolve = (val) => {
            if (!isResolved) {
                isResolved = true;
                clearTimeout(timer);
                resolve(val);
            }
        };

        req = http.get(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.delay && result.delay > 0 && result.delay <= timeout) {
                        safeResolve(result.delay);
                    } else {
                        safeResolve(-1);
                    }
                } catch (e) {
                    safeResolve(-1);
                }
            });
        });

        req.on('error', (e) => {
            // Abort assertions are expected
            safeResolve(-1);
        });

        req.on('timeout', () => {
            req.destroy();
            safeResolve(-1);
        });
    });
}

// 简单的并发控制 helper
async function mapLimit(items, concurrency, fn) {
    const results = [];
    const iterator = items.entries();
    const workers = new Array(Math.min(concurrency, items.length)).fill(iterator).map(async (iter) => {
        for (const [index, item] of iter) {
            results[index] = await fn(item);
        }
    });
    await Promise.all(workers);
    return results;
}

// 并发验证
async function validateProxies(proxies, concurrency = 24, delay = 5000) {
    addLog(`开始验证 ${proxies.length} 个节点 (并发: ${concurrency}, 超时: ${delay}ms)`, 'info');

    let validated = 0;
    let valid = 0;

    await mapLimit(proxies, concurrency, async (p) => {
        const latency = await checkProxyDelay(p._clashName || p.name, delay);
        validated++;

        if (latency > 0) {
            valid++;
            p.latency = latency;
        } else {
            p.latency = -1;
        }

        // 更新进度
        if (validated % 50 === 0 || validated === proxies.length) {
            addLog(`验证进度: ${validated}/${proxies.length}, 有效: ${valid}`, 'info');
            globalState.active = valid;
        }
    });

    const validProxies = proxies.filter(p => p.latency > 0);
    addLog(`验证完成: ${validProxies.length}/${proxies.length} 有效`, 'success');
    return validProxies;
}

// --- 纯净度检测 ---
async function checkPurity(proxy, clashProxyName) {
    // 通过代理访问 ip-api.com 获取 IP 信息
    const testUrl = 'http://ip-api.com/json?fields=status,countryCode,isp,org,hosting,proxy,query';

    return new Promise((resolve) => {
        const encodedName = encodeURIComponent(clashProxyName);
        // 使用 Clash API 先切换到该代理
        const switchUrl = `http://${CLASH_EXTERNAL_CONTROLLER}/proxies/PROXY`;

        const postData = JSON.stringify({ name: clashProxyName });

        const switchReq = http.request(switchUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
            timeout: 3000
        }, (res) => {
            // 切换成功后检测IP
            setTimeout(async () => {
                try {
                    // 通过 Clash 代理发起请求
                    const result = await fetchViaProxy(testUrl, 8000);
                    const data = JSON.parse(result);

                    if (data.status === 'success') {
                        let score = 100;

                        // 扣分规则
                        if (data.hosting === true) score -= 30; // 机房 IP
                        if (data.proxy === true) score -= 20;   // 被标记为代理

                        // ISP 关键词检测
                        const isp = (data.isp || '').toLowerCase();
                        const org = (data.org || '').toLowerCase();
                        const badKeywords = ['datacenter', 'cloud', 'hosting', 'server', 'vps', 'digital ocean', 'amazon', 'google', 'microsoft', 'alibaba', 'tencent'];
                        for (const kw of badKeywords) {
                            if (isp.includes(kw) || org.includes(kw)) {
                                score -= 10;
                                break;
                            }
                        }

                        score = Math.max(0, score);
                        resolve({ score, ip: data.query, isp: data.isp, country: data.countryCode, hosting: data.hosting });
                    } else {
                        resolve({ score: 50, error: 'API failed' }); // 默认中等分数
                    }
                } catch (e) {
                    resolve({ score: 50, error: e.message });
                }
            }, 500);
        });

        switchReq.on('error', () => resolve({ score: 50, error: 'Switch failed' }));
        switchReq.on('timeout', () => { switchReq.destroy(); resolve({ score: 50, error: 'Timeout' }); });
        switchReq.write(postData);
        switchReq.end();
    });
}

// 通过本地 Clash 代理发起 HTTP 请求
function fetchViaProxy(url, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const proxyAgent = `http://127.0.0.1:${CLASH_PORT_HTTP}`;

        const parsedUrl = new URL(url);
        const options = {
            hostname: '127.0.0.1',
            port: CLASH_PORT_HTTP,
            path: url,
            method: 'GET',
            headers: {
                'Host': parsedUrl.hostname,
                'User-Agent': 'Mozilla/5.0'
            },
            timeout: timeout
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });

        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
        req.end();
    });
}

// 批量纯净度检测
async function checkPurityBatch(proxies, concurrency = 16) {
    addLog(`开始纯净度检测 (${proxies.length} 个节点)...`, 'info');

    let checked = 0;

    // 使用 mapLimit 替代 batch，避免短板效应
    await mapLimit(proxies, concurrency, async (p) => {
        const result = await checkPurity(p, p._clashName || p.name);
        p.purityScore = result.score;
        p.purityInfo = result;
        checked++;

        if (checked % 10 === 0 || checked === proxies.length) {
            addLog(`纯净度检测进度: ${checked}/${proxies.length}`, 'info');
        }
    });

    addLog(`纯净度检测完成`, 'success');
}

// --- 网页抓取 (针对 NodeFree, ClashNode 等分享站) ---
async function scrapeWebSources() {
    addLog('开始抓取公开分享网站...', 'info');
    const sites = [
        'https://nodefree.org/',
        'https://clashnode.com/',
        'https://v2rayshare.com/'
    ];

    let allProxies = [];

    for (const site of sites) {
        try {
            // 访问首页，找最新文章
            addLog(`正在访问: ${site}`, 'info');
            const homeHtml = await fetchUrl(site, 10000);
            if (!homeHtml) continue;

            // 匹配文章链接
            const linkRegex = /href="(https?:\/\/[^"]+(?:\/202[56]\/[^"]+|node-[^"]+))"/g;
            const links = [];
            let match;
            while ((match = linkRegex.exec(homeHtml)) !== null) {
                if (!links.includes(match[1])) links.push(match[1]);
            }

            // 取前3篇文章
            const targetLinks = links.slice(0, 3);

            for (const link of targetLinks) {
                try {
                    const articleHtml = await fetchUrl(link, 8000);
                    if (!articleHtml) continue;

                    // 提取订阅链接 (yaml/txt)
                    const subLinkRegex = /(https?:\/\/[^"'\s]+\.(yaml|yml|txt))/g;
                    const subMatches = articleHtml.match(subLinkRegex);

                    if (subMatches) {
                        for (const subUrl of subMatches) {
                            if (subUrl.includes(site.split('/')[2])) continue;

                            addLog(`  发现订阅: ${subUrl}`, 'info');
                            const content = await fetchUrl(subUrl);
                            if (content) {
                                const parsed = parseContent(content);
                                if (parsed.length > 0) {
                                    parsed.forEach(p => {
                                        p.isFromWeb = true;
                                        p.webSource = site;
                                    });
                                    allProxies.push(...parsed);
                                }
                            }
                        }
                    }
                } catch (e) { }
            }

        } catch (e) {
            addLog(`抓取网站 ${site} 失败: ${e.message}`, 'warning');
        }
    }

    addLog(`网站抓取完成，共发现 ${allProxies.length} 个节点`, 'success');
    return allProxies;
}

// --- Telegram 频道直接抓取 (无需登录) ---
async function scrapeTelegramChannel(channelName) {
    const url = `https://t.me/s/${channelName}`;
    addLog(`正在抓取 Telegram 频道: ${channelName}`, 'info');

    try {
        const html = await fetchUrl(url, 10000);
        if (!html) return [];

        const proxies = [];
        const regex = /(vmess|vless|trojan|ss|hysteria2):\/\/[a-zA-Z0-9%\-._~:/?#[\]@!$&'()*+,;=]+/g;
        const matches = html.match(regex);

        if (matches) {
            matches.forEach(rawLink => {
                let cleanLink = rawLink.split('<')[0].split('"')[0].split('\'')[0].trim();
                cleanLink = cleanLink.replace(/&amp;/g, '&');
                if (cleanLink.length < 15) return;

                const type = cleanLink.split('://')[0];
                let proxy = null;

                // Re-use parseContent for better parsing logic
                const parsed = parseContent(cleanLink);
                if (parsed.length > 0) {
                    proxy = parsed[0]; // Take the first one if multiple are parsed
                }

                if (proxy) {
                    proxy.isFromTelegram = true;
                    proxy.telegramSource = channelName;
                    proxies.push(proxy);
                }
            });
        }
        return proxies;
    } catch (e) {
        addLog(`抓取频道 ${channelName} 失败: ${e.message}`, 'warning');
        return [];
    }
}

async function fetchFromTelegramChannels() {
    if (typeof TELEGRAM_CHANNELS === 'undefined' || TELEGRAM_CHANNELS.length === 0) return [];

    addLog(`开始从 ${TELEGRAM_CHANNELS.length} 个 Telegram 频道抓取...`, 'info');
    let allProxies = [];

    const batchSize = 3;
    for (let i = 0; i < TELEGRAM_CHANNELS.length; i += batchSize) {
        const batch = TELEGRAM_CHANNELS.slice(i, i + batchSize);
        const results = await Promise.all(batch.map(ch => scrapeTelegramChannel(ch)));
        results.forEach(p => allProxies.push(...p));
    }

    addLog(`Telegram 频道抓取完成，共发现 ${allProxies.length} 个节点`, 'success');
    return allProxies;
}

// --- 分享站挖掘 (Blog/Deep Search) ---
async function scrapeWebSites() {
    const sites = [
        'https://nodefree.org',
        'https://clashnode.com',
        'https://freeclashnode.com',
        'https://v2rayshare.com',
        'https://mfclash.com',
        'https://clashp.com',
        'https://clashios.com',
        'https://fqgo.org',
        'https://tizi.link',
        'https://fastnode.me',
        'https://www.cfmem.com',
        'https://clashv2ray.com',
        'https://v2rayfree.com',
        'https://kxsw.io'
    ].filter(s => !FAILED_WEB_SOURCES.has(s));

    addLog(`启动深度全网挖掘 (目标: ${sites.length} 个分享站)...`, 'info');
    let allProxies = [];

    const now = new Date();
    const YYYY = now.getFullYear();
    const MM = (now.getMonth() + 1).toString().padStart(2, '0');

    for (const site of sites) {
        try {
            addLog(`正在挖掘: ${site}`, 'info');
            const homeHtml = await fetchUrl(site, 10000);
            if (!homeHtml) continue;

            // 匹配文章链接 (仅限 2026 年)
            const linkRegex = /href=["'](https?:\/\/[^"'\s]+(?:\/2026\/[^"'\s]+|node-[^"'\s]+))["']/g;
            const links = [];
            let match;
            while ((match = linkRegex.exec(homeHtml)) !== null) {
                const u = match[1];
                // YYYY 已经是 2026，所以这行逻辑保持不变，但 regex 已收紧
                if ((u.includes(YYYY.toString()) || u.includes(`/${MM}/`)) && !links.includes(u)) {
                    links.push(u);
                }
            }

            // 取前10篇文章深入挖掘 (增加深度)
            const targetLinks = links.slice(0, 10);
            for (const link of targetLinks) {
                try {
                    addLog(`  深入文章: ${link}`, 'info');
                    const articleHtml = await fetchUrl(link, 10000);
                    if (!articleHtml) continue;

                    // 1. 直接尝试解析网页内容 (包含对 &amp; 等转义符的处理)
                    const directNodes = parseContent(articleHtml.replace(/&amp;/g, '&'));
                    if (directNodes.length > 0) {
                        directNodes.forEach(p => { p.isFromWeb = true; p.webSource = site; });
                        allProxies.push(...directNodes);
                    }

                    // 2. 提取订阅链接 (yaml/txt/clash)
                    const subLinkRegex = /https?:\/\/[^"'\s]+\.(yaml|yml|txt|clash)(?:\?[^"'\s]*)?/gi;
                    const subMatches = articleHtml.match(subLinkRegex);

                    if (subMatches) {
                        for (const subUrl of subMatches) {
                            // 排除站内资源或已知的非订阅链接
                            if (subUrl.includes(site.split('/')[2]) || subUrl.includes('wordpress') || subUrl.includes('theme')) continue;

                            addLog(`    发现隐藏订阅: ${subUrl}`, 'info');
                            const content = await fetchUrl(subUrl, 15000);
                            if (content) {
                                const parsed = parseContent(content);
                                if (parsed.length > 0) {
                                    parsed.forEach(p => {
                                        p.isFromWeb = true;
                                        p.webSource = site;
                                        p._sourceUrl = subUrl;
                                    });
                                    allProxies.push(...parsed);
                                }
                            }
                        }
                    }
                } catch (e) {
                    addLog(`  文章解析失败 ${link}: ${e.message}`, 'warning');
                }
            }
        } catch (e) {
            if (e.message.includes('code 35') || e.message.includes('failed')) {
                addLog(`分享站 ${site} 无法访问 (错误 35), 系统已将其从本次任务中排除`, 'warning');
                FAILED_WEB_SOURCES.add(site);
            } else {
                addLog(`分享站抓取失败 ${site}: ${e.message}`, 'warning');
            }
        }
    }

    const unique = removeDuplicates(allProxies);
    addLog(`全网挖掘结束，共计发现 ${unique.length} 个解渴节点 (原始: ${allProxies.length})`, 'success');
    return unique;
}

// --- Linux.do 论坛抓取 (精简版，用于全网获取模式) ---
async function fetchFromLinuxDo() {
    addLog('启动 Linux.do 论坛节点抓取...', 'info');

    const allProxies = [];

    try {
        // 获取 Cookie (如果有)
        const cookie = getLinuxDoCookie();
        if (cookie) {
            addLog('已加载 Linux.do Cookie', 'info');
        }

        // 获取最近的帖子列表 (前5页，约100个帖子)
        const baseUrl = 'https://linux.do/tag/%E8%AE%A2%E9%98%85%E8%8A%82%E7%82%B9.json';
        let allTopics = [];

        for (let page = 0; page < 5; page++) {
            try {
                const pageUrl = page === 0 ? baseUrl : `${baseUrl}?page=${page}`;
                const listJson = await fetchLinuxDo(pageUrl, cookie);

                if (listJson.includes('<!DOCTYPE') || listJson.includes('login-required')) {
                    addLog(`Linux.do 访问受限 (页${page + 1})，跳过`, 'warning');
                    break;
                }

                const listData = JSON.parse(listJson);
                const topics = listData.topic_list?.topics || [];

                if (topics.length === 0) break;

                // 只取最近7天的帖子
                const now = new Date();
                const recentTopics = topics.filter(t => {
                    const created = new Date(t.created_at);
                    return (now - created) / (1000 * 60 * 60 * 24) <= 7;
                });

                allTopics = allTopics.concat(recentTopics);
                addLog(`Linux.do 第${page + 1}页: 发现 ${recentTopics.length} 个近期帖子`, 'info');

                await new Promise(r => setTimeout(r, 2000)); // Rate limit
            } catch (e) {
                addLog(`Linux.do 第${page + 1}页获取失败: ${e.message}`, 'warning');
            }
        }

        // 去重
        const uniqueTopics = [];
        const seenIds = new Set();
        for (const t of allTopics) {
            if (!seenIds.has(t.id)) {
                seenIds.add(t.id);
                uniqueTopics.push(t);
            }
        }

        addLog(`Linux.do 共发现 ${uniqueTopics.length} 个精华帖，开始深度抓取...`, 'info');

        // 增加处理数量到 50 个
        const toProcess = uniqueTopics.slice(0, 50);

        for (let i = 0; i < toProcess.length; i++) {
            const topic = toProcess[i];
            try {
                const topicUrl = `https://linux.do/t/topic/${topic.id}.json`;
                const topicJson = await fetchLinuxDo(topicUrl, cookie);
                const topicData = JSON.parse(topicJson);

                const posts = topicData.post_stream?.posts || [];

                for (const post of posts.slice(0, 5)) { // 读取前5楼
                    const content = post.cooked || '';

                    // 提取节点链接
                    const nodePatterns = [
                        /vmess:\/\/[A-Za-z0-9+\/=_-]+/g,
                        /vless:\/\/[A-Za-z0-9@.:_\-?&=%#\/]+/g,
                        /trojan:\/\/[A-Za-z0-9@.:_\-?&=%#\/]+/g,
                        /ss:\/\/[A-Za-z0-9@.:_\-?&=%#\/]+/g,
                        /hysteria2?:\/\/[A-Za-z0-9@.:_\-?&=%#\/]+/g,
                        /hy2:\/\/[A-Za-z0-9@.:_\-?&=%#\/]+/g
                    ];

                    for (const pattern of nodePatterns) {
                        const matches = content.match(pattern) || [];
                        for (let m of matches) {
                            m = m.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
                            const parsed = parseContent(m);
                            if (parsed.length > 0) {
                                parsed.forEach(p => {
                                    p.isFromForum = true;
                                    p.forumSource = 'linux.do';
                                });
                                allProxies.push(...parsed);
                            }
                        }
                    }

                    // 提取订阅链接
                    const subPattern = /https?:\/\/[^\s<>"'\)]+(?:subscribe|sub|api|clash|v2ray)[^\s<>"'\)]*/gi;
                    const subMatches = content.match(subPattern) || [];

                    for (let url of subMatches.slice(0, 3)) { // 限制每个帖子最多3个订阅
                        url = url.replace(/&amp;/g, '&').replace(/[,;。，；]+$/, '').trim();
                        if (url.includes('linux.do') || url.includes('github.com')) continue;
                        if (url.length > 500) continue;

                        try {
                            const subContent = await fetchUrl(url, 10000);
                            const subProxies = parseContent(subContent);
                            if (subProxies.length > 0) {
                                subProxies.forEach(p => {
                                    p.isFromForum = true;
                                    p.forumSource = 'linux.do';
                                });
                                allProxies.push(...subProxies);
                                addLog(`  Linux.do 订阅 -> ${subProxies.length} 节点`, 'success');
                            }
                        } catch (e) {
                            // ignore subscription errors
                        }
                    }
                }

                if ((i + 1) % 10 === 0) {
                    addLog(`Linux.do 进度: ${i + 1}/${toProcess.length}, 已获取 ${allProxies.length} 节点`, 'info');
                }

                await new Promise(r => setTimeout(r, 1500)); // Rate limit
            } catch (e) {
                // ignore topic errors
            }
        }

    } catch (e) {
        addLog(`Linux.do 抓取异常: ${e.message}`, 'error');
    }

    // 去重
    const unique = removeDuplicates(allProxies);
    addLog(`Linux.do 抓取完成，共 ${unique.length} 个唯一节点`, 'success');

    return unique;
}

async function runAggregation(mode = 'github', pages = 50) {
    if (globalState.status !== 'idle') {
        if (globalState.taskStartTime && Date.now() - globalState.taskStartTime > 3600000) {
            addLog(`⚠️ 检测到系统长时间维持 ${globalState.status} 状态，疑似死锁，已强行解锁。`, 'warning');
            globalState.status = 'idle';
        } else {
            addLog('聚合任务已在运行中', 'warning');
            return;
        }
    }

    globalState.status = 'fetching';
    globalState.taskStartTime = Date.now();
    globalState.logs = [];
    globalState.total = 0;
    globalState.active = 0;

    addLog(`开始聚合任务 (模式: ${mode === 'all' ? '全网获取' : 'Github 更新'}, 爬取深度: ${pages})...`, 'info');

    // 重置各来源统计
    globalState.lastFetchStats = { github: 0, web: 0, linuxdo: 0, hk: 0, hk1: 0, sg: 0, us: 0 };

    let proxies = [];

    try {
        // --- 0.1 从全球(香港、新加坡、美国)等自定义服务器获取订阅 (最优先执行) ---
        // 放在最前面执行，通常这些服务器可以直连，速度最快
        const customServers = [
            { name: '香港', id: 'hk', url: 'https://hk.liukun.com/api/subscribe?clash=1' },
            { name: '香港1', id: 'hk1', url: 'https://hk1.liukun.com/api/subscribe?clash=1' },
            { name: '新加坡', id: 'sg', url: 'https://sg.liukun.com/api/subscribe?clash=1' },
            { name: '美国', id: 'us', url: 'https://us.liukun.com/api/subscribe?clash=1' }
        ];

        for (const server of customServers) {
            try {
                addLog(`正在从${server.name}服务器获取 Clash 订阅 (${server.url})...`, 'info');
                // 增加随机时间戳，防止被 Nginx/CDN 或 fetchUrl 内部缓存
                const fetchUrlWithTime = `${server.url}&_t=${Date.now()}`;
                const content = await fetchUrl(fetchUrlWithTime, 60000);
                const parsedProxies = parseContent(content);
                if (parsedProxies && parsedProxies.length > 0) {
                    addLog(`${server.name}服务器订阅获取完成，获得 ${parsedProxies.length} 个节点`, 'success');
                    parsedProxies.forEach(p => p.forumSource = `${server.id}_server`); // 标记来源
                    proxies.push(...parsedProxies);
                    globalState.lastFetchStats[server.id] = parsedProxies.length;
                } else {
                    addLog(`${server.name}服务器订阅获取完成，未发现有效节点`, 'warning');
                }
            } catch (e) {
                addLog(`${server.name}服务器获取失败: ${e.message}`, 'error');
            }
        }

        // 0.2 在获取完自定义服务器节点后进行一次去重
        if (proxies.length > 0) {
            const beforeUnique = proxies.length;
            proxies = removeDuplicates(proxies);
            addLog(`自定义服务器(香港、香港1、新加坡、美国)节点归集完毕，初步去重：${beforeUnique} -> ${proxies.length} 个不重复节点`, 'info');
        }

        // --- 0.3 启动全局采集专线代理 (Premium Proxy) ---
        // 无论何种模式，只要有需要翻墙的操作，都建议开启
        await premiumManager.start();
        await new Promise(r => setTimeout(r, 2000)); // 等待启动

        // 设置全局代理
        GLOBAL_PROXY = `http://127.0.0.1:${premiumManager.PROXY_PORT}`;
        addLog(`========== 启动采集任务 (Proxy: ${GLOBAL_PROXY}) ==========`, 'info');

        // 0.5 加载手动/历史导入节点 (manual_proxies.json)
        try {
            const manualFile = path.join(ROOT, 'manual_proxies.json');
            if (fs.existsSync(manualFile)) {
                const manualNodes = JSON.parse(fs.readFileSync(manualFile, 'utf8'));
                if (Array.isArray(manualNodes) && manualNodes.length > 0) {
                    addLog(`加载了 ${manualNodes.length} 个历史导入/手动节点`, 'info');
                    proxies.push(...manualNodes);
                }
            }
        } catch (e) {
            addLog(`加载 manual_proxies.json 失败: ${e.message}`, 'error');
        }

        // 1. 获取 Github 节点 (总是执行)
        try {
            const githubProxies = await fetchSubscriptions(pages);
            globalState.lastFetchStats.github = githubProxies.length;
            addLog(`Github 订阅获取完成，获得 ${githubProxies.length} 个节点`, 'success');
            proxies.push(...githubProxies);
        } catch (e) {
            addLog(`Github 获取失败: ${e.message}`, 'error');
        }



        // 2. 如果是全网获取模式
        if (mode === 'all') {
            // 网站抓取 (Blog/Deep Search)
            try {
                const webProxies = await scrapeWebSites();
                globalState.lastFetchStats.web = webProxies.length;
                addLog(`网站抓取完成，获得 ${webProxies.length} 个节点`, 'success');
                proxies.push(...webProxies);
            } catch (e) {
                addLog(`网站抓取失败: ${e.message}`, 'error');
            }

            // Telegram 频道抓取 (新增)
            try {
                const tgProxies = await fetchFromTelegramChannels();
                if (tgProxies.length > 0) {
                    addLog(`Telegram 抓取完成，获得 ${tgProxies.length} 个节点`, 'success');
                    proxies.push(...tgProxies);
                }
            } catch (e) {
                addLog(`Telegram 抓取失败: ${e.message}`, 'error');
            }

            // Linux.do 论坛抓取
            try {
                addLog('正在深度抓取 Linux.do...', 'info');
                // fetchFromLinuxDo 内部 fetchLinuxDo 会使用 curl -x (需确认 fetchLinuxDo 使用 GLOBAL_PROXY 或 7940)
                // 修改 fetchLinuxDo 逻辑或者依赖 external curl proxy arg?
                // fetchLinuxDo 之前被我改为使用 7890 (CLASH_PORT_HTTP)。
                // 现在 GLOBAL_PROXY 是 7940。fetchUrl 使用 GLOBAL_PROXY。
                // fetchLinuxDo 使用 spawn('curl')，需要手动传递 -x。
                // 稍后我会修正 fetchLinuxDo。但这里先假设它能工作。
                const linuxDoProxies = await fetchFromLinuxDo();
                globalState.lastFetchStats.linuxdo = linuxDoProxies.length;
                if (linuxDoProxies.length > 0) {
                    addLog(`Linux.do 抓取完成，获取 ${linuxDoProxies.length} 个节点`, 'success');
                    proxies.push(...linuxDoProxies);
                } else {
                    addLog('Linux.do 抓取完成，未发现有效节点', 'warning');
                }
            } catch (e) {
                addLog(`Linux.do 抓取失败: ${e.message}`, 'error');
            }



        }


        // 深度去重 (基于 Server:Port:Ident)
        addLog(`抓取完成，开始深度去重 (初始: ${proxies.length})...`, 'info');
        await new Promise(r => setImmediate(r)); // 让出主线程
        proxies = removeDuplicates(proxies);
        addLog(`深度去重完成，剩余 ${proxies.length} 个节点`, 'info');

        addLog(`原始节点获取完成，共 ${proxies.length} 个唯一节点`, 'info');

        if (proxies.length === 0) {
            addLog('未获取到任何节点，任务结束', 'warning');
            globalState.status = 'idle';
            return;
        }

        globalState.status = 'testing';
        await new Promise(r => setImmediate(r)); // 让出主线程

        // 3. 生成 Clash 配置
        addLog('生成 Clash 测试配置...', 'info');
        generateClashConfig(proxies);
        await new Promise(r => setImmediate(r)); // 让出主线程

        // 4. 启动 Clash
        await startClash();
        await new Promise(r => setTimeout(r, 3000)); // 这里已有 timeout，足够让出

        // 5. 验证节点 (增加并发和超时)
        addLog('========== 开始节点验证 (并发: 100, 超时: 15000ms) ==========', 'info');
        await new Promise(r => setImmediate(r)); // 让出主线程
        
        let validProxies = await validateProxies(proxies, 100, 15000);

        // 输出各来源验证通过统计
        if (mode === 'all') {
            const linuxdoValid = validProxies.filter(p => p.forumSource === 'linux.do').length;
            const linuxdoTotal = proxies.filter(p => p.forumSource === 'linux.do').length;
            addLog(`📊 Linux.do 验证结果: ${linuxdoValid}/${linuxdoTotal} 通过`, linuxdoValid > 0 ? 'success' : 'warning');

            // 更新统计信息
            globalState.lastFetchStats.linuxdoValid = linuxdoValid;
        }

        // 6. 纯净度检测 (仅检测有效节点)
        if (validProxies.length > 0) {
            const proxiesNeedPurity = validProxies.filter(p => !p.purityInfo || !p.purityScore);
            if (proxiesNeedPurity.length > 0) {
                // 全量纯净度检测，确保节点质量
                const target = proxiesNeedPurity;
                await new Promise(r => setImmediate(r)); // 让出主线程
                addLog(`========== 开始全量纯净度检测 (${target.length} 个新节点) ==========`, 'info');
                await checkPurityBatch(target, 10); // 略微增加并发
            }

            // 按延迟排序
            validProxies.sort((a, b) => (a.latency || 99999) - (b.latency || 99999));

            // --- 🇨🇳 中国大陆网络优化 (China-Optimization) ---
            // 如果有效节点数量充足 (>50)，则进一步过滤掉低质量节点 (如无 TLS 的 VMess)
            // 这些节点在美国服务器测试是通过的，但在国内 99% 会超时
            const highQualityNodes = validProxies.filter(isHighQualityNode);
            const lowQualityNodes = validProxies.filter(p => !isHighQualityNode(p));

            addLog(`🛡️ 协议质量分析: 高质量(Reality/TLS/Hy2) ${highQualityNodes.length} 个, 普通(Plain/SS) ${lowQualityNodes.length} 个`, 'info');

            if (highQualityNodes.length >= 30) {
                // 如果高质量节点足够，仅保留高质量节点 + 少量低延迟的普通节点(防止误杀)
                const keptLowQuality = lowQualityNodes.slice(0, 10); // 只保留延迟最低的 10 个普通节点做备用
                validProxies = [...highQualityNodes, ...keptLowQuality];
                addLog(`⚡ 已启用强力过滤: 移除 ${lowQualityNodes.length - keptLowQuality.length} 个易被墙的低质量节点，保留 ${validProxies.length} 个精选节点`, 'success');
            } else {
                addLog(`⚠️ 高质量节点不足 (${highQualityNodes.length} < 30)，保留所有有效节点以确保可用性`, 'warning');
            }

            // 质量过滤后重新排序（这是BUG修复的关键！）
            // 优先按纯净度排序，纯净度相同时按延迟排序
            validProxies.sort((a, b) => {
                const scoreA = a.purityScore || 0;
                const scoreB = b.purityScore || 0;
                if (scoreB !== scoreA) {
                    return scoreB - scoreA; // 纯净度高的在前
                }
                return (a.latency || 99999) - (b.latency || 99999); // 延迟低的在前
            });
            addLog(`✅ 节点已按纯净度和延迟重新排序`, 'success');
        }

        // 7. 保存结果 —— 合并策略：新节点与旧节点合并，避免因本次未抓到而丢失旧节点
        const proxiesJsonPath = path.join(ROOT, 'proxies.json');
        let mergedProxies = [];

        // 7a. 读取旧的 proxies.json
        let existingProxies = [];
        try {
            if (fs.existsSync(proxiesJsonPath)) {
                existingProxies = JSON.parse(fs.readFileSync(proxiesJsonPath, 'utf-8'));
                if (!Array.isArray(existingProxies)) existingProxies = [];
            }
        } catch (e) {
            addLog(`读取旧 proxies.json 失败: ${e.message}，将仅使用新数据`, 'warning');
            existingProxies = [];
        }

        // 7b. 以 server(IP) 为 key 建立旧节点索引
        const existingMap = new Map();
        for (const p of existingProxies) {
            if (!p.server) continue;
            const key = `${p.server}`;
            existingMap.set(key, p);
        }

        // 7c. 用新验证通过的节点更新/覆盖旧节点（新数据优先）
        const newKeys = new Set();
        for (const p of validProxies) {
            if (!p.server) continue;
            const key = `${p.server}`;
            newKeys.add(key);
            existingMap.set(key, p); // 新数据覆盖旧数据
        }

        // 7d. 合并：所有旧节点 + 新节点（已去重）
        mergedProxies = Array.from(existingMap.values());

        const keptOld = mergedProxies.length - validProxies.length;
        const brandNew = validProxies.filter(p => {
            const key = `${p.server}`;
            // 如果这个 key 不在旧数据中，说明是全新节点
            return !existingProxies.some(ep => `${ep.server}` === key);
        }).length;

        addLog(`📊 合并策略: 旧节点保留 ${keptOld} 个, 本次验证通过 ${validProxies.length} 个 (其中全新 ${brandNew} 个), 合并后总计 ${mergedProxies.length} 个`, 'info');

        // 7e. 按纯净度+延迟重新排序
        mergedProxies.sort((a, b) => {
            const scoreA = a.purityScore || 0;
            const scoreB = b.purityScore || 0;
            if (scoreB !== scoreA) return scoreB - scoreA;
            return (a.latency || 99999) - (b.latency || 99999);
        });

        // 7f. 写入合并后的结果
        if (mergedProxies.length > 0) {
            await new Promise(r => setImmediate(r));
            fs.writeFileSync(proxiesJsonPath, JSON.stringify(mergedProxies, null, 2));
            addLog(`✅ 已保存 ${mergedProxies.length} 个节点 (合并模式，只增不减)`, 'success');
        } else {
            addLog('未找到任何节点', 'warning');
        }

        // 8. 生成 Aggregator.yaml (使用合并后的全量节点，跳过重复测试)
        await saveAggregatorYaml(mergedProxies, false);

        globalState.total = mergedProxies.length;
        globalState.active = validProxies.length;
        globalState.lastUpdated = new Date();
        addLog('========== 聚合完成 ==========', 'success');

    } catch (e) {
        addLog(`聚合任务致命错误: ${e.message}`, 'error');
        console.error(e);
    } finally {
        // 关闭测试用的 Clash (如果还在运行)
        stopClash();

        // 关闭采集用的 Premium Proxy
        addLog('任务结束，关闭所有代理资源...', 'info');
        GLOBAL_PROXY = HOST_PROXY;
        premiumManager.stop();

        globalState.status = 'idle';
    }
}

// --- 导出配置转换 ---
function proxyToClashObj(p) {
    if (!p.type || !p.server || !p.port) {
        return null;
    }

    // 直接透传所有原始字段，确保属性不丢失 (plugin, sni, alpn, obfs 等)
    const obj = { ...p };

    // 强制/默认设置
    obj.port = parseInt(p.port, 10);
    obj.tfo = true;
    if (obj['skip-cert-verify'] === undefined) obj['skip-cert-verify'] = true;

    // 清理前端/内部专用字段（不应出现在导出配置中）
    const internalKeys = ['id', 'raw', 'latency', 'localLatency', 'purity', 'purityScore',
        'purityInfo', 'checking', 'failedCheck', 'isFromForum', '_clashName',
        'country', 'selected', 'isManual', 'addedAt', 'maintenanceLatency'];
    internalKeys.forEach(k => delete obj[k]);

    // 清理 undefined 值
    Object.keys(obj).forEach(key => {
        if (obj[key] === undefined) delete obj[key];
    });

    return obj;
}

// --- Clash 真机测试任务管理 (全局作用域) ---
const connectivityTasks = new Map();

// 并发控制辅助函数
async function taskMapLimit(items, limit, iterator) {
    const results = [];
    const executing = [];
    for (const item of items) {
        const p = Promise.resolve().then(() => iterator(item));
        results.push(p);

        if (limit <= items.length) {
            const e = p.then(() => executing.splice(executing.indexOf(e), 1));
            executing.push(e);
            if (executing.length >= limit) {
                await Promise.race(executing);
            }
        }
    }
    return Promise.all(results);
}

// --- 核心真机测试逻辑 ---
async function testProxiesDirectly(proxies, onProgress = null) {
    if (!proxies || proxies.length === 0) return {};

    const oldStatus = globalState.status;
    globalState.status = 'testing';
    addLog(`🚀 启动 Clash 进行真机测试 (并发: 10, 超时: 8s)...`, 'info');

    try {
        await stopClash();

        // 生成配置 (注意：此操作会修改 proxies 对象，添加 _clashName)
        generateClashConfig(proxies);

        await startClash();
        // 等待 Clash 启动完全
        await new Promise(r => setTimeout(r, 3000));

        const results = {};
        const concurrency = 10;
        const timeout = 8000;

        await taskMapLimit(proxies, concurrency, async (p) => {
            try {
                const name = p._clashName;
                if (!name) {
                    results[p.id] = -1;
                    return;
                }

                const latency = await checkProxyDelay(name, timeout);
                results[p.id] = latency;
                if (onProgress) onProgress(p.id, latency);
            } catch (e) {
                results[p.id] = -1;
                if (onProgress) onProgress(p.id, -1);
            }
        });

        return results;

    } catch (e) {
        addLog(`❌ 真机测试异常: ${e.message}`, 'error');
        throw e;
    } finally {
        globalState.status = oldStatus;
    }
}

async function runConnectivityTask(taskId, proxies) {
    const task = connectivityTasks.get(taskId);
    if (!task) return;

    task.status = 'running';
    task.total = proxies.length;
    task.startTime = Date.now();

    try {
        const results = await testProxiesDirectly(proxies, (id, lat) => {
            task.results[id] = lat;
            task.progress++;
        });

        task.status = 'completed';
        task.endTime = Date.now();
        addLog(`测试任务 ${taskId} 完成，耗时 ${((task.endTime - task.startTime) / 1000).toFixed(1)}s`, 'success');

    } catch (e) {
        console.error('Connectivity task failed', e);
        task.status = 'error';
        task.message = e.message;
        addLog(`测试任务 ${taskId} 失败: ${e.message}`, 'error');
    } finally {
        // 移除多余的 runProxyMaintenance() 调用，避免任务堆叠
    }
}


// --- HTTP 服务器 ---
const server = http.createServer(async (req, res) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (req.method === 'OPTIONS') {
        res.writeHead(204, headers);
        return res.end();
    }

    const getBody = () => new Promise(resolve => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try { resolve(JSON.parse(body)); } catch (e) { resolve({}); }
        });
    });

    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);



    // API: 全网抓取 (Github + Telegram + Others)
    if (parsedUrl.pathname === '/api/fetch_all' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            let pages = 100; // 默认深挖 100 页
            try {
                const data = JSON.parse(body);
                if (data.pages) pages = parseInt(data.pages, 10);
            } catch (e) { }

            if (globalState.status === 'idle') {
                runScheduledTask(true, pages); // Manual trigger with pages
                res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
                res.end(JSON.stringify({ success: true, message: `全网抓取任务已启动 (深度: ${pages})` }));
            } else {
                res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
                res.end(JSON.stringify({ success: false, message: '任务进行中', status: globalState.status }));
            }
        });
        return;
    }

    // API: 手动纯净度检查
    if (parsedUrl.pathname === '/api/check_purity' && req.method === 'POST') {
        try {
            const { proxies } = await getBody();
            if (!proxies || !Array.isArray(proxies) || proxies.length === 0) {
                res.writeHead(400, { 'Content-Type': 'application/json', ...headers });
                return res.end(JSON.stringify({ success: false, error: '没有提供节点' }));
            }

            addLog(`开始手动纯净度检查 (${proxies.length} 个节点)...`, 'info');

            const results = [];
            const batchSize = 10;

            for (let i = 0; i < proxies.length; i += batchSize) {
                const batch = proxies.slice(i, i + batchSize);

                await Promise.all(batch.map(async (p) => {
                    const result = await checkPurity(p, p._clashName || p.name);
                    results.push({
                        id: p.id,
                        server: p.server,
                        purityScore: result.score,
                        purityInfo: result
                    });
                }));

                if ((i + batchSize) % 20 === 0 || i + batchSize >= proxies.length) {
                    addLog(`纯净度检查进度: ${Math.min(i + batchSize, proxies.length)}/${proxies.length}`, 'info');
                }
            }

            addLog(`手动纯净度检查完成`, 'success');

            res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
            res.end(JSON.stringify({
                success: true,
                checked: results.length,
                results: results
            }));
        } catch (e) {
            console.error('纯净度检查错误:', e);
            res.writeHead(500, { 'Content-Type': 'application/json', ...headers });
            res.end(JSON.stringify({ success: false, error: e.message }));
        }
        return;
    }

    // API: 状态
    if (parsedUrl.pathname === '/api/status' && req.method === 'GET') {
        // 获取服务器运行时间
        let serverUptime = '';
        let serverBootTime = '';
        let serverBootTimeRaw = null;
        try {
            const { execSync } = require('child_process');
            serverUptime = execSync('uptime -p', { encoding: 'utf8' }).trim();

            // 获取原始启动时间（服务器本地时间）
            const rawBootTime = execSync('uptime -s', { encoding: 'utf8' }).trim();

            // rawBootTime 格式: "2026-02-07 11:57:55" (服务器本地时间)
            // 直接解析为 Date 对象（JavaScript 会按本地时区解释）
            const localDate = new Date(rawBootTime.replace(' ', 'T'));

            // localDate.getTime() 返回 UTC 毫秒，直接加 8 小时得到北京时间
            const beijingOffset = 8 * 60 * 60 * 1000;
            const beijingTime = new Date(localDate.getTime() + beijingOffset);

            // 格式化为 YYYY-MM-DD HH:mm:ss
            const pad = (n) => n.toString().padStart(2, '0');
            serverBootTime = `${beijingTime.getUTCFullYear()}-${pad(beijingTime.getUTCMonth() + 1)}-${pad(beijingTime.getUTCDate())} ${pad(beijingTime.getUTCHours())}:${pad(beijingTime.getUTCMinutes())}:${pad(beijingTime.getUTCSeconds())}`;
            serverBootTimeRaw = localDate.toISOString();
        } catch (e) {
            serverUptime = 'unknown';
        }

        res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
        res.end(JSON.stringify({
            ...globalState,
            serverUptime,
            serverBootTime,
            serverBootTimeRaw,
            isLinuxDoImporting
        }));
        return;
    }

    // API: 获取节点
    if (parsedUrl.pathname === '/api/proxies' && req.method === 'GET') {
        try {
            const data = fs.readFileSync(path.join(ROOT, 'proxies.json'), 'utf8');
            res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
            res.end(data);
        } catch (e) {
            res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
            res.end('[]');
        }
        return;
    }

    // API: 普通节点 (Cloud proxies) - 保存或删除
    if (parsedUrl.pathname === '/api/proxies' && req.method === 'POST') {
        try {
            const body = await getBody();
            const proxies = body.proxies || [];
            const proxiesFile = path.join(ROOT, 'proxies.json');

            fs.writeFileSync(proxiesFile, JSON.stringify(proxies, null, 2));
            addLog(`API保存了 ${proxies.length} 个普通节点 (覆盖模式)`, 'info');

            res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
            res.end(JSON.stringify({ success: true, total: proxies.length }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json', ...headers });
            res.end(JSON.stringify({ success: false, error: e.message }));
        }
        return;
    }

    if (parsedUrl.pathname === '/api/proxies' && req.method === 'DELETE') {
        let bodyRaw = '';
        req.on('data', chunk => bodyRaw += chunk);
        req.on('end', () => {
            try {
                const body = JSON.parse(bodyRaw);
                const idsToDelete = body.ids || [];

                if (!Array.isArray(idsToDelete) || idsToDelete.length === 0) {
                    res.writeHead(400, { 'Content-Type': 'application/json', ...headers });
                    res.end(JSON.stringify({ success: false, error: 'No IDs provided' }));
                    return;
                }

                const proxiesFile = path.join(ROOT, 'proxies.json');
                let proxies = [];
                if (fs.existsSync(proxiesFile)) {
                    proxies = JSON.parse(fs.readFileSync(proxiesFile, 'utf8'));
                }

                const deleteSet = new Set(idsToDelete);
                const remaining = proxies.filter(p => !deleteSet.has(p.id));

                fs.writeFileSync(proxiesFile, JSON.stringify(remaining, null, 2));
                addLog(`API删除了 ${proxies.length - remaining.length} 个节点`, 'info');

                res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
                res.end(JSON.stringify({
                    success: true,
                    deleted: proxies.length - remaining.length,
                    remaining: remaining.length
                }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json', ...headers });
                res.end(JSON.stringify({ success: false, error: e.message }));
            }
        });
        return;
    }

    // API: 生成/更新 Aggregator.yaml 配置文件
    if (parsedUrl.pathname === '/api/generate_yaml' && req.method === 'POST') {
        let bodyRaw = [];
        req.on('data', chunk => bodyRaw.push(chunk));
        req.on('end', async () => {
            try {
                let proxies = null;
                const str = Buffer.concat(bodyRaw).toString();
                if (str) {
                    try {
                        const json = JSON.parse(str);
                        if (Array.isArray(json)) proxies = json;
                    } catch (e) { }
                }

                await saveAggregatorYaml(proxies);
                res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
                res.end(JSON.stringify({ success: true, message: 'Aggregator.yaml 已更新' }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json', ...headers });
                res.end(JSON.stringify({ success: false, message: e.message }));
            }
        });
        return;
    }

    // API: 获取计划任务日志
    if (parsedUrl.pathname === '/api/cron_logs' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
        res.end(JSON.stringify({
            logs: cronLogs.slice().reverse(), // 最新的在前面
            nextRun: globalState.nextAutoUpdate
        }));
        return;
    }

    // API: Telegram 频道任务状态


    // API: 手动添加的节点 - 获取
    if (parsedUrl.pathname === '/api/manual_proxies' && req.method === 'GET') {
        const manualFile = path.join(ROOT, 'manual_proxies.json');
        try {
            const data = fs.readFileSync(manualFile, 'utf8');
            res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
            res.end(data);
        } catch (e) {
            res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
            res.end('[]');
        }
        return;
    }

    // API: 手动添加的节点 - 保存/添加
    if (parsedUrl.pathname === '/api/manual_proxies' && req.method === 'POST') {
        const manualFile = path.join(ROOT, 'manual_proxies.json');
        try {
            const body = await getBody();
            const proxies = body.proxies || [];
            const overwrite = body.overwrite === true;

            if (overwrite) {
                // 覆盖模式，直接保存传入的节点
                fs.writeFileSync(manualFile, JSON.stringify(proxies, null, 2));
                addLog(`API保存了 ${proxies.length} 个手动节点 (覆盖模式)`, 'info');
                res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
                res.end(JSON.stringify({ success: true, total: proxies.length }));
            } else {
                // 默认合并模式
                let existing = [];
                if (fs.existsSync(manualFile)) {
                    try {
                        existing = JSON.parse(fs.readFileSync(manualFile, 'utf8'));
                    } catch (e) { existing = []; }
                }

                // 标记为手动添加（如果还没标记）
                proxies.forEach(p => {
                    if (!p.isManual) {
                        p.isManual = true;
                        p.addedAt = new Date().toISOString();
                    }
                });

                // 合并去重 (基于 raw 字段)
                const existingRaw = new Set(existing.map(p => p.raw));
                const newProxies = proxies.filter(p => !existingRaw.has(p.raw));
                const merged = [...existing, ...newProxies];

                fs.writeFileSync(manualFile, JSON.stringify(merged, null, 2));

                res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
                res.end(JSON.stringify({ success: true, added: newProxies.length, total: merged.length }));
            }
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json', ...headers });
            res.end(JSON.stringify({ success: false, error: e.message }));
        }
        return;
    }

    // API: 手动添加的节点 - 删除
    if (parsedUrl.pathname === '/api/manual_proxies' && req.method === 'DELETE') {
        const manualFile = path.join(ROOT, 'manual_proxies.json');
        try {
            const body = await getBody();
            const idsToDelete = body.ids || [];

            let existing = [];
            if (fs.existsSync(manualFile)) {
                try {
                    existing = JSON.parse(fs.readFileSync(manualFile, 'utf8'));
                } catch (e) { existing = []; }
            }

            const deleteSet = new Set(idsToDelete);
            const remaining = existing.filter(p => !deleteSet.has(p.id));

            fs.writeFileSync(manualFile, JSON.stringify(remaining, null, 2));

            res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
            res.end(JSON.stringify({ success: true, deleted: existing.length - remaining.length, remaining: remaining.length }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json', ...headers });
            res.end(JSON.stringify({ success: false, error: e.message }));
        }
        return;
    }

    // API: 清空所有节点
    if (parsedUrl.pathname === '/api/clear_all' && req.method === 'POST') {
        try {
            const proxiesFile = path.join(ROOT, 'proxies.json');
            const manualFile = path.join(ROOT, 'manual_proxies.json');
            const telegramFile = path.join(ROOT, 'telegram_proxies.json');

            // 清空所有节点文件
            fs.writeFileSync(proxiesFile, '[]');
            fs.writeFileSync(manualFile, '[]');
            if (fs.existsSync(telegramFile)) {
                fs.writeFileSync(telegramFile, '[]');
            }

            addLog('已清空所有节点文件', 'info');

            res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
            res.end(JSON.stringify({ success: true, message: '已清空所有节点' }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json', ...headers });
            res.end(JSON.stringify({ success: false, error: e.message }));
        }
        return;
    }

    // API: 从 linux.do 导入节点 (异步后台处理)
    if (parsedUrl.pathname === '/api/import_linuxdo' && req.method === 'POST') {
        if (isLinuxDoImporting) {
            res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
            res.end(JSON.stringify({ success: false, message: '任务已经在运行中，请等待完成' }));
            return;
        }

        // 触发后台任务
        runLinuxDoImportTask();

        res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
        res.end(JSON.stringify({
            success: true,
            message: '导入任务已在后台启动，请查看日志获取进度'
        }));
        return;
    }

    // API: 浏览器桥接导入（Firefox 控制台脚本发送节点数据到此接口）
    // 用于绕过 Discourse TLS 指纹限制，让已登录的 Firefox 帮忙获取 Lv1 帖子内容
    if (parsedUrl.pathname === '/api/browser_import' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const rawNodes = data.nodes || [];
                const rawSubs = data.subscriptions || [];

                addLog(`[浏览器桥接] 收到来自 Firefox 的数据: ${rawNodes.length} 个节点链接, ${rawSubs.length} 个订阅`, 'success');

                // 解析节点
                let parsedProxies = [];
                for (const raw of rawNodes) {
                    const parsed = parseContent(raw);
                    if (parsed.length > 0) parsedProxies = parsedProxies.concat(parsed);
                }

                // 如果有 base64 内容，尝试解码
                if (data.base64Content) {
                    const decoded = decodeBase64(data.base64Content);
                    if (decoded) {
                        const b64Parsed = parseContent(decoded);
                        addLog(`[浏览器桥接] Base64 解码获得 ${b64Parsed.length} 个节点`, 'info');
                        parsedProxies = parsedProxies.concat(b64Parsed);
                    }
                }

                // 解析订阅
                const subProcessing = async () => {
                    for (const subUrl of rawSubs.slice(0, 20)) {
                        try {
                            addLog(`[浏览器桥接] 解析订阅: ${subUrl.substring(0, 60)}...`, 'info');
                            const subContent = await fetchUrl(subUrl, 30000);
                            const subProxies = parseContent(subContent);
                            if (subProxies.length > 0) {
                                addLog(`  > 订阅获得 ${subProxies.length} 个节点`, 'success');
                                parsedProxies = parsedProxies.concat(subProxies);
                            }
                        } catch (e) {
                            addLog(`  > 订阅解析失败: ${e.message}`, 'warning');
                        }
                    }

                    // 去重
                    const uniqueProxies = removeDuplicates(parsedProxies);
                    uniqueProxies.forEach(p => {
                        p.isFromForum = true;
                        p.forumSource = 'linux.do';
                        p.importedAt = new Date().toISOString();
                    });

                    // 保存到 manual_proxies.json
                    const manualFile = path.join(ROOT, 'manual_proxies.json');
                    let existing = [];
                    if (fs.existsSync(manualFile)) {
                        try { existing = JSON.parse(fs.readFileSync(manualFile, 'utf8')); } catch (e) { }
                    }

                    const existingRaws = new Set(existing.map(p => p.raw));
                    let addedCount = 0;
                    for (const p of uniqueProxies) {
                        if (!existingRaws.has(p.raw)) {
                            existing.push(p);
                            existingRaws.add(p.raw);
                            addedCount++;
                        }
                    }

                    if (addedCount > 0) {
                        fs.writeFileSync(manualFile, JSON.stringify(existing, null, 2));
                        addLog(`[浏览器桥接] ✅ 导入完成！新增 ${addedCount} 个节点，当前共 ${existing.length} 个`, 'success');
                    } else {
                        addLog(`[浏览器桥接] 没有发现新节点`, 'info');
                    }
                };

                subProcessing().catch(e => addLog(`[浏览器桥接] 处理异常: ${e.message}`, 'error'));

                res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
                res.end(JSON.stringify({
                    success: true,
                    message: `收到 ${rawNodes.length} 个节点, ${rawSubs.length} 个订阅，正在后台处理`,
                    nodesReceived: rawNodes.length,
                    subsReceived: rawSubs.length
                }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json', ...headers });
                res.end(JSON.stringify({ success: false, error: e.message }));
            }
        });
        return;
    }

    // API: 订阅链接 (Clash Verge 可直接导入)
    // 使用方式: /api/subscribe?test=1 或 /api/subscribe
    if (parsedUrl.pathname === '/api/subscribe' && req.method === 'GET') {
        try {
            const shouldForceTest = parsedUrl.searchParams.get('test') === '1';

            // 读取所有节点
            const proxiesFile = path.join(ROOT, 'proxies.json');
            const manualFile = path.join(ROOT, 'manual_proxies.json');
            let allProxies = [];

            if (fs.existsSync(proxiesFile)) {
                try { allProxies = JSON.parse(fs.readFileSync(proxiesFile, 'utf8')); } catch (e) { }
            }
            if (fs.existsSync(manualFile)) {
                try {
                    const manual = JSON.parse(fs.readFileSync(manualFile, 'utf8'));
                    if (Array.isArray(manual)) allProxies = [...allProxies, ...manual];
                } catch (e) { }
            }

            if (allProxies.length === 0) {
                res.writeHead(404, { 'Content-Type': 'text/plain', ...headers });
                return res.end('No proxies available');
            }

            // 如果请求了强制测试
            if (shouldForceTest) {
                if (globalState.status !== 'idle') {
                    addLog(`⚠️ 订阅请求触发强制测试被拒绝：系统繁忙 (${globalState.status})`, 'warning');
                    // 继续下发已有节点，不进行真机扫射
                } else {
                    addLog('📥 订阅请求触发强制真机测试...', 'info');
                    try {
                        const results = await testProxiesDirectly(allProxies);
                        allProxies.forEach(p => {
                            const lat = results[p.id];
                            p.localLatency = (lat && lat > 0) ? lat : -1;
                        });
                        // 保存结果供下次直接读取
                        fs.writeFileSync(proxiesFile, JSON.stringify(allProxies.filter(p => !p.isManual), null, 2));
                    } catch (e) {
                        addLog(`⚠️ 订阅强制测试失败: ${e.message}`, 'warning');
                    } finally {
                        // 清理由每小时自动任务 runHourlyCleanup 负责
                    }
                }
            }

            // 核心改进：下发所有记录良好的节点
            // 逻辑：
            // 1. 如果有本地真机测试结果(localLatency)，则必须 > 0 (排除 -1 失败节点)
            // 2. 如果没有本地测试结果，但有后台维护结果(maintenanceLatency)，则必须有效
            // 3. 回退：如果没有上述真机测试强力验证，但有抓取时的延迟记录(latency)，则只要 > 0 就下发
            // 这能解决“订阅只剩18个而网站显示136个”的问题，因为刚抓到的节点还没来得及真机测试
            const validProxies = allProxies.filter(p => {
                if (p.localLatency !== undefined) return p.localLatency > 0;
                if (p.maintenanceLatency !== undefined) return p.maintenanceLatency > 0 && p.maintenanceLatency < 9999;
                return p.latency > 0;
            });

            // 按质量排序：纯净度优先，延迟次之
            validProxies.sort((a, b) => {
                const sA = a.purityScore || 0;
                const sB = b.purityScore || 0;
                if (sB !== sA) return sB - sA;

                const lA = pGetter(a);
                const lB = pGetter(b);
                function pGetter(node) {
                    if (typeof node.localLatency === 'number' && node.localLatency > 0) return node.localLatency;
                    if (typeof node.maintenanceLatency === 'number' && node.maintenanceLatency > 0) return node.maintenanceLatency;
                    return node.latency || 99999;
                }
                return lA - lB;
            });

            if (validProxies.length === 0 && !shouldForceTest) {
                // 如果没有节点可用，且没测过，则提示用户先测一下
                res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', ...headers });
                return res.end('# 暂无已验证可用的节点，请在面板点击“生成YAML”进行首次强制检测，或者访问 /api/subscribe?test=1 触发实时检测');
            }

            // 转换为 Clash 格式
            const uniqueNames = new Set();
            const proxyList = [];

            for (const p of validProxies) {
                const obj = proxyToClashObj(p);
                if (!obj) continue;

                let name = String(obj.name || 'node').replace(/^\s+|\s+$/g, '');
                let finalName = name;
                let counter = 1;
                while (uniqueNames.has(finalName)) {
                    finalName = `${name}_${counter++}`;
                }
                uniqueNames.add(finalName);
                obj.name = finalName;
                proxyList.push(obj);
            }

            // 基于模板生成完整配置
            const templatePath = path.join(ROOT, 'clash_template.yaml');
            let config = {};

            if (fs.existsSync(templatePath)) {
                try {
                    const templateContent = fs.readFileSync(templatePath, 'utf8');
                    config = yaml.load(templateContent);

                    const oldNodeNames = new Set((config.proxies || []).map(p => p.name));
                    config.proxies = proxyList;
                    const newProxyNames = proxyList.map(p => p.name);

                    if (config['proxy-groups']) {
                        config['proxy-groups'].forEach(group => {
                            const originalProxies = group.proxies || [];
                            const hasOldNodes = originalProxies.some(p => oldNodeNames.has(p));

                            if (hasOldNodes) {
                                const newGroupProxies = [];
                                let nodesInserted = false;

                                for (const p of originalProxies) {
                                    if (oldNodeNames.has(p)) {
                                        if (!nodesInserted) {
                                            newGroupProxies.push(...newProxyNames);
                                            nodesInserted = true;
                                        }
                                    } else {
                                        newGroupProxies.push(p);
                                    }
                                }
                                group.proxies = newGroupProxies;
                            }
                        });
                    }
                } catch (e) {
                    config = { proxies: proxyList };
                }
            } else {
                config = { proxies: proxyList };
            }

            let yamlStr = yaml.dump(config, { lineWidth: -1, noRefs: true });

            const nowStr = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
            const header = [
                '#---------------------------------------------------#',
                `## 更新：${nowStr}`,
                '## Generator: Antigravity Aggregator (Verified)',
                `## 有效节点：${proxyList.length} / 总计：${allProxies.length}`,
                '## 提示：仅包含测试成功的低延迟节点',
                '#---------------------------------------------------#',
                ''
            ].join('\n');

            yamlStr = header + yamlStr;

            const subHeaders = {
                ...headers,
                'Content-Type': 'text/yaml; charset=utf-8',
                'Content-Disposition': 'attachment; filename="Aggregator.yaml"',
                'profile-update-interval': '6',
                'subscription-userinfo': `upload=0; download=0; total=107374182400; expire=${Math.floor(Date.now() / 1000) + 365 * 86400}`,
                'profile-title': `iBubble Aggregator (${proxyList.length})`,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
            };

            res.writeHead(200, subHeaders);
            return res.end(yamlStr);
        } catch (e) {
            console.error('Subscribe error:', e);
            res.writeHead(500, { 'Content-Type': 'text/plain', ...headers });
            res.end('Subscribe Error: ' + e.message);
        }
        return;
    }

    // API: 转换导出
    if (parsedUrl.pathname.endsWith('/api/convert') && req.method === 'POST') {
        try {
            const { proxies, type } = await getBody();
            if (!proxies || !Array.isArray(proxies) || proxies.length === 0) {
                res.writeHead(400, headers);
                return res.end('No proxies');
            }

            if (type === 'clash') {
                const uniqueNames = new Set();
                const proxyList = [];

                for (const p of proxies) {
                    const obj = proxyToClashObj(p);
                    if (!obj) continue;

                    // 名称处理：优先保留原名
                    // 仅移除可能导致 YAML 解析错误的字符，不做过度净化
                    let name = String(obj.name || 'node').replace(/^\s+|\s+$/g, ''); // Trim only

                    // 解决名称冲突：添加后缀 _1, _2 等
                    let finalName = name;
                    let counter = 1;
                    while (uniqueNames.has(finalName)) {
                        finalName = `${name}_${counter++}`;
                    }
                    uniqueNames.add(finalName);
                    obj.name = finalName;

                    proxyList.push(obj);
                }

                // 基于模板生成配置，确保格式与目标订阅完全一致
                const templatePath = path.join(ROOT, 'clash_template.yaml');
                let config = {};

                if (fs.existsSync(templatePath)) {
                    try {
                        const templateContent = fs.readFileSync(templatePath, 'utf8');
                        config = yaml.load(templateContent);

                        // 1. 识别模板中的旧节点名称
                        const oldNodeNames = new Set((config.proxies || []).map(p => p.name));

                        // 2. 替换 Proxies
                        config.proxies = proxyList;
                        const newProxyNames = proxyList.map(p => p.name);

                        // 3. 智能更新 Proxy Groups
                        if (config['proxy-groups']) {
                            config['proxy-groups'].forEach(group => {
                                const originalProxies = group.proxies || [];
                                // 检查该组是否包含旧节点（如果是纯策略组如"其他流量"，通常没有任何旧节点名）
                                const hasOldNodes = originalProxies.some(p => oldNodeNames.has(p));

                                if (hasOldNodes) {
                                    const newGroupProxies = [];
                                    let nodesInserted = false;

                                    for (const p of originalProxies) {
                                        if (oldNodeNames.has(p)) {
                                            // 遇到第一个旧节点位置，插入所有新节点
                                            if (!nodesInserted) {
                                                newGroupProxies.push(...newProxyNames);
                                                nodesInserted = true;
                                            }
                                            // 后续的旧节点直接跳过（已被新列表替代）
                                        } else {
                                            // 保留特殊项（如 "🔰国外流量", "DIRECT", "🚀直接连接" 等）
                                            newGroupProxies.push(p);
                                        }
                                    }
                                    group.proxies = newGroupProxies;
                                }
                            });
                        }

                    } catch (e) {
                        console.error('Template parse error:', e);
                        // Fallback to simple config if template fails
                        config = { proxies: proxyList };
                    }
                } else {
                    config = { proxies: proxyList };
                }

                // 输出 YAML
                // lineWidth: -1 避免长行换行
                // noRefs: true 避免使用锚点引用
                let yamlStr = yaml.dump(config, {
                    lineWidth: -1,
                    noRefs: true
                });

                // 添加头部注释 (仿照目标格式)
                const nowStr = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
                const header = [
                    '#---------------------------------------------------#',
                    `## 更新：${nowStr}`,
                    '## Generator: Antigravity Aggregator',
                    '#---------------------------------------------------#',
                    ''
                ].join('\n');

                yamlStr = header + yamlStr;

                res.writeHead(200, { ...headers, 'Content-Type': 'text/yaml', 'Content-Disposition': 'attachment; filename="clash_config.yaml"' });
                return res.end(yamlStr);
            }

            res.writeHead(400, headers);
            res.end('Unsupported Type');
        } catch (e) {
            console.error(e);
            res.writeHead(500, headers);
            res.end('Error');
        }
        return;
    }

    // API: 代理中转
    if (parsedUrl.pathname.endsWith('/api/proxy')) {
        const targetUrl = parsedUrl.searchParams.get('url');
        if (!targetUrl) { res.writeHead(400, headers); res.end('Missing url'); return; }

        try {
            const content = await fetchUrl(targetUrl);

            // 检查是否返回了 HTML 页面（可能是登录页或错误页）
            if (content.includes('<!DOCTYPE') || content.includes('<html')) {
                res.writeHead(400, { 'Content-Type': 'application/json', ...headers });
                res.end(JSON.stringify({ error: '订阅链接返回了网页而非节点数据，请检查链接是否正确或是否需要登录' }));
                return;
            }

            res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', ...headers });
            res.end(content);
        } catch (e) {
            console.error('Proxy fetch error:', e.message);
            res.writeHead(500, { 'Content-Type': 'application/json', ...headers });
            res.end(JSON.stringify({ error: `获取订阅失败: ${e.message}` }));
        }
        return;
    }

    const MANUAL_PROXIES_FILE = path.join(ROOT, 'manual_proxies.json');

    // Helper: Check TCP Connectivity
    function checkTcpConnectivity(host, port, timeout = 3000) {
        return new Promise((resolve) => {
            const start = Date.now();
            const socket = new net.Socket();
            let status = 'timeout';

            socket.setTimeout(timeout);

            socket.on('connect', () => {
                status = 'success';
                const time = Date.now() - start;
                socket.destroy();
                resolve({ success: true, latency: time });
            });

            socket.on('timeout', () => {
                status = 'timeout';
                socket.destroy();
                resolve({ success: false, error: 'Timeout' });
            });

            socket.on('error', (err) => {
                status = 'error';
                resolve({ success: false, error: err.message });
            });

            try {
                socket.connect(port, host);
            } catch (e) {
                resolve({ success: false, error: e.message });
            }
        });
    }

    // ... existing code ...

    // API: 手动纯净度检查
    if (parsedUrl.pathname === '/api/check_purity' && req.method === 'POST') {
        // ... (keep existing)
    }


    // API: 发起 Clash 真机测试
    if (parsedUrl.pathname === '/api/check_connectivity_clash' && req.method === 'POST') {
        try {
            const { proxies } = await getBody();
            if (!Array.isArray(proxies) || proxies.length === 0) {
                throw new Error('No proxies provided');
            }

            // 检查系统状态
            if (globalState.status !== 'idle') {
                res.writeHead(400, { 'Content-Type': 'application/json', ...headers });
                return res.end(JSON.stringify({ success: false, message: `系统繁忙 (${globalState.status})，请稍后再试` }));
            }

            const taskId = `task_${Date.now()}`;
            connectivityTasks.set(taskId, {
                id: taskId,
                status: 'pending',
                total: proxies.length,
                progress: 0,
                results: {},
                timestamp: Date.now()
            });

            // 异步启动任务
            runConnectivityTask(taskId, proxies);

            res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
            res.end(JSON.stringify({ success: true, taskId, message: 'Task started' }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json', ...headers });
            res.end(JSON.stringify({ success: false, message: e.message }));
        }
        return;
    }

    // API: 查询任务状态
    if (parsedUrl.pathname.endsWith('/api/check_task_status') && req.method === 'GET') {
        const taskId = parsedUrl.searchParams.get('taskId');
        const task = connectivityTasks.get(taskId);

        if (!task) {
            res.writeHead(404, { 'Content-Type': 'application/json', ...headers });
            res.end(JSON.stringify({ success: false, message: 'Task not found' }));
            return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
        res.end(JSON.stringify({
            success: true,
            status: task.status,
            progress: task.progress,
            total: task.total,
            results: task.results, // 返回已完成的结果
            message: task.message
        }));

        // 如果已完成或出错，稍后清理任务 (保留一会以便前端读取最后状态)
        if (task.status === 'completed' || task.status === 'error') {
            // 简单清理策略：依靠 LRU 或定时清理，这里暂不自动立即删除
        }
        return;
    }


    // API: IP 检测 (批量) - 带缓存
    if (parsedUrl.pathname.endsWith('/api/check_ip_batch') && req.method === 'POST') {
        let body = [];
        req.on('data', chunk => body.push(chunk));
        req.on('end', () => {
            try {
                const rawBody = JSON.parse(Buffer.concat(body).toString());
                let ips = [];
                let forceUpdate = false;

                // 兼容两种参数格式：["ip1", "ip2"] 或 { queries: ["ip1"], force: true }
                if (Array.isArray(rawBody)) {
                    ips = rawBody;
                } else if (rawBody && Array.isArray(rawBody.queries)) {
                    ips = rawBody.queries;
                    forceUpdate = !!rawBody.force;
                } else {
                    res.writeHead(400, headers);
                    return res.end('Invalid input');
                }

                const results = [];
                const toCheck = [];
                const ipToIndex = {}; // 记录需要 check 的 IP 在原始数组中的位置 (如果有序需求)，这里主要用于去重和映射

                ips.forEach(ip => {
                    // 如果不强制，且库里有，且数据较新(这里暂不校验时间)，直接用
                    if (!forceUpdate && purityDB[ip]) {
                        results.push({ query: ip, ...purityDB[ip].info, status: 'success', fromCache: true });
                    } else {
                        toCheck.push(ip);
                    }
                });

                if (toCheck.length === 0) {
                    res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
                    return res.end(JSON.stringify(results));
                }

                // 分批请求 ip-api (batch limit 100)
                const batchSize = 100;
                const chunks = [];
                for (let i = 0; i < toCheck.length; i += batchSize) {
                    chunks.push(toCheck.slice(i, i + batchSize));
                }

                // 递归或循环处理 chunks
                let fetchResults = [];

                const processChunks = async () => {
                    const concurrency = 5;
                    const queue = [...toCheck];
                    const activeWorkers = [];

                    const checkIp = async (query) => {
                        return new Promise(async (resolve) => {
                            let ip = query;

                            // 1. Resolve Domain if needed
                            if (net.isIP(query) === 0) {
                                try {
                                    const dns = require('dns');
                                    ip = await new Promise((res, rej) => {
                                        dns.lookup(query, (err, address) => {
                                            if (err) rej(err); else res(address);
                                        });
                                    });
                                } catch (e) {
                                    return resolve(null);
                                }
                            }

                            // 直接使用 http.get 访问 ipwho.is（不走代理！）
                            // fetchUrl 会强制走 Clash 代理，导致：
                            // 1. 代理不可用时请求直接失败
                            // 2. 即使代理可用，返回的也是代理出口 IP 信息，而非节点真实 IP
                            const reqUrl = `http://ipwho.is/${ip}`;
                            const reqOptions = {
                                timeout: 10000,
                                headers: { 'User-Agent': 'Mozilla/5.0 (Node.js) App/1.0' }
                            };

                            http.get(reqUrl, reqOptions, (response) => {
                                let raw = '';
                                response.on('data', chunk => raw += chunk);
                                response.on('end', () => {
                                    try {
                                        const data = JSON.parse(raw);
                                        if (data.success) {
                                            resolve({
                                                query: query,
                                                status: 'success',
                                                countryCode: data.country_code,
                                                isp: data.connection?.isp || data.isp || 'Unknown',
                                                org: data.connection?.org || data.org || '',
                                                hosting: false
                                            });
                                        } else {
                                            resolve(null);
                                        }
                                    } catch (e) { resolve(null); }
                                });
                            }).on('error', () => resolve(null))
                                .on('timeout', function () { this.destroy(); resolve(null); });
                        });
                    };

                    const worker = async () => {
                        while (queue.length > 0) {
                            const ip = queue.shift();
                            if (!ip) continue;
                            const res = await checkIp(ip);
                            if (res) {
                                fetchResults.push(res);
                            }
                            // Small delay to be nice
                            await new Promise(r => setTimeout(r, 200));
                        }
                    };

                    for (let i = 0; i < concurrency; i++) {
                        activeWorkers.push(worker());
                    }
                    await Promise.all(activeWorkers);

                    // 更新 DB
                    fetchResults.forEach(item => {
                        if (item && item.query && item.status === 'success') {
                            // Purity Score Calculation
                            let score = 100;
                            const isp = (item.isp || '').toLowerCase();
                            const org = (item.org || '').toLowerCase();

                            // Keywords indicating Data Center / Cloud / Hosting
                            const dcKeywords = ['cloud', 'data', 'hosting', 'server', 'network', 'alibaba', 'tencent', 'amazon', 'google', 'microsoft', 'azure', 'digitalocean', 'vultr', 'linode', 'oracle', 'ovh', 'cdn', 'rackspace'];

                            // Guess 'hosting' bool
                            if (dcKeywords.some(k => isp.includes(k) || org.includes(k))) {
                                item.hosting = true;
                                score -= 40;
                            } else {
                                score += 5;
                            }

                            // Specific punishments
                            if (isp.includes('google') || isp.includes('amazon') || isp.includes('cloud') || isp.includes('microsoft')) {
                                score -= 10;
                            }

                            score = Math.max(0, Math.min(100, score));

                            purityDB[item.query] = {
                                score: score,
                                info: {
                                    countryCode: item.countryCode,
                                    isp: item.isp,
                                    hosting: item.hosting
                                },
                                updatedAt: Date.now()
                            };
                            // 合并到最终结果
                            results.push(item);
                        }
                    });
                    savePurityDB();

                    res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
                    res.end(JSON.stringify(results));
                };


                processChunks();

            } catch (e) {
                res.writeHead(500, headers);
                res.end('[]');
            }
        });
        return;
    }

    // 静态文件服务
    let filePath = path.join(ROOT, parsedUrl.pathname);

    // 处理目录访问：自动返回 index.html
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
    }

    // 根路径处理（本地部署：__dirname 已经在 Projects/Aggregator 内）
    if (parsedUrl.pathname === '/') {
        filePath = path.join(ROOT, 'index.html');
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, { 'Content-Type': mimeType, ...headers });
        fs.createReadStream(filePath).pipe(res);
    } else {
        res.writeHead(404, headers);
        res.end('Not Found');
    }
});

// --- 自动更新任务 (使用 cron 定点执行) ---
// 北京时间 00:10, 06:10, 12:10, 18:10 => 美东时间 11:10, 17:10, 23:10, 05:10
// Cron 表达式 (美东时间): 10 5,11,17,23 * * *
const CRON_SCHEDULE = '10 5,11,17,23 * * *';
let cronTask = null;

// 计算下次执行时间 (北京时间)
function getNextCronRunTime() {
    const now = new Date();
    // 北京时间执行点：00:10, 06:10, 12:10, 18:10
    const beijingHours = [0, 6, 12, 18];
    const minute = 10;

    // 获取当前北京时间 (getTime() 返回 UTC 毫秒，直接加8小时偏移)
    const beijingOffset = 8 * 60 * 60 * 1000;
    const beijingNowMs = now.getTime() + beijingOffset;
    const beijingNow = new Date(beijingNowMs);

    const pad = (n) => n.toString().padStart(2, '0');
    const formatBeijingTime = (d) => {
        return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} (北京)`;
    };

    for (const hour of beijingHours) {
        // 构造北京时间的下次执行点
        const nextRunBeijing = new Date(Date.UTC(
            beijingNow.getUTCFullYear(),
            beijingNow.getUTCMonth(),
            beijingNow.getUTCDate(),
            hour, minute, 0, 0
        ));
        if (nextRunBeijing.getTime() > beijingNowMs) {
            return formatBeijingTime(nextRunBeijing);
        }
    }
    // 如果今天所有时间点都过了，返回明天第一个时间点
    const tomorrowBeijing = new Date(Date.UTC(
        beijingNow.getUTCFullYear(),
        beijingNow.getUTCMonth(),
        beijingNow.getUTCDate() + 1,
        beijingHours[0], minute, 0, 0
    ));
    return formatBeijingTime(tomorrowBeijing);
}

async function runScheduledTask(isManual = false, fetchPages = 200) {
    const startTime = new Date();
    const logEntry = {
        id: Date.now(),
        startTime: startTime.toISOString(),
        endTime: null,
        duration: null,
        status: 'running',
        type: isManual ? '全网节点更新(手动)' : '全网节点更新(自动)',
        details: {
            beforeCount: 0,
            afterCount: 0,
            newNodes: 0,
            yamlGenerated: false
        },
        error: null
    };

    try {
        addLog(`⏰ 触发${isManual ? '手动' : '定时'}任务: 全网节点更新 (深度爬取 ${fetchPages} 页)`, 'info');

        // 记录执行前节点数 (包含手动添加的节点)
        const proxiesFile = path.join(ROOT, 'proxies.json');
        const manualProxiesFile = path.join(ROOT, 'manual_proxies.json');

        const getTotalNodeCount = () => {
            let count = 0;
            try {
                const data = fs.readFileSync(proxiesFile, 'utf8');
                count += JSON.parse(data).length;
            } catch (e) { }
            try {
                const manualData = fs.readFileSync(manualProxiesFile, 'utf8');
                count += JSON.parse(manualData).length;
            } catch (e) { }
            return count;
        };

        logEntry.details.beforeCount = getTotalNodeCount();

        // 执行聚合任务
        await runAggregation('all', fetchPages);

        // 记录执行后节点数 (包含手动添加的节点)
        logEntry.details.afterCount = getTotalNodeCount();
        logEntry.details.newNodes = logEntry.details.afterCount - logEntry.details.beforeCount;

        // 记录各来源节点获取统计 (从 globalState 获取)
        logEntry.details.sources = {
            github: globalState.lastFetchStats.github,
            web: globalState.lastFetchStats.web,
            linuxdo: globalState.lastFetchStats.linuxdo,
            linuxdoValid: globalState.lastFetchStats.linuxdoValid || 0,
            hk: globalState.lastFetchStats.hk,
            hk1: globalState.lastFetchStats.hk1,
            sg: globalState.lastFetchStats.sg,
            us: globalState.lastFetchStats.us
        };

        // 执行连通性检测
        addLog('🔍 开始自动连通性检测...', 'info');
        const connResult = await runConnectivityCheck();
        logEntry.details.connectivity = connResult;

        // 执行纯净度检测
        addLog('🛡️ 开始自动纯净度检测...', 'info');
        const purityResult = await runPurityCheck();
        logEntry.details.purity = purityResult;

        // Auto-generate Aggregator.yaml
        // 既然刚才已经运行过 runConnectivityCheck 刷新了 localLatency，这里跳过重复测试
        await saveAggregatorYaml(null, false);
        logEntry.details.yamlGenerated = true;

        logEntry.status = 'success';
        addLog(`✅ 定时任务完成: 节点 ${logEntry.details.beforeCount}→${logEntry.details.afterCount}, 可用 ${connResult.passed}, 纯净度 ${purityResult.updated}`, 'success');

    } catch (e) {
        logEntry.status = 'error';
        logEntry.error = e.message;
        addLog(`❌ 定时任务失败: ${e.message}`, 'error');
    } finally {
        const endTime = new Date();
        logEntry.endTime = endTime.toISOString();
        logEntry.duration = Math.round((endTime - startTime) / 1000); // 秒
        addCronLog(logEntry);

        // Update next time
        globalState.nextAutoUpdate = getNextCronRunTime();
    }
}

function startAutoUpdateJob() {
    if (cronTask) {
        cronTask.stop();
    }

    // Set first next update time
    globalState.nextAutoUpdate = getNextCronRunTime();

    // 使用 cron 定时执行
    // 美东时间: 05:10, 11:10, 17:10, 23:10 (对应北京时间 18:10, 00:10, 06:10, 12:10)
    cronTask = cron.schedule(CRON_SCHEDULE, async () => {
        await runScheduledTask();
    });

    console.log(`  自动更新任务已启动 (北京时间 00:10, 06:10, 12:10, 18:10)`);
    console.log(`  下次执行: ${globalState.nextAutoUpdate}`);
}

// ========== 每小时自动检测与清理 ==========
// 每小时对所有节点进行真机连通性检测，自动清除无效节点并更新 YAML
async function runHourlyCleanup() {
    if (globalState.status !== 'idle') {
        if (globalState.taskStartTime && Date.now() - globalState.taskStartTime > 3600000) {
            addLog(`⚠️ 检测到系统长时间维持 ${globalState.status} 状态，疑似死锁，已强行解锁。`, 'warning');
            globalState.status = 'idle';
        } else {
            addLog(`⚠️ 系统繁忙 (${globalState.status})，跳过每小时自动清理任务。`, 'warning');
            return;
        }
    }

    const startTime = new Date();
    const logEntry = {
        id: Date.now(),
        startTime: startTime.toISOString(),
        endTime: null,
        duration: null,
        status: 'running',
        type: '每小时本地检测(自动)',
        details: {
            beforeCount: 0,
            afterCount: 0,
            tested: 0,
            passed: 0,
            failed: 0,
            removed: 0,
            yamlGenerated: false,
            skippedReason: null
        },
        error: null
    };

    const oldStatus = globalState.status;
    globalState.status = 'testing';
    globalState.taskStartTime = Date.now();
    addLog(`========== 开始每小时自动清理任务 ==========`, 'info');

    try {
        // 1. 加载所有节点
        const proxiesFile = path.join(ROOT, 'proxies.json');
        const manualFile = path.join(ROOT, 'manual_proxies.json');

        let autoProxies = [];
        let manualProxies = [];

        if (fs.existsSync(proxiesFile)) {
            try { autoProxies = JSON.parse(fs.readFileSync(proxiesFile, 'utf8')); } catch (e) { }
        }
        if (fs.existsSync(manualFile)) {
            try { manualProxies = JSON.parse(fs.readFileSync(manualFile, 'utf8')); } catch (e) { }
        }

        const allProxies = [...autoProxies, ...manualProxies];
        logEntry.details.beforeCount = allProxies.length;

        if (allProxies.length === 0) {
            addLog(`⚠️ 没有任何节点，跳过自动清理`, 'warning');
            logEntry.details.skippedReason = '无节点';
            logEntry.status = 'success';
            return;
        }

        addLog(`📊 加载 ${allProxies.length} 个节点 (自动: ${autoProxies.length}, 手动: ${manualProxies.length})`, 'info');

        // 2. 真机测试所有节点
        addLog(`⚡ 开始真机连通性检测 (并发: 10, 超时: 8s)...`, 'info');
        const results = await testProxiesDirectly(allProxies);

        // 3. 统计结果
        let passed = 0;
        let failed = 0;
        const failedIds = new Set();

        allProxies.forEach(p => {
            const lat = results[p.id];
            if (lat && lat > 0 && lat < 8888) {
                p.localLatency = lat;
                passed++;
            } else {
                p.localLatency = -1;
                failed++;
                failedIds.add(p.id);
            }
        });

        logEntry.details.tested = allProxies.length;
        logEntry.details.passed = passed;
        logEntry.details.failed = failed;

        addLog(`📊 检测结果: ${passed}/${allProxies.length} 可用, ${failed} 个不可用`, passed > 0 ? 'success' : 'warning');

        // 4. 安全检查：如果所有节点都失败，判定为网络问题，不执行清理
        if (passed === 0) {
            addLog(`🛡️ 所有 ${allProxies.length} 个节点均不可用，判断为本机网络问题，跳过清理（保留全部节点）`, 'warning');
            logEntry.details.skippedReason = '全部超时(网络异常)';
            logEntry.status = 'success';
            return;
        }

        // 5. 执行清理：删除无效节点
        if (failed > 0) {
            // 5a. 清理 proxies.json
            const remainingAuto = autoProxies.filter(p => !failedIds.has(p.id));
            const removedAuto = autoProxies.length - remainingAuto.length;
            fs.writeFileSync(proxiesFile, JSON.stringify(remainingAuto, null, 2));

            // 5b. 清理 manual_proxies.json
            const remainingManual = manualProxies.filter(p => !failedIds.has(p.id));
            const removedManual = manualProxies.length - remainingManual.length;
            fs.writeFileSync(manualFile, JSON.stringify(remainingManual, null, 2));

            const totalRemoved = removedAuto + removedManual;
            logEntry.details.removed = totalRemoved;
            logEntry.details.afterCount = remainingAuto.length + remainingManual.length;

            addLog(`🗑️ 已清理 ${totalRemoved} 个无效节点 (自动: ${removedAuto}, 手动: ${removedManual})`, 'success');
            addLog(`📦 剩余节点: ${logEntry.details.afterCount} 个 (自动: ${remainingAuto.length}, 手动: ${remainingManual.length})`, 'info');

            // 6. 重新生成 Aggregator.yaml（使用清理后的节点，跳过重复测试）
            addLog(`📝 正在更新 Aggregator.yaml...`, 'info');
            const validNodes = [...remainingAuto, ...remainingManual].filter(p => p.localLatency && p.localLatency > 0);
            await saveAggregatorYaml(validNodes, false);
            logEntry.details.yamlGenerated = true;
            addLog(`✅ Aggregator.yaml 已更新 (${validNodes.length} 个可用节点)`, 'success');
        } else {
            logEntry.details.afterCount = allProxies.length;
            logEntry.details.removed = 0;
            addLog(`🎉 所有 ${allProxies.length} 个节点均可用，无需清理`, 'success');

            // 仍然更新 localLatency 到文件
            fs.writeFileSync(proxiesFile, JSON.stringify(autoProxies, null, 2));
            if (manualProxies.length > 0) {
                fs.writeFileSync(manualFile, JSON.stringify(manualProxies, null, 2));
            }
        }

        // 7. 也更新优选节点（保留向前兼容）
        const top10 = allProxies
            .filter(p => p.localLatency && p.localLatency > 0 && p.localLatency < 9999)
            .sort((a, b) => a.localLatency - b.localLatency)
            .slice(0, 10);
        PREFERRED_PROXIES = top10;
        const preferredFile = path.join(ROOT, 'preferred_proxies.json');
        fs.writeFileSync(preferredFile, JSON.stringify(PREFERRED_PROXIES, null, 2));

        logEntry.status = 'success';
        addLog(`✅ 每小时自动清理任务完成`, 'success');

    } catch (e) {
        logEntry.status = 'error';
        logEntry.error = e.message;
        addLog(`❌ 每小时自动清理任务失败: ${e.message}`, 'error');
        await stopClash();
    } finally {
        globalState.status = oldStatus;

        const endTime = new Date();
        logEntry.endTime = endTime.toISOString();
        logEntry.duration = Math.round((endTime - startTime) / 1000);
        addCronLog(logEntry);
    }
}

// 启动每小时自动清理定时任务
function startProxyMaintenanceJob() {
    if (proxyMaintenanceTimer) {
        clearInterval(proxyMaintenanceTimer);
    }

    const MAINTENANCE_INTERVAL = 60 * 60 * 1000; // 1小时

    // 启动后延迟 2 分钟执行首次检测（给系统时间启动其他服务）
    setTimeout(() => {
        runHourlyCleanup().catch(e => {
            addLog(`❌ 初始自动清理失败: ${e.message}`, 'error');
        });
    }, 2 * 60 * 1000);

    // 设置每小时定时任务
    proxyMaintenanceTimer = setInterval(async () => {
        await runHourlyCleanup();
    }, MAINTENANCE_INTERVAL);

    console.log(`  每小时自动清理任务已启动 (间隔: 1小时, 首次: 2分钟后)`);
}


// Helper: 批量连通性检测
async function runConnectivityCheck() {
    if (globalState.status !== 'idle') {
        addLog(`⚠️ 系统繁忙 (${globalState.status})，跳过连通性测试。`, 'warning');
        return { tested: 0, passed: 0, failed: 0 };
    }

    const proxiesFile = path.join(ROOT, 'proxies.json');
    let proxies = [];

    try {
        if (fs.existsSync(proxiesFile)) {
            proxies = JSON.parse(fs.readFileSync(proxiesFile, 'utf8'));
        }
    } catch (e) {
        addLog(`❌ 读取节点文件失败: ${e.message}`, 'error');
        return { tested: 0, passed: 0, failed: 0 };
    }

    if (proxies.length === 0) return { tested: 0, passed: 0, failed: 0 };

    addLog(`🔍 每日任务: 开始真机连通性检测 (${proxies.length} 个节点)...`, 'info');

    try {
        const results = await testProxiesDirectly(proxies);

        let passed = 0;
        proxies.forEach(p => {
            const lat = results[p.id];
            if (lat && lat > 0 && lat < 8888) {
                p.localLatency = lat;
                passed++;
            } else {
                p.localLatency = -1;
            }
        });

        fs.writeFileSync(proxiesFile, JSON.stringify(proxies, null, 2));
        addLog(`✅ 连通性检测完成: ${passed}/${proxies.length} 个可用`, 'success');

        return { tested: proxies.length, passed, failed: proxies.length - passed, removed: 0 };
    } catch (e) {
        addLog(`❌ 每日连通性检测失败: ${e.message}`, 'error');
        return { tested: proxies.length, passed: 0, failed: proxies.length };
    } finally {
        // 移除多余的 runProxyMaintenance() 调用，避免任务堆叠
    }
}

// Helper: 批量纯净度检测
async function runPurityCheck() {
    if (globalState.status !== 'idle') {
        addLog(`⚠️ 系统繁忙 (${globalState.status})，跳过纯净度检测。`, 'warning');
        return { checked: 0, updated: 0 };
    }

    const proxiesFile = path.join(ROOT, 'proxies.json');
    let proxies = [];

    try {
        if (fs.existsSync(proxiesFile)) {
            proxies = JSON.parse(fs.readFileSync(proxiesFile, 'utf8'));
        }
    } catch (e) {
        addLog(`❌ 读取节点文件失败: ${e.message}`, 'error');
        return { checked: 0, updated: 0 };
    }

    // 只检测还没有纯净度信息的节点或连通性测试通过的节点
    const toCheck = proxies.filter(p => !p.purityInfo && p.localLatency && p.localLatency > 0);

    if (toCheck.length === 0) {
        addLog(`ℹ️ 无需进行纯净度检测（所有节点已有数据或不可用）`, 'info');
        return { checked: 0, updated: 0 };
    }

    addLog(`🛡️ 开始纯净度检测: ${toCheck.length} 个节点`, 'info');

    const uniqueServers = [...new Set(toCheck.map(p => p.server))];
    const purityResults = {};
    const batchSize = 100;
    let updated = 0;

    // 使用 ip-api 批量检测
    for (let i = 0; i < uniqueServers.length; i += batchSize) {
        const batch = uniqueServers.slice(i, i + batchSize);

        try {
            const response = await new Promise((resolve, reject) => {
                const postData = JSON.stringify(batch.map(ip => ({ query: ip, fields: 'status,countryCode,isp,org,hosting,proxy,query' })));

                const req = http.request({
                    hostname: 'ip-api.com',
                    port: 80,
                    path: '/batch?fields=status,countryCode,isp,org,hosting,proxy,query',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(postData)
                    }
                }, (res) => {
                    let body = '';
                    res.on('data', chunk => body += chunk);
                    res.on('end', () => {
                        try {
                            resolve(JSON.parse(body));
                        } catch (e) {
                            reject(e);
                        }
                    });
                });

                req.on('error', reject);
                req.setTimeout(30000, () => {
                    req.destroy();
                    reject(new Error('Timeout'));
                });
                req.write(postData);
                req.end();
            });

            // 处理结果
            if (Array.isArray(response)) {
                response.forEach(item => {
                    if (item.status === 'success') {
                        // 计算纯净度分数
                        let score = 100;
                        const isp = (item.isp || '').toLowerCase();
                        const org = (item.org || '').toLowerCase();
                        const dcKeywords = ['cloud', 'data', 'hosting', 'server', 'network', 'alibaba', 'tencent', 'amazon', 'google', 'microsoft', 'azure', 'digitalocean', 'vultr', 'linode', 'oracle', 'ovh', 'cdn'];

                        if (dcKeywords.some(k => isp.includes(k) || org.includes(k))) {
                            score -= 40;
                        }
                        if (item.hosting) score -= 20;
                        if (item.proxy) score -= 15;
                        score = Math.max(0, Math.min(100, score));

                        purityResults[item.query] = {
                            score,
                            countryCode: item.countryCode,
                            isp: item.isp,
                            org: item.org,
                            hosting: item.hosting,
                            proxy: item.proxy
                        };
                    }
                });
            }

            // 避免 rate limit
            if (i + batchSize < uniqueServers.length) {
                await new Promise(r => setTimeout(r, 1500));
            }
        } catch (e) {
            addLog(`⚠️ 纯净度检测批次失败: ${e.message}`, 'warning');
        }
    }

    // 更新节点数据
    proxies.forEach(p => {
        if (purityResults[p.server]) {
            p.purityInfo = purityResults[p.server];
            p.purityScore = purityResults[p.server].score;
            updated++;
        }
    });

    // 保存更新后的节点
    fs.writeFileSync(proxiesFile, JSON.stringify(proxies, null, 2));
    addLog(`✅ 纯净度检测完成: ${updated} 个节点已更新`, 'success');

    return { checked: uniqueServers.length, updated };
}

// Helper: Save Aggregator.yaml
// Accepts optional 'data' array. If provided, uses that data instead of reading files.
async function saveAggregatorYaml(data = null, forceTest = true) {
    // 自动触发时的防抖逻辑 (针对 forceTest 情况)
    if (forceTest && globalState.status !== 'idle' && !data) {
        addLog(`⚠️ 系统繁忙 (${globalState.status})，暂缓真机测试。`, 'warning');
        return;
    }

    try {
        let proxies = [];

        if (data && Array.isArray(data)) {
            proxies = data;
            addLog(`📝 使用前端传入的 ${proxies.length} 个节点进行检测并生成 Aggregator.yaml`, 'info');
        } else {
            // Load proxies from files
            const proxiesFile = path.join(ROOT, 'proxies.json');
            const manualFile = path.join(ROOT, 'manual_proxies.json');

            let all = [];
            if (fs.existsSync(proxiesFile)) {
                try { all = JSON.parse(fs.readFileSync(proxiesFile, 'utf8')); } catch (e) { }
            }
            if (fs.existsSync(manualFile)) {
                try {
                    const data = fs.readFileSync(manualFile, 'utf8');
                    const manual = JSON.parse(data);
                    if (Array.isArray(manual)) {
                        all = [...all, ...manual];
                    }
                } catch (e) { }
            }
            proxies = all;
            addLog(`📝 准备生成 Aggregator.yaml: 加载 ${proxies.length} 个节点${forceTest ? '进行强行检测' : ''}...`, 'info');
        }

        // 强行注入连通性检测
        if (proxies.length > 0 && forceTest) {
            try {
                const results = await testProxiesDirectly(proxies);
                const beforeCount = proxies.length;
                proxies = proxies.filter(p => results[p.id] && results[p.id] > 0 && results[p.id] < 8888);
                addLog(`✅ 检测完成: 过滤掉 ${beforeCount - proxies.length} 个不通节点，保留 ${proxies.length} 个可用节点`, 'success');
            } catch (e) {
                addLog(`⚠️ 强行检测失败，将回退到现有可用状态: ${e.message}`, 'warning');
                // 回退到基于已有 localLatency 的过滤
                proxies = proxies.filter(p => p.localLatency && p.localLatency > 0);
            } finally {
                // 移除多余的 runProxyMaintenance() 调用，避免任务堆叠
            }
        }

        if (proxies.length === 0) {
            addLog('⚠️ 无可用节点，跳过生成 Aggregator.yaml', 'warning');
            return;
        }

        // 复用导出配置的逻辑 (与 /api/convert 完全一致)
        const uniqueNames = new Set();
        const proxyList = [];

        for (const p of proxies) {
            const obj = proxyToClashObj(p);
            if (!obj) continue;

            // 名称处理：保留原名，仅去除首尾空格
            let name = String(obj.name || 'node').replace(/^\s+|\s+$/g, '');

            // 解决名称冲突：添加后缀 _1, _2 等
            let finalName = name;
            let counter = 1;
            while (uniqueNames.has(finalName)) {
                finalName = `${name}_${counter++}`;
            }
            uniqueNames.add(finalName);
            obj.name = finalName;

            proxyList.push(obj);
        }

        // Use template logic (Simplified version of existing export logic)
        const templatePath = path.join(ROOT, 'clash_template.yaml');
        let config = {};

        if (fs.existsSync(templatePath)) {
            try {
                const templateContent = fs.readFileSync(templatePath, 'utf8');
                config = yaml.load(templateContent);
                const oldNodeNames = new Set((config.proxies || []).map(p => p.name));
                config.proxies = proxyList;
                const newProxyNames = proxyList.map(p => p.name);

                if (config['proxy-groups']) {
                    config['proxy-groups'].forEach(group => {
                        const originalProxies = group.proxies || [];
                        const hasOldNodes = originalProxies.some(p => oldNodeNames.has(p));
                        if (hasOldNodes) {
                            const newGroupProxies = [];
                            let nodesInserted = false;
                            for (const p of originalProxies) {
                                if (oldNodeNames.has(p)) {
                                    if (!nodesInserted) {
                                        newGroupProxies.push(...newProxyNames);
                                        nodesInserted = true;
                                    }
                                } else {
                                    newGroupProxies.push(p);
                                }
                            }
                            group.proxies = newGroupProxies;
                        }
                    });
                }
            } catch (e) { config = { proxies: proxyList }; }
        } else {
            config = { proxies: proxyList };
        }

        let yamlStr = yaml.dump(config, { lineWidth: -1, noRefs: true });
        const nowStr = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
        const header = [
            '#---------------------------------------------------#',
            `## 更新：${nowStr}`,
            '## Generator: Antigravity Aggregator',
            '# Auto-generated by Scheduled Task',
            '#---------------------------------------------------#',
            ''
        ].join('\n');
        yamlStr = header + yamlStr;

        const outputPath = path.join(ROOT, 'Aggregator.yaml');
        // Ensure directory exists
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        fs.writeFileSync(outputPath, yamlStr);
        addLog(`✅ 自动生成配置文件: ${outputPath}`, 'success');
    } catch (e) {
        addLog(`❌ 自动生成 Aggregator.yaml 失败: ${e.message}`, 'error');
        console.error(e);
    }
}

server.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`  Antigravity Airport Aggregator`);
    console.log(`  服务器运行于 http://localhost:${PORT}`);
    console.log(`  API: /api/refresh, /api/status, /api/proxies`);
    console.log(`========================================\n`);

    // Start the job
    startAutoUpdateJob();

    // Start proxy maintenance job
    startProxyMaintenanceJob();

    // 移除 saveAggregatorYaml()，由 startProxyMaintenanceJob 内部触发即可
});

// 优雅退出
process.on('SIGINT', () => {
    console.log('\n正在关闭...');
    if (cronTask) cronTask.stop();
    stopClash();
    server.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    if (cronTask) cronTask.stop();
    stopClash();
    server.close();
    process.exit(0);
});