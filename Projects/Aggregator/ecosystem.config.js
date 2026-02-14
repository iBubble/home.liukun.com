module.exports = {
  apps: [
    {
      name: 'aggregator',
      script: 'app.js',
      cwd: '/www/wwwroot/ibubble.vicp.net/Projects/Aggregator',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      autorestart: true,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    {
      name: 'node-validator',
      script: 'node_validator_service.js',
      cwd: '/www/wwwroot/ibubble.vicp.net/Projects/Aggregator',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '300M',
      autorestart: true,
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/validator-error.log',
      out_file: './logs/validator-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
