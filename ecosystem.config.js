module.exports = {
  apps: [{
    name: "surau-quran-api",
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
};