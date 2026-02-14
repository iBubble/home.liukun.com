const { getPremiumProxyManager } = require('./premium_proxy_manager');

async function main() {
    const manager = getPremiumProxyManager();
    // 修改端口为 7940 (HTTP) 和 7941 (SOCKS5)，如果需要的话
    // premium_proxy_manager.js 默认就是 7940

    console.log('正在启动浏览器专用付费节点代理...');
    const started = await manager.start();

    if (started) {
        console.log('✓ 代理已成功启动在端口 7940');
        console.log('您可以配置浏览器代理为: 127.0.0.1:7940 (HTTP)');

        // 保持进程运行
        process.on('SIGINT', () => {
            manager.stop();
            process.exit();
        });

        // 简单的心跳
        setInterval(() => { }, 1000);
    } else {
        console.error('✗ 代理启动失败');
        process.exit(1);
    }
}

main();
