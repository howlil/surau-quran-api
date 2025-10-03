module.exports = {
  apps: [{
    name: "api",
    script: "./index.js",
    exec_mode: "fork",
    instances: 1,
    autorestart: true,
    watch: false,
    node_args: "--es-module-specifier-resolution=node", 
    env: {
      NODE_ENV: "production",
      PORT: 5000
    }
  }]
};a