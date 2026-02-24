const fs = require('fs');
const yaml = require('js-yaml');

const premiumData = JSON.parse(fs.readFileSync('premium_nodes.json', 'utf8'));
const nodes = premiumData.nodes.filter(n => {
    const name = n.name || '';
    return (name.includes('香港') || name.includes('HK') || name.includes('日本') || name.includes('JP') || name.includes('美国') || name.includes('US')) && !name.includes('防失联');
}).slice(0, 15);

console.log('Selected', nodes.length, 'nodes');

const config = {
    port: 7939,
    'socks-port': 7940,
    'allow-lan': false,
    mode: 'rule',
    'log-level': 'silent',
    proxies: nodes,
    'proxy-groups': [{
        name: 'PROXY',
        type: 'url-test',
        url: 'http://www.gstatic.com/generate_204',
        interval: 300,
        proxies: nodes.map(n => n.name)
    }],
    rules: ['MATCH,PROXY']
};

fs.writeFileSync('clash_data/browser_proxy.yaml', yaml.dump(config));
console.log('Saved to clash_data/browser_proxy.yaml');
