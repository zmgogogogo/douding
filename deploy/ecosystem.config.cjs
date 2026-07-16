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
        JWT_SECRET: process.env.JWT_SECRET || '',
      },
      max_memory_restart: '512M',
      error_file: '/var/log/douding/error.log',
      out_file: '/var/log/douding/out.log',
      merge_logs: true,
      time: true,
    },
  ],
}
