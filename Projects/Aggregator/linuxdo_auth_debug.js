const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'email_config.json');
const COOKIE_FILE = path.join(__dirname, 'linuxdo_cookie.txt');
const CHROME_PATH = '/usr/bin/google-chrome';
const LOGS_DIR = path.join(__dirname, 'logs');

// 确保 logs 目录存在
if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// 获取配置
function getConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            if (config.linuxdo && config.linuxdo.email && config.linuxdo.password) {
                return config.linuxdo;
            }
        }
    } catch (e) { }
    console.error('Config missing or invalid. Please check email_config.json');
    return null;
}

async function loginLinuxDo() {
    const config = getConfig();
    if (!config) process.exit(1);

    console.log('========== Linux.do 登录调试 ==========\n');
    console.log('Gmail 账号:', config.email);
    
    let browser = null;

    try {
        const proxyServer = 'http://127.0.0.1:7940';
        console.log('代理服务器:', proxyServer);
        
        browser = await puppeteer.launch({
            executablePath: CHROME_PATH,
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--window-size=1280,800',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                `--proxy-server=${proxyServer}`
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // 1. 访问登录页
        console.log('\n步骤 1: 访问 linux.do/login...');
        try {
            await page.goto('https://linux.do/login', { 
                waitUntil: 'domcontentloaded', 
                timeout: 60000 
            });
            console.log('✓ 页面加载成功');
            
            // 截图
            const screenshot1 = path.join(LOGS_DIR, 'step1_login_page.png');
            await page.screenshot({ path: screenshot1, fullPage: true });
            console.log('✓ 截图保存:', screenshot1);
            
            // 获取页面内容
            const html = await page.content();
            fs.writeFileSync(path.join(LOGS_DIR, 'step1_page.html'), html);
            console.log('✓ 页面 HTML 已保存');
            
        } catch (e) {
            console.error('✗ 页面加载失败:', e.message);
            throw e;
        }

        // 2. 查找并点击 Google 登录按钮
        console.log('\n步骤 2: 查找 Google 登录按钮...');
        
        // 等待一下，让页面完全加载
        await page.waitForTimeout(3000);
        
        // 尝试多种选择器
        const selectors = [
            '.btn-social.google',
            'button[title*="Google"]',
            'button:has-text("Google")',
            '.oauth-login-button',
            '[data-provider="google"]'
        ];
        
        let clicked = false;
        for (const selector of selectors) {
            try {
                const btn = await page.$(selector);
                if (btn) {
                    console.log(`✓ 找到按钮: ${selector}`);
                    await btn.click();
                    clicked = true;
                    break;
                }
            } catch (e) {
                // 继续尝试下一个
            }
        }
        
        if (!clicked) {
            // 尝试通过文本查找
            console.log('尝试通过文本查找 Google 按钮...');
            const buttons = await page.$$('button');
            for (const btn of buttons) {
                const text = await page.evaluate(el => el.textContent, btn);
                if (text && text.toLowerCase().includes('google')) {
                    console.log(`✓ 找到包含 "Google" 的按钮: ${text}`);
                    await btn.click();
                    clicked = true;
                    break;
                }
            }
        }
        
        if (!clicked) {
            console.error('✗ 未找到 Google 登录按钮');
            
            // 列出所有按钮
            const allButtons = await page.$$eval('button', btns => 
                btns.map(b => ({ text: b.textContent, class: b.className, title: b.title }))
            );
            console.log('\n页面上的所有按钮:');
            console.log(JSON.stringify(allButtons, null, 2));
            
            throw new Error('找不到 Google 登录按钮');
        }
        
        console.log('✓ 已点击 Google 登录按钮');
        
        // 3. 等待跳转
        console.log('\n步骤 3: 等待跳转到 Google...');
        await page.waitForTimeout(5000);
        
        const currentUrl = page.url();
        console.log('当前 URL:', currentUrl);
        
        // 截图
        const screenshot2 = path.join(LOGS_DIR, 'step2_after_click.png');
        await page.screenshot({ path: screenshot2, fullPage: true });
        console.log('✓ 截图保存:', screenshot2);
        
        if (!currentUrl.includes('google.com') && !currentUrl.includes('accounts.google')) {
            console.error('✗ 未跳转到 Google 登录页');
            console.log('可能原因:');
            console.log('  1. 按钮点击失败');
            console.log('  2. 页面需要更长的加载时间');
            console.log('  3. 需要先登录 linux.do');
            
            const html2 = await page.content();
            fs.writeFileSync(path.join(LOGS_DIR, 'step2_page.html'), html2);
            
            throw new Error('未能跳转到 Google 登录页');
        }
        
        console.log('✓ 成功跳转到 Google 登录页');
        
        // 4. Google 登录流程
        console.log('\n步骤 4: 输入 Google 账号...');
        
        const emailSelector = 'input[type="email"]';
        await page.waitForSelector(emailSelector, { timeout: 10000 });
        await page.type(emailSelector, config.email, { delay: 100 });
        console.log('✓ 已输入邮箱');
        
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);
        
        // 截图
        const screenshot3 = path.join(LOGS_DIR, 'step3_after_email.png');
        await page.screenshot({ path: screenshot3, fullPage: true });
        console.log('✓ 截图保存:', screenshot3);
        
        // 5. 输入密码
        console.log('\n步骤 5: 输入密码...');
        
        const passwordSelector = 'input[type="password"]';
        await page.waitForSelector(passwordSelector, { timeout: 10000 });
        await page.type(passwordSelector, config.password, { delay: 100 });
        console.log('✓ 已输入密码');
        
        await page.keyboard.press('Enter');
        
        // 6. 等待登录完成
        console.log('\n步骤 6: 等待登录完成...');
        await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 });
        
        const finalUrl = page.url();
        console.log('最终 URL:', finalUrl);
        
        // 截图
        const screenshot4 = path.join(LOGS_DIR, 'step4_final.png');
        await page.screenshot({ path: screenshot4, fullPage: true });
        console.log('✓ 截图保存:', screenshot4);
        
        if (finalUrl.includes('linux.do')) {
            console.log('\n✅ 登录成功！正在保存 Cookie...');
            
            const cookies = await page.cookies();
            const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
            fs.writeFileSync(COOKIE_FILE, cookieString);
            
            console.log(`✓ 已保存 ${cookies.length} 个 Cookie 到 ${COOKIE_FILE}`);
            console.log('\n重要的 Cookie:');
            cookies.forEach(c => {
                if (c.name === '_t' || c.name === '_forum_session') {
                    console.log(`  ${c.name}: ${c.value.substring(0, 50)}...`);
                }
            });
            
        } else {
            console.error('✗ 登录后未返回 linux.do');
            console.log('当前 URL:', finalUrl);
        }

    } catch (e) {
        console.error('\n❌ 登录失败:', e.message);
        console.error('详细错误:', e);
    } finally {
        if (browser) {
            await browser.close();
            console.log('\n浏览器已关闭');
        }
    }
}

if (require.main === module) {
    loginLinuxDo();
}

module.exports = { loginLinuxDo };
