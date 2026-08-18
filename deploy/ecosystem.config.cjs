module.exports = {
  apps: [
    {
      name: 'douding',
      cwd: '/var/www/douding',
      script: 'server/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3456,
        JWT_SECRET: 'douding-jwt-secret-change-me-in-production',
        JWT_ADMIN_SECRET: 'douding-admin-jwt-secret-change-me',
      },
      max_memory_restart: '512M',
      error_file: '/var/log/douding/error.log',
      out_file: '/var/log/douding/out.log',
      merge_logs: true,
      time: true,
    },
  ],
}
