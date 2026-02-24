const axios = require('axios');
const fs = require('fs');

async function test() {
    const cookie = fs.readFileSync('linuxdo_cookie.txt', 'utf8').trim();
    try {
        const response = await axios.get('https://linux.do/t/topic/1638381.json', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Cookie': cookie,
                'Accept': 'application/json'
            },
            // We use standard axios proxy if needed, but let's try direct first since we use v2ray at 20170 or clash at 7890 if any
            proxy: {
                host: '127.0.0.1',
                port: 20170, // Host's working v2ray proxy for testing bypass
                protocol: 'http'
            }
        });
        console.log("Success! Data length:", JSON.stringify(response.data).length);
        console.log("First 200 chars:", JSON.stringify(response.data).substring(0, 200));
    } catch (e) {
        console.error("Error:", e.message);
        if (e.response) {
            console.error("Status:", e.response.status);
            console.error("Data:", typeof e.response.data === 'string' ? e.response.data.substring(0, 300) : e.response.data);
        }
    }
}
test();
