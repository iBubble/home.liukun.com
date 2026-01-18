module.exports = {
  apps: [{
    name: 'luckycoin-dev',
    script: 'npm',
    args: 'run dev',
    cwd: '/www/wwwroot/ibubble.vicp.net/Projects/LuckyCoin/lucky-coin-website',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 5173
    },
    error_file: '/www/wwwroot/ibubble.vicp.net/Projects/LuckyCoin/lucky-coin-website/logs/error.log',
    out_file: '/www/wwwroot/ibubble.vicp.net/Projects/LuckyCoin/lucky-coin-website/logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    // 开机自启动
    startup: true
  }]
};
