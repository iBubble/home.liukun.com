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
            '-s', '-L',
            '-H', 'Accept: application/json',
            '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            '-x', `http://127.0.0.1:${PROXY_PORT}`,
            '-H', `Cookie: ${cookie}`,
            url
        ];

        const child = spawn('curl', curlArgs);
        let data = '';
        child.stdout.on('data', chunk => data += chunk);
        child.on('close', (code) => {
            if (code === 0) resolve(data);
            else reject(new Error(`Exit code ${code}`));
        });
    });
}

const cookie = fs.readFileSync(COOKIE_FILE, 'utf8').trim();
const topicId = process.argv[2] || '1381890';

curlWithProxy(`https://linux.do/t/topic/${topicId}.json`, cookie)
    .then(data => {
        console.log('RAW DATA:', data.substring(0, 500));
        const json = JSON.parse(data);
        console.log(`主题: ${json.title}`);
        const posts = json.post_stream.posts;
        posts.forEach((post, i) => {
            console.log(`--- POST ${i + 1} ---`);
            console.log(post.cooked);
        });
    })
    .catch(err => console.error(err));
