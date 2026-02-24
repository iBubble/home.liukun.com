const fs = require('fs');
const https = require('https');
const { SocksProxyAgent } = require('socks-proxy-agent');
const yaml = require('js-yaml');
const { spawn } = require('child_process');
const path = require('path');

const CLASH_DIR = path.join(__dirname, 'clash_bin');
const CLASH_BIN = path.join(CLASH_DIR, 'clash-linux-amd64');
const TEST_PORT_SOCKS = 7957;

async function run() {
    const proxiesFile = path.join(__dirname, 'premium_nodes.json');
    const premiumData = JSON.parse(fs.readFileSync(proxiesFile, 'utf8'));
    // 我们用一个香港的
    const proxy = premiumData.nodes.find(n => n.name.includes('香港') || n.name.includes('HK')) || premiumData.nodes[0];
    
    console.log(`Using node: ${proxy.name}`);
    const config = {
        port: TEST_PORT_SOCKS-1,
        'socks-port': TEST_PORT_SOCKS,
        'allow-lan': false,
        mode: 'rule',
        'log-level': 'silent',
        proxies: [proxy],
        'proxy-groups': [{
            name: 'test',
            type: 'select',
            proxies: [proxy.name]
        }],
        rules: ['MATCH,test']
    };
    
    const configPath = path.join(CLASH_DIR, 'tmp_specific.yaml');
    fs.writeFileSync(configPath, yaml.dump(config));
    
    const clash = spawn(CLASH_BIN, ['-d', CLASH_DIR, '-f', configPath]);
    
    await new Promise(r => setTimeout(r, 3000));
    
    const agent = new SocksProxyAgent(`socks5://127.0.0.1:${TEST_PORT_SOCKS}`);
    const cookie = fs.readFileSync('linuxdo_cookie.txt','utf8').trim();

    const options = {
        hostname: 'linux.do',
        port: 443,
        path: '/t/topic/1638381.json',
        method: 'GET',
        agent: agent,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Accept-Language': 'zh-CN,zh;q=0.9',
            'Cookie': cookie
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            console.log(`Status Code: ${res.statusCode}`);
            if (data.includes('errors')) {
                console.log('Errors found or Cloudflare challenge:');
                console.log(data.substring(0, 500));
            } else {
                try {
                    const json = JSON.parse(data);
                    console.log(`Success! Posts count: ${json.post_stream?.posts?.length}`);
                } catch(e) {
                    console.log(`Failed to parse json. First 200 chars: ${data.substring(0,200)}`);
                }
            }
            clash.kill();
        });
    });

    req.on('error', (e) => {
        console.error(e);
        clash.kill();
    });
    
    req.end();
}

run();
