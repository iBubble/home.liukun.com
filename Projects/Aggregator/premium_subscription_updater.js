#!/usr/bin/env node
/**
 * 付费订阅更新器
 * 每6小时从付费订阅链接获取最新节点
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = __dirname;
const PREMIUM_NODES_FILE = path.join(ROOT, 'premium_nodes.json');
const LOG_FILE = path.join(ROOT, 'logs', 'premium_subscription.log');

// 付费订阅配置
const PREMIUM_SUBSCRIPTION = {
    url: 'https://16412.nginx24ppy.xyz/link/hXvsVfrh8PP0ViD3?clash=1',
    name: '付费订阅',
    priority_nodes: [
        '专线'
    ]
};

// 日志函数
function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}\n`;
    
    console.log(logMessage.trim());
    
    // 确保日志目录存在
    const logDir = path.dirname(LOG_FILE);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    
    fs.appendFileSync(LOG_FILE, logMessage);
}

// 下载订阅内容
function downloadSubscription(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        
        log(`开始下载订阅: ${url}`);
        
        protocol.get(url, {
            headers: {
                'User-Agent': 'clash-verge/1.3.8'
            }
        }, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                return;
            }
            
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                log(`订阅下载完成,大小: ${data.length} 字节`);
                resolve(data);
            });
        }).on('error', reject);
    });
}

// 解析 Clash 配置
function parseClashConfig(yamlContent) {
    try {
        const config = yaml.load(yamlContent);
        
        if (!config || !config.proxies) {
            throw new Error('无效的 Clash 配置: 缺少 proxies 字段');
        }
        
        log(`解析到 ${config.proxies.length} 个节点`);
        return config.proxies;
    } catch (error) {
        throw new Error(`解析 YAML 失败: ${error.message}`);
    }
}

// 按优先级排序节点
function sortNodesByPriority(nodes, priorityNames) {
    const priorityNodes = [];
    const otherNodes = [];
    
    nodes.forEach(node => {
        const isPriority = priorityNames.some(name => 
            node.name && node.name.includes(name)
        );
        
        if (isPriority) {
            priorityNodes.push(node);
        } else {
            otherNodes.push(node);
        }
    });
    
    log(`优先节点: ${priorityNodes.length} 个, 其他节点: ${otherNodes.length} 个`);
    
    return [...priorityNodes, ...otherNodes];
}

// 保存节点数据
function saveNodes(nodes) {
    const data = {
        updated_at: new Date().toISOString(),
        subscription: PREMIUM_SUBSCRIPTION.url,
        total_nodes: nodes.length,
        priority_nodes: nodes.filter(node => 
            PREMIUM_SUBSCRIPTION.priority_nodes.some(name => 
                node.name && node.name.includes(name)
            )
        ).map(n => n.name),
        nodes: nodes
    };
    
    fs.writeFileSync(PREMIUM_NODES_FILE, JSON.stringify(data, null, 2));
    log(`节点数据已保存到: ${PREMIUM_NODES_FILE}`);
    
    return data;
}

// 主函数
async function main() {
    try {
        log('========== 付费订阅更新开始 ==========');
        
        // 1. 下载订阅
        const yamlContent = await downloadSubscription(PREMIUM_SUBSCRIPTION.url);
        
        // 2. 解析节点
        const nodes = parseClashConfig(yamlContent);
        
        if (nodes.length === 0) {
            throw new Error('未解析到任何节点');
        }
        
        // 3. 按优先级排序
        const sortedNodes = sortNodesByPriority(nodes, PREMIUM_SUBSCRIPTION.priority_nodes);
        
        // 4. 保存节点
        const savedData = saveNodes(sortedNodes);
        
        log('========== 付费订阅更新完成 ==========');
        log(`总节点数: ${savedData.total_nodes}`);
        log(`优先节点: ${savedData.priority_nodes.join(', ')}`);
        
        return savedData;
        
    } catch (error) {
        log(`更新失败: ${error.message}`, 'ERROR');
        log(error.stack, 'ERROR');
        process.exit(1);
    }
}

// 执行
if (require.main === module) {
    main();
}

module.exports = { main, downloadSubscription, parseClashConfig };
