#!/usr/bin/env node
/**
 * 测试多个Linux.do主题,找到包含节点的主题
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = __dirname;
const CLASH_DIR = path.join(ROOT, 'clash_bin');
const CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
const TEST_PORT = 7910;

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
    
    const configPath = path.join(CLASH_DIR, 'find_nodes_config.yaml');
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
    const subPattern = /https?:\/\/[^\s<>"'\)]+(?:subscribe|sub|api|clash|v2ray)[^\s<>"'\)]*/gi;
    const matches = content.match(subPattern) || [];
    
    for (let url of matches) {
        url = url.replace(/&amp;/g, '&').replace(/[,;。，；]+$/, '').trim();
        if (!url.includes('linux.do') && !url.includes('github.com') && url.length < 500) {
            subs.push(url);
        }
    }
    
    return subs;
}

async function main() {
    console.log('查找包含节点的Linux.do主题\n');
    
    try {
        await setupProxy();
        console.log('✅ 代理已设置\n');
        
        const cookie = getLinuxDoCookie();
        if (cookie) {
            console.log('✅ Cookie已加载\n');
        } else {
            console.log('⚠️ 未找到Cookie\n');
        }
        
        // 获取主题列表
        const listUrl = 'https://linux.do/tag/%E8%AE%A2%E9%98%85%E8%8A%82%E7%82%B9.json';
        const listData = JSON.parse(await curlWithCookie(listUrl, cookie));
        const topics = listData.topic_list?.topics || [];
        
        console.log(`📝 获取到 ${topics.length} 个主题\n`);
        console.log('开始检查前10个主题...\n');
        
        const topicsWithNodes = [];
        
        for (let i = 0; i < Math.min(topics.length, 10); i++) {
            const topic = topics[i];
            console.log(`[${i + 1}/10] ${topic.title}`);
            
            try {
                const topicUrl = `https://linux.do/t/topic/${topic.id}.json`;
                const topicData = JSON.parse(await curlWithCookie(topicUrl, cookie));
                const posts = topicData.post_stream?.posts || [];
                
                let totalNodes = 0;
                let totalSubs = 0;
                for (const post of posts.slice(0, 5)) {
                    const content = post.cooked || '';
                    const nodes = extractNodes(content);
                    const subs = extractSubscriptions(content);
                    totalNodes += nodes.length;
                    totalSubs += subs.length;
                }
                
                if (totalNodes > 0 || totalSubs > 0) {
                    let msg = '  ✅ ';
                    if (totalNodes > 0) msg += `${totalNodes} 个节点`;
                    if (totalNodes > 0 && totalSubs > 0) msg += ', ';
                    if (totalSubs > 0) msg += `${totalSubs} 个订阅`;
                    console.log(msg + '\n');
                    topicsWithNodes.push({ topic, nodeCount: totalNodes, subCount: totalSubs });
                } else {
                    console.log(`  ❌ 无节点或订阅\n`);
                }
                
                await new Promise(r => setTimeout(r, 1000));
            } catch (e) {
                console.log(`  ❌ 获取失败: ${e.message}\n`);
            }
        }
        
        console.log('========================================');
        console.log('总结');
        console.log('========================================\n');
        
        if (topicsWithNodes.length > 0) {
            console.log(`✅ 找到 ${topicsWithNodes.length} 个包含节点/订阅的主题:\n`);
            topicsWithNodes.forEach((item, i) => {
                console.log(`${i + 1}. ${item.topic.title}`);
                if (item.nodeCount > 0) console.log(`   节点数: ${item.nodeCount}`);
                if (item.subCount > 0) console.log(`   订阅数: ${item.subCount}`);
                console.log(`   ID: ${item.topic.id}\n`);
            });
        } else {
            console.log('❌ 前10个主题都不包含节点链接或订阅链接');
            console.log('建议: 尝试查看更多主题或检查其他标签\n');
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
