const { CommandHandler, Command, Module } = require('./handler'),
      package = require('./package.json'),
      Discord = require('discord.js'),
      config = require('config'),
      klaw = require('klaw'),
      path = require('path')
      fs = require('fs')

const client = new Discord.Client({
  fetchAllMembers: true,
  disableEveryone: true
})

/*------------------------------------------*/
/*               Default stuff              */
/*------------------------------------------*/

const handler = new CommandHandler({
  client,
  name: config.get('bot.name'),
  owner: config.get('bot.owner'),
  prefix: config.get('bot.prefix')
})
/* I'm sorry */
global.build = {
  package: package,
  version: package.version
}

config.get('modules').forEach((mod) => {
  handler.registerModule(new Module(mod.id, {
    name: mod.name
  }))
})

fs.readdir(path.join(__dirname, 'events'), (err, files) => {
  if (err) return console.error('Event register error', err)
  files.forEach((file) => {
    client.on(file.split('.')[0], (...args) => {
      let module = require(path.join(__dirname, 'events', file))
      if(file == 'message.js') {
        module(client, handler, ...args)
      } else {
        module(client, ...args)        
      }
    })
  })
})

const items = []
klaw(path.join(__dirname, 'commands'))
  .on('data', item => items.push(item.path))
  .on('error', (err, item) => console.error('Command registerer error', err, item.path))
  .on('end', () => {
    items.forEach((file) => {
      if(!file.endsWith('.js')) return
      let p = file
      let cmd = new (require(p))()
      cmd.path = p
      handler.registerCommand(cmd)
    })
  })

client.login(config.get('bot.token'))