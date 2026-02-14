#!/usr/bin/env node
/**
 * Linux.do Cookie 更新工具
 * 
 * 使用方法：
 * 1. 在浏览器中登录 linux.do
 * 2. 打开开发者工具 (F12) -> Application -> Cookies -> https://linux.do
 * 3. 复制所有 cookie 值
 * 4. 运行: node update_cookie.js
 * 5. 粘贴 cookie 字符串
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const COOKIE_FILE = path.join(__dirname, 'linuxdo_cookie.txt');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('========================================');
console.log('  Linux.do Cookie 更新工具');
console.log('========================================\n');

console.log('📋 获取 Cookie 的步骤：');
console.log('1. 在浏览器中访问并登录 https://linux.do');
console.log('2. 按 F12 打开开发者工具');
console.log('3. 切换到 Application (或 存储) 标签');
console.log('4. 左侧选择 Cookies -> https://linux.do');
console.log('5. 复制所有 cookie (格式: name=value; name=value; ...)');
console.log('   或者在 Console 中运行: document.cookie');
console.log('\n');

rl.question('请粘贴 Cookie 字符串: ', (cookie) => {
    cookie = cookie.trim();
    
    if (!cookie) {
        console.error('❌ Cookie 不能为空');
        rl.close();
        process.exit(1);
    }
    
    // 验证 cookie 格式
    if (!cookie.includes('=')) {
        console.error('❌ Cookie 格式不正确，应该包含 name=value 格式');
        rl.close();
        process.exit(1);
    }
    
    // 保存 cookie
    try {
        fs.writeFileSync(COOKIE_FILE, cookie);
        console.log('\n✅ Cookie 已保存到:', COOKIE_FILE);
        console.log('📊 Cookie 长度:', cookie.length, '字符');
        console.log('🔑 Cookie 数量:', cookie.split(';').length, '个');
        
        // 显示 cookie 预览
        const preview = cookie.substring(0, 100);
        console.log('👀 预览:', preview + (cookie.length > 100 ? '...' : ''));
        
        console.log('\n✨ 现在可以运行测试脚本验证 Cookie 是否有效：');
        console.log('   node test_specific_topic_1590573.js');
        
    } catch (e) {
        console.error('❌ 保存失败:', e.message);
        process.exit(1);
    }
    
    rl.close();
});
