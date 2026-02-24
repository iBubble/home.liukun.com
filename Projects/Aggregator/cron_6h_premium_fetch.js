const fs = require('fs');
const { spawn } = require('child_process');
const yaml = require('js-yaml');
const path = require('path');

const NEW_SUB = "https://16412.nginx24ppy.xyz/link/hXvsVfrh8PP0ViD3?clash=1";
const PREMIUM_NODES_FILE = path.join(__dirname, 'premium_nodes.json');

function log(msg) {
    console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function runFetch() {
    log("=== Running 6h fetch from new subscription ===");
    
    return new Promise((resolve) => {
        const curl = spawn('curl', ['-s', '-L', NEW_SUB]);
        
        let data = '';
        curl.stdout.on('data', chunk => data += chunk);
        
        curl.on('close', (code) => {
            if (code !== 0) {
                log(`Failed to fetch sub, curl code: ${code}`);
                return resolve();
            }
            try {
                const config = yaml.load(data);
                if (config && config.proxies && Array.isArray(config.proxies)) {
                    log(`Success: Downloaded ${config.proxies.length} proxies from new subscription.`);
                    
                    fs.writeFileSync(PREMIUM_NODES_FILE, JSON.stringify({
                        updated_at: new Date().toISOString(),
                        source: NEW_SUB,
                        node_count: config.proxies.length,
                        nodes: config.proxies
                    }, null, 2));
                    log("Saved to " + PREMIUM_NODES_FILE);
                    
                    // Trigger aggregator reload if we want, or just wait for it to reload itself.
                    // Let's reload premium proxy manager in aggregator by sending signal, 
                    // or pm2 restart it if it's managed via pm2 
                    // pm2 reload aggregator
                    log("You might want to restart pm2 aggregator to pick up new premium proxies immediately.");
                    
                } else {
                    log("Downloaded data is not valid clash YAML.");
                }
            } catch (e) {
                log("Failed to process downloaded data: " + e.message);
            }
            resolve();
        });
    });
}

function main() {
    runFetch()
        .then(() => {
            log("Finished fetch once.");
            // Don't keep running since pm2 handles cron scheduling or we use node-cron
            process.exit(0);
        })
        .catch(err => {
            log(err.message);
            process.exit(1);
        });
}

main();

