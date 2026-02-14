#!/usr/bin/env node
/**
 * 显示指定主题的内容
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = __dirname;
const CLASH_DIR = path.join(ROOT, 'clash_bin');
const CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
const TEST_PORT = 7911;

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
    
    const configPath = path.join(CLASH_DIR, 'show_content_config.yaml');
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
            '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
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

async function showTopicContent(topicId, title) {
    console.log(`\n========================================`);
    console.log(`主题: ${title}`);
    console.log(`ID: ${topicId}`);
    console.log(`========================================\n`);
    
    try {
        const cookie = getLinuxDoCookie();
        const topicUrl = `https://linux.do/t/topic/${topicId}.json`;
        const topicData = JSON.parse(await curlWithCookie(topicUrl, cookie));
        const posts = topicData.post_stream?.posts || [];
        
        console.log(`共 ${posts.length} 个帖子\n`);
        
        // 显示前3个帖子的内容
        for (let i = 0; i < Math.min(posts.length, 3); i++) {
            const post = posts[i];
            console.log(`--- 帖子 #${i + 1} (作者: ${post.username}) ---`);
            
            // 移除HTML标签,只显示文本
            const content = (post.cooked || '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/\s+/g, ' ')
                .trim();
            
            // 显示前500个字符
            if (content.length > 500) {
                console.log(content.substring(0, 500) + '...\n');
            } else {
                console.log(content + '\n');
            }
        }
        
    } catch (e) {
        console.log(`❌ 获取失败: ${e.message}\n`);
    }
}

async function main() {
    console.log('显示主题内容\n');
    
    try {
        await setupProxy();
        console.log('✅ 代理已设置\n');
        
        // 获取主题列表
        const cookie = getLinuxDoCookie();
        const listUrl = 'https://linux.do/tag/%E8%AE%A2%E9%98%85%E8%8A%82%E7%82%B9.json';
        const listData = JSON.parse(await curlWithCookie(listUrl, cookie));
        const topics = listData.topic_list?.topics || [];
        
        // 找到指定的两个主题
        const topic2 = topics.find(t => t.title.includes('分享个美国 家宽 http代理'));
        const topic3 = topics.find(t => t.title.includes('Glados 订阅200G'));
        
        if (topic2) {
            await showTopicContent(topic2.id, topic2.title);
        }
        
        if (topic3) {
            await showTopicContent(topic3.id, topic3.title);
        }
        
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
