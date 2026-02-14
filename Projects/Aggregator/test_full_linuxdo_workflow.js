#!/usr/bin/env node
/**
 * 完整测试Linux.do工作流程:
 * 1. 获取文章列表
 * 2. 进入文章获取内容
 * 3. 解析节点链接
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = __dirname;
const CLASH_DIR = path.join(ROOT, 'clash_bin');
const CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
const TEST_PORT = 7909;

let clashProcess = null;

// 使用第一个excellent节点
async function setupProxy() {
    const proxiesFile = path.join(ROOT, 'proxies.json');
    const allProxies = JSON.parse(fs.readFileSync(proxiesFile, 'utf8'));
    
    // 使用第2个节点(香港2)
    const proxy = allProxies[1];
    
    console.log(`🔧 设置代理: ${proxy.name}\n`);
    
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
    
    const configPath = path.join(CLASH_DIR, 'workflow_test_config.yaml');
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
    
    console.log('⏳ 等待Clash启动...');
    await new Promise(r => setTimeout(r, 5000));
    console.log('✅ Clash已启动\n');
}

// 通用curl请求函数
function curlRequest(url, timeout = 30) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        const curlArgs = [
            '-s',
            '-L',
            '--max-time', timeout.toString(),
            '-H', 'Accept: application/json',
            '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            '-x', `http://127.0.0.1:${TEST_PORT}`,
            url
        ];
        
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
        let error = '';
        
        child.stdout.on('data', chunk => data += chunk);
        child.stderr.on('data', chunk => error += chunk);
        
        child.on('close', (code) => {
            const elapsed = Date.now() - startTime;
            
            if (code === 0 && data) {
                resolve({ success: true, data, elapsed });
            } else {
                reject(new Error(error || `curl code ${code}`));
            }
        });
        
        child.on('error', (err) => {
            reject(err);
        });
    });
}


// 读取Cookie
function getLinuxDoCookie() {
    const cookieFile = path.join(ROOT, 'linuxdo_cookie.txt');
    if (fs.existsSync(cookieFile)) {
        try {
            const cookie = fs.readFileSync(cookieFile, 'utf8').trim();
            if (cookie) {
                console.log('✅ 已加载Linux.do Cookie\n');
                return cookie;
            }
        } catch (e) {
            console.log('⚠️ Cookie读取失败\n');
        }
    }
    console.log('⚠️ 未找到Cookie文件\n');
    return '';
}

// 带Cookie的curl请求
function curlWithCookie(url, cookie, timeout = 30) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        const curlArgs = [
            '-s',
            '-L',
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
        let error = '';
        
        child.stdout.on('data', chunk => data += chunk);
        child.stderr.on('data', chunk => error += chunk);
        
        child.on('close', (code) => {
            const elapsed = Date.now() - startTime;
            
            if (code === 0 && data) {
                resolve({ success: true, data, elapsed });
            } else {
                reject(new Error(error || `curl code ${code}`));
            }
        });
        
        child.on('error', (err) => {
            reject(err);
        });
    });
}

// 解析节点链接
function extractNodes(content) {
    const nodes = [];
    
    // 节点链接模式
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

async function main() {
    console.log('========================================');
    console.log('完整测试Linux.do工作流程');
    console.log('========================================\n');
    
    try {
        // 1. 设置代理
        await setupProxy();
        
        // 2. 读取Cookie
        const cookie = getLinuxDoCookie();
        
        // 3. 获取文章列表
        console.log('📡 步骤1: 获取文章列表');
        console.log('URL: https://linux.do/tag/%E8%AE%A2%E9%98%85%E8%8A%82%E7%82%B9.json\n');
        
        const listUrl = 'https://linux.do/tag/%E8%AE%A2%E9%98%85%E8%8A%82%E7%82%B9.json';
        const listResult = await curlWithCookie(listUrl, cookie);
        
        console.log(`✅ 获取成功 (${listResult.elapsed}ms)`);
        
        let listData;
        try {
            listData = JSON.parse(listResult.data);
        } catch (e) {
            console.log('❌ JSON解析失败');
            console.log('响应内容:', listResult.data.substring(0, 500));
            throw e;
        }
        
        const topics = listData.topic_list?.topics || [];
        console.log(`📝 获取到 ${topics.length} 个主题\n`);
        
        if (topics.length === 0) {
            console.log('❌ 没有找到任何主题');
            return;
        }
        
        // 显示前5个主题
        console.log('前5个主题:');
        topics.slice(0, 5).forEach((topic, i) => {
            console.log(`  ${i + 1}. ${topic.title} (ID: ${topic.id})`);
        });
        console.log('');
        
        // 4. 获取第一个主题的详细内容
        const firstTopic = topics[0];
        console.log('========================================');
        console.log(`📡 步骤2: 获取主题详情`);
        console.log(`主题: ${firstTopic.title}`);
        console.log(`ID: ${firstTopic.id}\n`);
        
        const topicUrl = `https://linux.do/t/topic/${firstTopic.id}.json`;
        console.log(`URL: ${topicUrl}\n`);
        
        let topicResult;
        try {
            topicResult = await curlWithCookie(topicUrl, cookie);
            console.log(`✅ 获取成功 (${topicResult.elapsed}ms)\n`);
        } catch (e) {
            console.log(`❌ 获取失败: ${e.message}`);
            console.log('');
            
            if (!cookie) {
                console.log('⚠️ 提示: 可能需要Cookie才能访问主题详情');
                console.log('请将Cookie保存到 linuxdo_cookie.txt 文件中\n');
            }
            
            throw e;
        }
        
        let topicData;
        try {
            topicData = JSON.parse(topicResult.data);
        } catch (e) {
            console.log('❌ JSON解析失败');
            console.log('响应内容:', topicResult.data.substring(0, 500));
            
            // 检查是否是登录页面
            if (topicResult.data.includes('<!DOCTYPE') || topicResult.data.includes('login')) {
                console.log('\n⚠️ 返回的是HTML页面,可能需要登录');
                console.log('请确保Cookie有效并保存到 linuxdo_cookie.txt\n');
            }
            
            throw e;
        }
        
        const posts = topicData.post_stream?.posts || [];
        console.log(`📝 主题包含 ${posts.length} 个帖子\n`);
        
        // 5. 解析节点
        console.log('========================================');
        console.log('📡 步骤3: 解析节点链接\n');
        
        let totalNodes = 0;
        const nodesByPost = [];
        
        for (let i = 0; i < Math.min(posts.length, 5); i++) {
            const post = posts[i];
            const content = post.cooked || '';
            const nodes = extractNodes(content);
            
            if (nodes.length > 0) {
                console.log(`帖子 #${i + 1} (作者: ${post.username}):`);
                console.log(`  找到 ${nodes.length} 个节点`);
                nodes.slice(0, 3).forEach(node => {
                    const protocol = node.split('://')[0];
                    console.log(`    - ${protocol}://...`);
                });
                if (nodes.length > 3) {
                    console.log(`    ... 还有 ${nodes.length - 3} 个节点`);
                }
                console.log('');
                
                totalNodes += nodes.length;
                nodesByPost.push({ postNum: i + 1, count: nodes.length, nodes: nodes.slice(0, 3) });
            }
        }
        
        // 6. 总结
        console.log('========================================');
        console.log('测试总结');
        console.log('========================================\n');
        
        console.log(`✅ 成功获取文章列表: ${topics.length} 个主题`);
        console.log(`✅ 成功获取主题详情: ${posts.length} 个帖子`);
        console.log(`✅ 成功解析节点: ${totalNodes} 个节点\n`);
        
        if (totalNodes > 0) {
            console.log('节点分布:');
            nodesByPost.forEach(item => {
                console.log(`  帖子 #${item.postNum}: ${item.count} 个节点`);
            });
            console.log('');
            console.log('✅ 工作流程完全正常!');
        } else {
            console.log('⚠️ 未找到任何节点链接');
            console.log('可能原因:');
            console.log('  1. 该主题不包含节点链接');
            console.log('  2. 节点链接格式不匹配');
            console.log('  3. 需要查看更多主题');
        }
        
    } catch (e) {
        console.log('\n❌ 测试失败:', e.message);
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
    console.error('错误:', e);
    if (clashProcess) clashProcess.kill();
    process.exit(1);
});
