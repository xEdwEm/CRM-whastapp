const path = require('path')

module.exports = {
  apps: [
    {
      name: 'wacrm',
      script: 'npm',
      args: 'run start -- --hostname 0.0.0.0 --port 3000',
      cwd: path.resolve(__dirname),
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        HOSTNAME: '0.0.0.0'
      },
      autorestart: true,
      watch: false,
      max_restarts: 10
    }
  ]
}
