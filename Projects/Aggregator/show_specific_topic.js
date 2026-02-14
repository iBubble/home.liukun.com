#!/usr/bin/env node
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = __dirname;
const CLASH_DIR = path.join(ROOT, 'clash_bin');
const CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
const TEST_PORT = 7912;

let clashProcess = null;

async function setupProxy() {
    const proxiesFile = path.join(ROOT, 'proxies.json');
    const allProxies = JSON.parse(fs.readFileSync(proxiesFile, 'utf8'));
    const proxy = allProxies[1];
    
    const config = {
        port: TEST_PORT,
        'socks-port': TEST_PORT + 1,
        'allow-lan': false,
        mode: 'rule',
        'log-level': 'silent',
        proxies: [proxy],
        'proxy-groups': [{
            name: 'test',
            type: 'select',
            proxies: [proxy.name]
        }],
        rules: ['MATCH,test']
    };
    
    const configPath = path.join(CLASH_DIR, 'specific_topic_config.yaml');
    fs.writeFileSync(configPath, yaml.dump(config));
    
    if (clashProcess) {
        clashProcess.kill('SIGTERM');
        await new Promise(r => setTimeout(r, 500));
    }
    
    clashProcess = spawn(CLASH_BIN, ['-d', CLASH_DIR, '-f', configPath], {
        stdio: 'pipe',
        env: {
            ...process.env,
            HTTP_PROXY: '',
            HTTPS_PROXY: '',
            http_proxy: '',
            https_proxy: '',
            ALL_PROXY: '',
            all_proxy: ''
        }
    });
    
    await new Promise(r => setTimeout(r, 5000));
}

function getLinuxDoCookie() {
    const cookieFile = path.join(ROOT, 'linuxdo_cookie.txt');
    if (fs.existsSync(cookieFile)) {
        try {
            return fs.readFileSync(cookieFile, 'utf8').trim();
        } catch (e) {}
    }
    return '';
}

function curlWithCookie(url, cookie, timeout = 30) {
    return new Promise((resolve, reject) => {
        const curlArgs = [
            '-s', '-L',
            '--max-time', timeout.toString(),
            '-H', 'Accept: application/json',
            '-H', 'User-Agent: Mozilla/5.0',
            '-x', `http://127.0.0.1:${TEST_PORT}`,
        ];
        
        if (cookie) {
            curlArgs.push('-H', `Cookie: ${cookie}`);
        }
        
        curlArgs.push(url);
        
        const child = spawn('curl', curlArgs, { 
            timeout: (timeout + 2) * 1000,
            env: {
                ...process.env,
                HTTP_PROXY: '',
                HTTPS_PROXY: '',
                http_proxy: '',
                https_proxy: '',
                ALL_PROXY: '',
                all_proxy: ''
            }
        });
        
        let data = '';
        child.stdout.on('data', chunk => data += chunk);
        
        child.on('close', (code) => {
            if (code === 0 && data) {
                resolve(data);
            } else {
                reject(new Error(`curl code ${code}`));
            }
        });
        
        child.on('error', reject);
    });
}

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
    
    return nodes;
}

function extractSubscriptions(content) {
    const subs = [];
    // 扩展订阅链接模式,包含.yaml结尾的链接
    const patterns = [
        /https?:\/\/[^\s<>"'\)]+(?:subscribe|sub|api|clash|v2ray)[^\s<>"'\)]*/gi,
        /https?:\/\/[^\s<>"'\)]+\.yaml/gi,
        /https?:\/\/[^\s<>"'\)]+\.txt/gi
    ];
    
    for (const pattern of patterns) {
        const matches = content.match(pattern) || [];
        for (let url of matches) {
            url = url.replace(/&amp;/g, '&').replace(/[,;。，；]+$/, '').trim();
            if (!url.includes('linux.do') && !url.includes('github.com') && url.length < 500) {
                if (!subs.includes(url)) {
                    subs.push(url);
                }
            }
        }
    }
    
    return subs;
}

async function main() {
    const topicId = 676824;
    
    console.log('获取主题内容: 长期免费节点分享\n');
    
    try {
        await setupProxy();
        console.log('✅ 代理已设置\n');
        
        const cookie = getLinuxDoCookie();
        const topicUrl = `https://linux.do/t/topic/${topicId}.json`;
        
        console.log(`正在获取: ${topicUrl}\n`);
        
        const topicData = JSON.parse(await curlWithCookie(topicUrl, cookie));
        const posts = topicData.post_stream?.posts || [];
        
        console.log(`共 ${posts.length} 个帖子\n`);
        console.log('========================================\n');
        
        let totalNodes = 0;
        let totalSubs = 0;
        
        for (let i = 0; i < Math.min(posts.length, 5); i++) {
            const post = posts[i];
            const content = post.cooked || '';
            
            console.log(`--- 帖子 #${i + 1} (作者: ${post.username}) ---\n`);
            
            // 提取节点
            const nodes = extractNodes(content);
            const subs = extractSubscriptions(content);
            
            if (nodes.length > 0) {
                console.log(`找到 ${nodes.length} 个节点链接:`);
                nodes.slice(0, 5).forEach(node => {
                    const protocol = node.split('://')[0];
                    const preview = node.substring(0, 50);
                    console.log(`  ${protocol}://${preview.substring(protocol.length + 3)}...`);
                });
                if (nodes.length > 5) {
                    console.log(`  ... 还有 ${nodes.length - 5} 个节点`);
                }
                console.log('');
                totalNodes += nodes.length;
            }
            
            if (subs.length > 0) {
                console.log(`找到 ${subs.length} 个订阅链接:`);
                subs.forEach(sub => {
                    console.log(`  ${sub}`);
                });
                console.log('');
                totalSubs += subs.length;
            }
            
            // 显示文本内容摘要
            const textContent = content
                .replace(/<[^>]+>/g, ' ')
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/\s+/g, ' ')
                .trim();
            
            if (textContent.length > 0 && nodes.length === 0 && subs.length === 0) {
                const preview = textContent.substring(0, 200);
                console.log(`内容摘要: ${preview}${textContent.length > 200 ? '...' : ''}\n`);
            }
            
            console.log('');
        }
        
        console.log('========================================');
        console.log('总结');
        console.log('========================================');
        console.log(`总节点数: ${totalNodes}`);
        console.log(`总订阅数: ${totalSubs}`);
        
    } catch (e) {
        console.log('❌ 错误:', e.message);
    } finally {
        if (clashProcess) clashProcess.kill();
    }
}

process.on('SIGINT', () => {
    if (clashProcess) clashProcess.kill();
    process.exit(0);
});

main().catch(e => {
    console.error(e);
    if (clashProcess) clashProcess.kill();
    process.exit(1);
});
