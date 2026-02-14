#!/usr/bin/env node
/**
 * 测试增强的节点和订阅提取逻辑
 * 验证能否从多个主题中提取节点和订阅链接
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = __dirname;
const CLASH_DIR = path.join(ROOT, 'clash_bin');
const CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
const TEST_PORT = 7914;

let clashProcess = null;

async function setupProxy() {
    const validatedFile = path.join(ROOT, 'validated_nodes.json');
    const validated = JSON.parse(fs.readFileSync(validatedFile, 'utf8'));
    const proxy = validated.excellent[0];
    
    console.log(`🔧 使用代理: ${proxy.name}\n`);
    
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
    
    const configPath = path.join(CLASH_DIR, 'enhanced_test_config.yaml');
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

async function main() {
    console.log('========================================');
    console.log('测试增强的节点和订阅提取逻辑');
    console.log('========================================\n');
    
    try {
        await setupProxy();
        console.log('✅ 代理已设置\n');
        
        const cookie = getLinuxDoCookie();
        if (cookie) {
            console.log('✅ 已加载Cookie\n');
        } else {
            console.log('⚠️ 未找到Cookie\n');
        }
        
        // 获取主题列表
        console.log('📡 获取主题列表...\n');
        const listUrl = 'https://linux.do/tag/%E8%AE%A2%E9%98%85%E8%8A%82%E7%82%B9.json';
        const listData = JSON.parse(await curlWithCookie(listUrl, cookie));
        const topics = listData.topic_list?.topics || [];
        
        console.log(`✅ 获取到 ${topics.length} 个主题\n`);
        
        // 测试前5个主题
        const testTopics = topics.slice(0, 5);
        let totalNodes = 0;
        let totalSubs = 0;
        
        for (let i = 0; i < testTopics.length; i++) {
            const topic = testTopics[i];
            console.log(`========================================`);
            console.log(`[${i + 1}/${testTopics.length}] ${topic.title}`);
            console.log(`ID: ${topic.id}`);
            console.log(`========================================\n`);
            
            try {
                const topicUrl = `https://linux.do/t/topic/${topic.id}.json`;
                const topicData = JSON.parse(await curlWithCookie(topicUrl, cookie));
                const posts = topicData.post_stream?.posts || [];
                
                console.log(`共 ${posts.length} 个帖子\n`);
                
                let topicNodes = 0;
                let topicSubs = 0;
                
                // 分析前10楼
                for (let j = 0; j < Math.min(posts.length, 10); j++) {
                    const post = posts[j];
                    const content = post.cooked || '';
                    
                    const nodes = extractNodes(content);
                    const subs = extractSubscriptions(content);
                    
                    if (nodes.length > 0 || subs.length > 0) {
                        console.log(`  帖子 #${j + 1} (${post.username}):`);
                        
                        if (nodes.length > 0) {
                            console.log(`    节点: ${nodes.length} 个`);
                            nodes.slice(0, 2).forEach(node => {
                                const protocol = node.split('://')[0];
                                console.log(`      - ${protocol}://...`);
                            });
                            if (nodes.length > 2) {
                                console.log(`      ... 还有 ${nodes.length - 2} 个`);
                            }
                            topicNodes += nodes.length;
                        }
                        
                        if (subs.length > 0) {
                            console.log(`    订阅: ${subs.length} 个`);
                            subs.forEach(sub => {
                                console.log(`      - ${sub.substring(0, 60)}...`);
                            });
                            topicSubs += subs.length;
                        }
                        
                        console.log('');
                    }
                }
                
                console.log(`本主题统计: ${topicNodes} 节点, ${topicSubs} 订阅\n`);
                totalNodes += topicNodes;
                totalSubs += topicSubs;
                
            } catch (e) {
                console.log(`❌ 获取失败: ${e.message}\n`);
            }
            
            await new Promise(r => setTimeout(r, 2000));
        }
        
        console.log('========================================');
        console.log('测试总结');
        console.log('========================================');
        console.log(`测试主题数: ${testTopics.length}`);
        console.log(`总节点数: ${totalNodes}`);
        console.log(`总订阅数: ${totalSubs}`);
        console.log('');
        
        if (totalNodes > 0 || totalSubs > 0) {
            console.log('✅ 提取逻辑工作正常!');
        } else {
            console.log('⚠️ 未提取到任何内容,可能需要检查提取逻辑');
        }
        
    } catch (e) {
        console.log('❌ 测试失败:', e.message);
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
