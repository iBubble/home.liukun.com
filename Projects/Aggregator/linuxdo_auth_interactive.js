const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CONFIG_FILE = path.join(__dirname, 'email_config.json');
const COOKIE_FILE = path.join(__dirname, 'linuxdo_cookie.txt');
const CHROME_PATH = '/usr/bin/google-chrome';
const LOGS_DIR = path.join(__dirname, 'logs');

// 确保 logs 目录存在
if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// 创建 readline 接口
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

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

// 询问用户输入
function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}

async function loginLinuxDo() {
    const config = getConfig();
    if (!config) {
        rl.close();
        process.exit(1);
    }

    console.log('========================================');
    console.log('  Linux.do 交互式登录（支持 2FA）');
    console.log('========================================\n');
    console.log('Gmail 账号:', config.email);
    console.log('代理: http://127.0.0.1:7940\n');
    
    let browser = null;

    try {
        const proxyServer = 'http://127.0.0.1:7940';
        
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
        console.log('[1/7] 访问 linux.do/login...');
        await page.goto('https://linux.do/login', { 
            waitUntil: 'domcontentloaded', 
            timeout: 60000 
        });
        console.log('✓ 页面加载成功\n');

        // 2. 点击 Google 登录
        console.log('[2/7] 点击 Google 登录按钮...');
        await page.waitForTimeout(3000);
        
        const buttons = await page.$$('button');
        for (const btn of buttons) {
            const text = await page.evaluate(el => el.textContent, btn);
            if (text && text.toLowerCase().includes('google')) {
                await btn.click();
                break;
            }
        }
        console.log('✓ 已点击\n');

        // 3. 等待跳转到 Google
        console.log('[3/7] 等待跳转到 Google...');
        await page.waitForTimeout(5000);
        console.log('✓ 已跳转\n');

        // 4. 输入邮箱
        console.log('[4/7] 输入 Gmail 账号...');
        const emailSelector = 'input[type="email"]';
        await page.waitForSelector(emailSelector, { timeout: 10000 });
        await page.type(emailSelector, config.email, { delay: 100 });
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);
        console.log('✓ 已输入邮箱\n');

        // 5. 输入密码
        console.log('[5/7] 输入密码...');
        const passwordSelector = 'input[type="password"]';
        await page.waitForSelector(passwordSelector, { timeout: 10000 });
        await page.type(passwordSelector, config.password, { delay: 100 });
        await page.keyboard.press('Enter');
        await page.waitForTimeout(5000);
        console.log('✓ 已输入密码\n');

        // 6. 检查是否需要 2FA
        console.log('[6/7] 检查是否需要二次验证...');
        
        const currentUrl = page.url();
        console.log('当前 URL:', currentUrl.substring(0, 100) + '...\n');
        
        // 截图当前状态
        const screenshot = path.join(LOGS_DIR, 'before_2fa.png');
        await page.screenshot({ path: screenshot, fullPage: true });
        console.log('✓ 截图已保存:', screenshot);
        
        // 检查页面内容
        const pageText = await page.evaluate(() => document.body.innerText);
        
        if (pageText.includes('验证') || pageText.includes('verify') || 
            pageText.includes('code') || pageText.includes('2-Step') ||
            currentUrl.includes('challenge')) {
            
            console.log('\n⚠️  需要二次验证！');
            console.log('请打开 Google Authenticator 获取验证码\n');
            
            // 询问验证码
            const code = await askQuestion('请输入 6 位验证码: ');
            
            if (code && code.length === 6) {
                console.log('\n正在输入验证码...');
                
                // 查找验证码输入框
                const codeInputs = await page.$$('input[type="tel"], input[type="text"], input[type="number"]');
                
                if (codeInputs.length > 0) {
                    // 尝试输入到第一个输入框
                    await codeInputs[0].click();
                    await page.keyboard.type(code, { delay: 100 });
                    console.log('✓ 已输入验证码');
                    
                    // 等待一下，看是否自动提交
                    await page.waitForTimeout(2000);
                    
                    // 如果没有自动提交，尝试按回车或点击下一步按钮
                    try {
                        await page.keyboard.press('Enter');
                    } catch (e) {
                        // 尝试查找并点击"下一步"按钮
                        const nextButtons = await page.$$('button');
                        for (const btn of nextButtons) {
                            const text = await page.evaluate(el => el.textContent, btn);
                            if (text && (text.includes('Next') || text.includes('下一步') || text.includes('继续'))) {
                                await btn.click();
                                break;
                            }
                        }
                    }
                } else {
                    console.log('⚠️  未找到验证码输入框，请检查截图');
                }
                
            } else {
                console.log('❌ 验证码格式不正确');
                throw new Error('验证码无效');
            }
        } else {
            console.log('✓ 无需二次验证（或已通过）\n');
        }

        // 7. 等待登录完成
        console.log('\n[7/7] 等待登录完成...');
        
        // 等待最多 30 秒，检查是否返回 linux.do
        let loginSuccess = false;
        for (let i = 0; i < 30; i++) {
            await page.waitForTimeout(1000);
            const url = page.url();
            
            if (url.includes('linux.do')) {
                loginSuccess = true;
                break;
            }
            
            if (i % 5 === 0) {
                console.log(`  等待中... (${i}s)`);
            }
        }
        
        if (loginSuccess) {
            console.log('\n✅ 登录成功！\n');
            
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
            
            // 最终截图
            const finalScreenshot = path.join(LOGS_DIR, 'login_success.png');
            await page.screenshot({ path: finalScreenshot, fullPage: true });
            console.log(`\n✓ 最终截图: ${finalScreenshot}`);
            
        } else {
            console.log('\n❌ 登录超时，未能返回 linux.do');
            console.log('当前 URL:', page.url());
            
            const failScreenshot = path.join(LOGS_DIR, 'login_timeout.png');
            await page.screenshot({ path: failScreenshot, fullPage: true });
            console.log('截图已保存:', failScreenshot);
        }

    } catch (e) {
        console.error('\n❌ 登录失败:', e.message);
        
        if (browser) {
            try {
                const page = (await browser.pages())[0];
                const errorScreenshot = path.join(LOGS_DIR, 'login_error.png');
                await page.screenshot({ path: errorScreenshot, fullPage: true });
                console.log('错误截图:', errorScreenshot);
            } catch (err) {
                // 忽略截图错误
            }
        }
    } finally {
        if (browser) {
            await browser.close();
        }
        rl.close();
        console.log('\n浏览器已关闭');
    }
}

if (require.main === module) {
    loginLinuxDo();
}

module.exports = { loginLinuxDo };
