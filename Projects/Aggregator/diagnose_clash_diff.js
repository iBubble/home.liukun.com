/**
 * 诊断Clash配置差异
 * 对比Aggregator.yaml和测试脚本生成的配置
 */

const fs = require('fs');
const yaml = require('js-yaml');

console.log('========== Clash配置差异诊断 ==========\n');

// 1. 读取Aggregator.yaml中的AT_speednode_0003配置
const aggregatorYaml = yaml.load(fs.readFileSync('Aggregator.yaml', 'utf8'));
const originalProxy = aggregatorYaml.proxies.find(p => p.name === 'AT_speednode_0003');

console.log('📄 Aggregator.yaml中的配置:');
console.log(JSON.stringify(originalProxy, null, 2));
console.log('\n');

// 2. 读取测试脚本生成的配置
const testConfig = yaml.load(fs.readFileSync('clash_bin/test_at_config.yaml', 'utf8'));
const testProxy = testConfig.proxies[0];

console.log('📄 测试脚本生成的配置:');
console.log(JSON.stringify(testProxy, null, 2));
console.log('\n');

// 3. 对比差异
console.log('🔍 配置差异分析:');
const allKeys = new Set([...Object.keys(originalProxy), ...Object.keys(testProxy)]);

let hasDiff = false;
for (const key of allKeys) {
    const origValue = JSON.stringify(originalProxy[key]);
    const testValue = JSON.stringify(testProxy[key]);
    
    if (origValue !== testValue) {
        hasDiff = true;
        console.log(`  ❌ ${key}:`);
        console.log(`     原始: ${origValue}`);
        console.log(`     测试: ${testValue}`);
    }
}

if (!hasDiff) {
    console.log('  ✅ 配置完全一致！');
}

console.log('\n');

// 4. 检查Clash版本
const { execSync } = require('child_process');
try {
    const version = execSync('./clash_bin/clash-linux-amd64 -v', { encoding: 'utf8' });
    console.log('🔧 Clash版本:');
    console.log(version);
} catch (e) {
    console.log('❌ 无法获取Clash版本:', e.message);
}

console.log('\n========== 诊断完成 ==========');
