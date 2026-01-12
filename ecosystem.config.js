const path = require('path');

const baseDir = __dirname;

module.exports = {
  apps: [
    {
      name: 'rina-client',
      script: 'pnpm',
      args: process.env.NODE_ENV === 'production' ? 'start -- -p 2222' : 'dev',
      cwd: path.join(baseDir, 'apps/client'),
      interpreter: 'none',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      error_file: path.join(baseDir, 'logs/pm2-client-error.log'),
      out_file: path.join(baseDir, 'logs/pm2-client-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'rina-server',
      script: 'pnpm',
      args: process.env.NODE_ENV === 'production' ? 'start' : 'dev',
      cwd: path.join(baseDir, 'apps/server'),
      interpreter: 'none',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      error_file: path.join(baseDir, 'logs/pm2-server-error.log'),
      out_file: path.join(baseDir, 'logs/pm2-server-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};