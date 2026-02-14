/**
 * 付费节点代理管理器
 * 用于在需要时启动/停止 Clash 代理
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class PremiumProxyManager {
    constructor() {
        this.ROOT = path.dirname(__filename);
        this.CLASH_DIR = path.join(this.ROOT, 'clash_bin');
        this.CLASH_BIN = path.join(this.CLASH_DIR, 'clash-linux-amd64');
        this.CLASH_CONFIG = path.join(this.ROOT, 'clash_data', 'app_proxy_config.yaml');
        this.PREMIUM_NODES_FILE = path.join(this.ROOT, 'premium_nodes.json');
        this.PROXY_PORT = 7940; // 使用不同的端口避免冲突

        this.clashProcess = null;
        this.isRunning = false;
    }

    // 加载付费节点
    loadPremiumNodes() {
        if (!fs.existsSync(this.PREMIUM_NODES_FILE)) {
            throw new Error('付费节点文件不存在,请先运行: node premium_subscription_updater.js');
        }

        const data = JSON.parse(fs.readFileSync(this.PREMIUM_NODES_FILE, 'utf8'));

        // 使用所有节点,让Clash自动选择最佳节点
        // 这样更可靠,因为test_premium_nodes.js就是这样成功的
        console.log(`[代理] 加载 ${data.nodes.length} 个付费节点`);
        return data.nodes;
    }

    // 创建 Clash 配置
    createClashConfig(nodes) {
        const config = {
            port: this.PROXY_PORT,
            'socks-port': this.PROXY_PORT + 1,
            'allow-lan': false,
            mode: 'rule', // 使用rule模式,和test_premium_nodes.js一样
            'log-level': 'silent',
            'external-controller': `127.0.0.1:${this.PROXY_PORT + 100}`,
            proxies: nodes,
            'proxy-groups': [{
                name: 'PROXY',
                type: 'url-test',
                url: 'http://www.gstatic.com/generate_204',
                interval: 300,
                proxies: nodes.map(p => p.name)
            }],
            rules: ['MATCH,PROXY']
        };

        const configDir = path.dirname(this.CLASH_CONFIG);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }

        fs.writeFileSync(this.CLASH_CONFIG, yaml.dump(config));
    }

    // 启动 Clash 代理
    async start() {
        if (this.isRunning) {
            console.log('[代理] 代理已在运行中');
            return true;
        }

        try {
            console.log('[代理] 正在启动付费节点代理...');

            // 加载节点
            const nodes = this.loadPremiumNodes();
            console.log(`[代理] 使用节点: ${nodes.map(n => n.name).join(', ')}`);

            // 创建配置
            this.createClashConfig(nodes);

            // 启动 Clash
            this.clashProcess = spawn(this.CLASH_BIN, [
                '-d', path.dirname(this.CLASH_CONFIG),
                '-f', this.CLASH_CONFIG
            ], {
                stdio: 'pipe',
                env: {
                    ...process.env,
                    HTTP_PROXY: '',
                    HTTPS_PROXY: '',
                    http_proxy: '',
                    https_proxy: ''
                }
            });

            // 等待启动
            await new Promise(resolve => setTimeout(resolve, 5000));

            this.isRunning = true;
            console.log(`[代理] ✓ 代理已启动 (端口: ${this.PROXY_PORT})`);
            return true;

        } catch (error) {
            console.error('[代理] 启动失败:', error.message);
            return false;
        }
    }

    // 停止 Clash 代理
    stop() {
        if (!this.isRunning) {
            return;
        }

        try {
            if (this.clashProcess && !this.clashProcess.killed) {
                console.log('[代理] 正在停止代理...');
                this.clashProcess.kill();
                this.clashProcess = null;
            }

            this.isRunning = false;
            console.log('[代理] ✓ 代理已停止');

        } catch (error) {
            console.error('[代理] 停止失败:', error.message);
        }
    }

    // 获取代理配置
    getProxyConfig() {
        if (!this.isRunning) {
            return null;
        }

        return {
            host: '127.0.0.1',
            port: this.PROXY_PORT,
            url: `http://127.0.0.1:${this.PROXY_PORT}`
        };
    }

    // 检查是否正在运行
    isProxyRunning() {
        return this.isRunning;
    }
}

// 单例模式
let instance = null;

function getPremiumProxyManager() {
    if (!instance) {
        instance = new PremiumProxyManager();
    }
    return instance;
}

module.exports = {
    PremiumProxyManager,
    getPremiumProxyManager
};
