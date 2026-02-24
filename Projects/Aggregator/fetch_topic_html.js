const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testLinuxDo() {
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--proxy-server=http://127.0.0.1:7940'
        ]
    });
    
    try {
        const page = (await browser.pages())[0];
        
        let cookieRaw = fs.readFileSync('linuxdo_cookie.txt', 'utf8').trim();
        let cookiePairs = cookieRaw.split(';').map(p => p.trim());
        let cookies = [];
        for (let p of cookiePairs) {
            if (!p) continue;
            let idx = p.indexOf('=');
            if (idx > -1) {
                let name = p.substring(0, idx);
                let value = p.substring(idx + 1);
                cookies.push({
                    name, 
                    value, 
                    domain: '.linux.do'
                });
            }
        }
        
        await page.setCookie(...cookies);
        
        await page.goto('https://linux.do/t/topic/1638381', { waitUntil: 'networkidle2', timeout: 30000 });
        let html = await page.content();
        
        console.log(`HTML Length: ${html.length}`);
        let nodesMatch = html.match(/vmess:\/\/[a-zA-Z0-9+=]+/g) || [];
        console.log(`Found node counts: ${nodesMatch.length}`);
        if(nodesMatch.length > 0) {
           console.log(nodesMatch[0]);
        } else {
           console.log("No nodes found. Dumping some text for debugging:");
           let text = await page.evaluate(() => document.body.innerText);
           console.log(text.substring(0, 500));
        }

    } catch (e) {
        console.error("Puppeteer fail:", e);
    } finally {
        await browser.close();
    }
}
testLinuxDo();
