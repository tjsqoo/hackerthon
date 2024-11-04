let ignoreWatch = [
    'node_modules',
    'logs',
    'pids',
    'public/*',
    'views/*',
    '*.png',
]

module.exports = {
    apps: [
        {
            name: 'flow-mail',
            script: './index.js',
            watch: false,
            log_date_format: 'YYYY-MM-DD(HH:mm:ss)',
            out_file: '/logs/out.log',
            error_file: '/logs/error.log',
            pid_file: './pids/chat.pid',
            ignore_watch: ignoreWatch,
            // cluster
            instances: 1,
            exec_mode: 'cluster',
            env_port: '7821',
            increment_var: 'PORT',
            env: {
                NODE_ENV: 'production',
                PORT: 8080,
            },
            env_development: {
                NODE_ENV: 'development',
                PORT: 8080,
            }
        }
    ]
};