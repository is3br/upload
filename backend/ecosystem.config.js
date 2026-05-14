module.exports = {
  apps: [
    {
      name: "media-vault",
      script: "server.js",
      cwd: "/var/www/media-vault/backend",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      // Load .env file
      env_file: "/var/www/media-vault/backend/.env",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      error_file: "/var/log/media-vault/error.log",
      out_file: "/var/log/media-vault/out.log",
    },
  ],
};
