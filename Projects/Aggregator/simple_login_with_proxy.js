/**
 * 简化版登录脚本 - 通过本地代理
 * 
 * 由于 Google 的反自动化检测很严格，这个脚本会：
 * 1. 打开浏览器到登录页面
 * 2. 等待你手动完成登录（包括 2FA）
 * 3. 登录成功后自动保存 Cookie
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const COOKIE_FILE = path.join(__dirname, 'linuxdo_cookie.txt');
const CHROME_PATH = '/usr/bin/google-chrome';
const LOGS_DIR = path.join(__dirname, 'logs');

if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
}

async function simpleLogin() {
    console.log('========================================');
    console.log('  Linux.do 简化登录');
    console.log('========================================\n');
    
    let browser = null;

    try {
        const proxyServer = 'http://127.0.0.1:7940';
        console.log('使用代理:', proxyServer);
        console.log('启动浏览器...\n');
        
        browser = await puppeteer.launch({
            executablePath: CHROME_PATH,
            headless: false, // 非无头模式，可以看到浏览器
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                `--proxy-server=${proxyServer}`,
                '--window-size=1280,900'
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

        console.log('正在打开 linux.do/login...');
        await page.goto('https://linux.do/login', { 
            waitUntil: 'domcontentloaded', 
            timeout: 60000 
        });
        
        console.log('\n✓ 页面已打开');
        console.log('\n请在浏览器中完成以下操作：');
        console.log('  1. 点击 "Sign in with Google"');
        console.log('  2. 输入 Gmail 账号和密码');
        console.log('  3. 完成 2FA 验证');
        console.log('  4. 等待跳转回 linux.do');
        console.log('\n登录成功后，脚本会自动保存 Cookie 并关闭浏览器');
        console.log('（大约需要 2 分钟）\n');
        
        // 等待用户完成登录
        let loginSuccess = false;
        const maxWait = 180; // 最多等待 3 分钟
        
        for (let i = 0; i < maxWait; i++) {
            await page.waitForTimeout(1000);
            const url = page.url();
            
            // 检查是否回到 linux.do 且不在登录页
            if (url.includes('linux.do') && !url.includes('/login')) {
                loginSuccess = true;
                break;
            }
            
            // 每 10 秒提示一次
            if (i > 0 && i % 10 === 0) {
                console.log(`  等待中... (${i}s / ${maxWait}s)`);
            }
        }
        
        if (loginSuccess) {
            console.log('\n✅ 检测到登录成功！');
            
            // 等待一下确保 Cookie 完全设置
            await page.waitForTimeout(2000);
            
            // 保存 Cookie
            console.log('正在保存 Cookie...');
            const cookies = await page.cookies();
            const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
            fs.writeFileSync(COOKIE_FILE, cookieString);
            
            console.log(`✓ 已保存 ${cookies.length} 个 Cookie`);
            console.log(`✓ 文件位置: ${COOKIE_FILE}\n`);
            
            // 显示重要的 Cookie
            const importantCookies = cookies.filter(c => 
                c.name === '_t' || c.name === '_forum_session'
            );
            
            if (importantCookies.length > 0) {
                console.log('重要的 Cookie:');
                importantCookies.forEach(c => {
                    console.log(`  ${c.name}: ${c.value.substring(0, 50)}...`);
                });
            }
            
            // 截图
            const screenshot = path.join(LOGS_DIR, 'login_success_simple.png');
            await page.screenshot({ path: screenshot, fullPage: true });
            console.log(`\n✓ 截图: ${screenshot}`);
            
            console.log('\n现在可以测试 Cookie 是否有效：');
            console.log('  node test_specific_topic_1590573.js');
            
        } else {
            console.log('\n⏱️  等待超时');
            console.log('如果你还在登录过程中，可以重新运行脚本');
            
            const screenshot = path.join(LOGS_DIR, 'login_timeout_simple.png');
            await page.screenshot({ path: screenshot, fullPage: true });
            console.log(`截图: ${screenshot}`);
        }

    } catch (e) {
        console.error('\n❌ 错误:', e.message);
        
        if (browser) {
            try {
                const pages = await browser.pages();
                if (pages.length > 0) {
                    const screenshot = path.join(LOGS_DIR, 'login_error_simple.png');
                    await pages[0].screenshot({ path: screenshot, fullPage: true });
                    console.log('错误截图:', screenshot);
                }
            } catch (err) {
                // 忽略
            }
        }
    } finally {
        if (browser) {
            await browser.close();
            console.log('\n浏览器已关闭');
        }
    }
}

if (require.main === module) {
    simpleLogin();
}

module.exports = { simpleLogin };
