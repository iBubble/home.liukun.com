#!/usr/bin/env node
/**
 * 获取指定 Linux.do 主题的内容
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = __dirname;
const CLASH_DIR = path.join(ROOT, 'clash_bin');
const CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
const CLASH_CONFIG = path.join(ROOT, 'clash_data', 'fetch_topic_config.yaml');
const PREMIUM_NODES_FILE = path.join(ROOT, 'premium_nodes.json');
const COOKIE_FILE = path.join(ROOT, 'linuxdo_cookie.txt');
const TEST_PORT = 7935;

let clashProcess = null;

// 从命令行参数获取主题ID
const topicId = process.argv[2] || '1591144';

function log(message) {
    console.log(message);
}

function loadPremiumNodes() {
    if (!fs.existsSync(PREMIUM_NODES_FILE)) {
        throw new Error(`付费节点文件不存在,请先运行: node premium_subscription_updater.js`);
    }
    const data = JSON.parse(fs.readFileSync(PREMIUM_NODES_FILE, 'utf8'));
    return data.nodes.slice(0, 3);
}

function loadCookie() {
    if (!fs.existsSync(COOKIE_FILE)) {
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
            type: 'select',
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

function stripHtml(html) {
    return html
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
}

async function main() {
    try {
        log(`========== 获取 Linux.do 主题 ${topicId} ==========\n`);
        
        // 1. 加载付费节点
        const nodes = loadPremiumNodes();
        log(`使用代理节点: ${nodes[0].name}\n`);
        
        // 2. 加载 Cookie
        const cookie = loadCookie();
        if (cookie) {
            log('✓ Cookie 已加载\n');
        }
        
        // 3. 启动 Clash
        createClashConfig(nodes);
        await startClash();
        log('✓ Clash 代理已启动\n');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 4. 获取主题内容
        log('正在获取主题内容...\n');
        const topicUrl = `https://linux.do/t/topic/${topicId}.json`;
        const data = await curlWithProxy(topicUrl, cookie, 30);
        const topicJson = JSON.parse(data);
        
        // 5. 解析内容
        log('========================================');
        log(`标题: ${topicJson.title}`);
        log(`作者: ${topicJson.post_stream?.posts[0]?.username || '未知'}`);
        log(`回复数: ${topicJson.posts_count - 1}`);
        log(`浏览数: ${topicJson.views}`);
        log('========================================\n');
        
        const posts = topicJson.post_stream?.posts || [];
        
        log(`共 ${posts.length} 个帖子:\n`);
        
        posts.forEach((post, index) => {
            log(`--- 帖子 ${index + 1} (作者: ${post.username}) ---`);
            const content = stripHtml(post.cooked || '');
            log(content);
            log('\n');
            
            // 检查是否包含节点或订阅链接
            const hasVmess = content.includes('vmess://');
            const hasVless = content.includes('vless://');
            const hasTrojan = content.includes('trojan://');
            const hasSS = content.includes('ss://');
            const hasSubscribe = content.includes('subscribe') || content.includes('订阅');
            
            if (hasVmess || hasVless || hasTrojan || hasSS || hasSubscribe) {
                log('⚠️ 此帖子可能包含节点或订阅信息');
                log('');
            }
        });
        
        log('========================================');
        log('获取完成');
        log('========================================');
        
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
