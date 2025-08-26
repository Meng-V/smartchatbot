// PM2 Configuration for Production (Alternative to Docker)
module.exports = {
  apps: [{
    name: 'smartchatbot',
    script: 'dist/main.js',
    instances: 4, // Use all CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // Auto-restart configuration
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '512M',
    
    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Health monitoring
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    
    // Performance
    node_args: '--max-old-space-size=512'
  }]
};
