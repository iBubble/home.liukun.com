const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const COOKIE_FILE = path.join(__dirname, 'linuxdo_cookie.txt');
const PROXY_PORT = 7940;

function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

async function curlWithProxy(url, cookie) {
    return new Promise((resolve, reject) => {
        const curlArgs = [
            '-s', '-L', '--verbose',
            '-H', 'Accept: application/json',
            '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            '-x', `http://127.0.0.1:${PROXY_PORT}`,
            '-H', `Cookie: ${cookie}`,
            url
        ];

        log(`执行 curl: ${url}`);
        const child = spawn('curl', curlArgs);

        let data = '';
        let err = '';
        child.stdout.on('data', chunk => data += chunk);
        child.stderr.on('data', chunk => err += chunk);

        child.on('close', (code) => {
            console.log('--- STDERR ---');
            console.log(err);
            console.log('--- END STDERR ---');
            if (code === 0) resolve(data);
            else reject(new Error(`Exit code ${code}`));
        });
    });
}

const cookie = fs.readFileSync(COOKIE_FILE, 'utf8').trim();
curlWithProxy('https://linux.do/tag/%E8%AE%A2%E9%98%85%E8%8A%82%E7%82%B9.json', cookie)
    .then(data => {
        console.log('--- DATA ---');
        console.log(data);
        console.log('--- END DATA ---');
        try {
            const json = JSON.parse(data);
            console.log(`成功获取主题列表: ${json.topic_list.topics.length} 个主题`);
            json.topic_list.topics.forEach((t, i) => {
                console.log(`${i + 1}. [${t.id}] ${t.title}`);
            });
        } catch (e) {
            console.log('解析 JSON 失败');
        }
    })
    .catch(err => console.error(err));
