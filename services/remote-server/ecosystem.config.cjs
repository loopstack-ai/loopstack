/* eslint-disable no-undef */
module.exports = {
  apps: [
    {
      name: 'custom-app',
      script: 'dist/main.js',
      cwd: (process.env.WORKSPACE_ROOT || '/workspace') + '/app',
      env: { PORT: '3000', HOST: '0.0.0.0', NODE_ENV: 'development' },
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,
      merge_logs: true,
    },
  ],
};
