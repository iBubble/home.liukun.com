#!/usr/bin/env node
/**
 * 测试已知包含节点/订阅的主题
 * 676824 - 长期免费节点分享 (有订阅)
 * 1570944 - 分享几个自建节点HK+US (有节点)
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = __dirname;
const CLASH_DIR = path.join(ROOT, 'clash_bin');
const CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
const TEST_PORT = 7915;

let clashProcess = null;

async function setupProxy() {
    const validatedFile = path.join(ROOT, 'validated_nodes.json');
    const validated = JSON.parse(fs.readFileSync(validatedFile, 'utf8'));
    const proxy = validated.excellent[0];
    
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
    
    const configPath = path.join(CLASH_DIR, 'known_topics_config.yaml');
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
        /ssr:\/\/[A-Za-z0-9+\/=_-]+/g,
        /hysteria2?:\/\/[A-Za-z0-9@.:_\-?&=%#\/\[\]]+/g,
        /hy2:\/\/[A-Za-z0-9@.:_\-?&=%#\/]+/g
    ];
    
    for (const pattern of patterns) {
        const matches = content.match(pattern) || [];
        for (let m of matches) {
            m = m.replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/<[^>]+>/g, '')
                .trim();
            if (!nodes.includes(m)) {
                nodes.push(m);
            }
        }
    }
    
    return nodes;
}

function extractSubscriptions(content) {
    const subs = [];
    const patterns = [
        /https?:\/\/[^\s<>"'\)]+(?:subscribe|sub|api|link|clash|v2ray|vmess|trojan|ss|ssr)[^\s<>"'\)]*/gi,
        /https?:\/\/[^\s<>"'\)]+\.yaml(?:\?[^\s<>"'\)]*)?/gi,
        /https?:\/\/[^\s<>"'\)]+\.txt(?:\?[^\s<>"'\)]*)?/gi,
        /https?:\/\/[^\s<>"'\)]+\.json(?:\?[^\s<>"'\)]*)?/gi
    ];
    
    for (const pattern of patterns) {
        const matches = content.match(pattern) || [];
        for (let url of matches) {
            url = url.replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/<[^>]+>/g, '')
                .replace(/[,;。，；]+$/, '')
                .trim();
            
            if (!url.includes('linux.do') && 
                !(url.includes('github.com') && !url.includes('raw.')) && 
                url.length < 500 &&
                !subs.includes(url)) {
                subs.push(url);
            }
        }
    }
    
    return subs;
}

async function testTopic(topicId, topicName) {
    console.log(`========================================`);
    console.log(`测试主题: ${topicName}`);
    console.log(`ID: ${topicId}`);
    console.log(`========================================\n`);
    
    try {
        const cookie = getLinuxDoCookie();
        const topicUrl = `https://linux.do/t/topic/${topicId}.json`;
        const topicData = JSON.parse(await curlWithCookie(topicUrl, cookie));
        const posts = topicData.post_stream?.posts || [];
        
        console.log(`共 ${posts.length} 个帖子\n`);
        
        let totalNodes = 0;
        let totalSubs = 0;
        
        for (let i = 0; i < Math.min(posts.length, 10); i++) {
            const post = posts[i];
            const content = post.cooked || '';
            
            const nodes = extractNodes(content);
            const subs = extractSubscriptions(content);
            
            if (nodes.length > 0 || subs.length > 0) {
                console.log(`帖子 #${i + 1} (${post.username}):`);
                
                if (nodes.length > 0) {
                    console.log(`  节点: ${nodes.length} 个`);
                    nodes.forEach(node => {
                        const protocol = node.split('://')[0];
                        const preview = node.substring(0, 70);
                        console.log(`    ${preview}${node.length > 70 ? '...' : ''}`);
                    });
                    totalNodes += nodes.length;
                }
                
                if (subs.length > 0) {
                    console.log(`  订阅: ${subs.length} 个`);
                    subs.forEach(sub => {
                        console.log(`    ${sub}`);
                    });
                    totalSubs += subs.length;
                }
                
                console.log('');
            }
        }
        
        console.log(`总计: ${totalNodes} 节点, ${totalSubs} 订阅\n`);
        return { nodes: totalNodes, subs: totalSubs };
        
    } catch (e) {
        console.log(`❌ 测试失败: ${e.message}\n`);
        return { nodes: 0, subs: 0 };
    }
}

async function main() {
    console.log('测试已知包含内容的主题\n');
    
    try {
        await setupProxy();
        console.log('✅ 代理已设置\n');
        
        const cookie = getLinuxDoCookie();
        if (cookie) {
            console.log('✅ 已加载Cookie\n');
        }
        
        // 测试两个已知主题
        const result1 = await testTopic(676824, '长期免费节点分享');
        await new Promise(r => setTimeout(r, 2000));
        
        const result2 = await testTopic(1570944, '分享几个自建节点HK+US');
        
        console.log('========================================');
        console.log('测试总结');
        console.log('========================================');
        console.log(`主题1: ${result1.nodes} 节点, ${result1.subs} 订阅`);
        console.log(`主题2: ${result2.nodes} 节点, ${result2.subs} 订阅`);
        console.log(`总计: ${result1.nodes + result2.nodes} 节点, ${result1.subs + result2.subs} 订阅`);
        
    } catch (e) {
        console.log('❌ 错误:', e.message);
    } finally {
        if (clashProcess) {
            console.log('\n🛑 关闭Clash...');
            clashProcess.kill('SIGTERM');
        }
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
