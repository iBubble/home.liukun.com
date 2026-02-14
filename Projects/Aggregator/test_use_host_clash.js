/**
 * 测试通过宿主机的Clash代理访问
 */

const { execSync } = require('child_process');

console.log('========== 测试通过宿主机Clash代理访问 ==========\n');

// 可能的宿主机IP
const possibleHosts = [
    '192.168.1.10',
    '192.168.1.2',
    '192.168.1.3',
    '192.168.1.4',
    '192.168.1.5'
];

// Clash默认端口
const clashPorts = [7890, 7891, 7892];

console.log('🔍 扫描宿主机Clash代理...\n');

for (const host of possibleHosts) {
    for (const port of clashPorts) {
        try {
            // 测试端口是否开放
            execSync(`timeout 2 nc -zv ${host} ${port} 2>&1`, { encoding: 'utf8', stdio: 'pipe' });
            console.log(`✅ 发现代理: ${host}:${port}`);
            
            // 测试访问linux.do
            console.log(`   测试访问 linux.do...`);
            try {
                const result = execSync(
                    `curl -s -x http://${host}:${port} -k --connect-timeout 10 --max-time 20 -o /dev/null -w "%{http_code}" https://linux.do`,
                    { encoding: 'utf8', timeout: 25000 }
                );
                
                if (result.trim() === '200') {
                    console.log(`   ✅ 成功访问！状态码: ${result.trim()}`);
                    console.log(`\n🎉 找到可用代理: http://${host}:${port}\n`);
                    
                    // 保存配置
                    const fs = require('fs');
                    const config = {
                        hostClashProxy: `http://${host}:${port}`,
                        discoveredAt: new Date().toISOString()
                    };
                    fs.writeFileSync('host_clash_config.json', JSON.stringify(config, null, 2));
                    console.log('✅ 配置已保存到 host_clash_config.json');
                    
                    process.exit(0);
                } else {
                    console.log(`   ⚠️ 状态码: ${result.trim()}`);
                }
            } catch (e) {
                console.log(`   ❌ 访问失败`);
            }
        } catch (e) {
            // 端口未开放，继续
        }
    }
}

console.log('\n❌ 未找到可用的宿主机Clash代理');
console.log('\n请确认：');
console.log('1. 宿主机Clash是否正在运行？');
console.log('2. Clash是否开启了"允许局域网连接" (allow-lan: true)？');
console.log('3. 宿主机防火墙是否允许虚拟机访问Clash端口？');
