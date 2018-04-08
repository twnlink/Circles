module.exports = {
  apps: [{
    name: 'Circles',
    script: 'index.js',
    instance_var: 'CIRCLES',
    env_production: {
      NODE_ENV: 'production'
    }
  }],
  deploy: {
    production: {
      user: 'node',
      host: 'winter.fury.fun',
      ref: 'origin/master',
      repo: 'git@github.com:FNCxPro/Circles.git',
      path: '/home/node/circles',
      'post-deploy' : 'yarn install && pm2 reload ecosystem.config.js --env production'
    }
  }
}