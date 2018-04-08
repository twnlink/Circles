const { Command, CommandAPI } = require('../../handler')
const log = require('../../logger')
const vm = require('vm')
const config = require('config')
const store = {}

module.exports = class REPLCommand extends Command {
  constructor() {
    super('repl', {
      name: 'repl',
      description: 'REPL',
      module: 'admin',
      ownerOnly: true
    })

  }
  postConstruct(handler) {
    global.replEvent = function(msg) {
      const api = new CommandAPI(msg, handler, this, 'sp.')
      if(msg.author.id === config.get('bot.owner')) {
        // Bot owner message received
        if(store[msg.channel.id]) {
          if(msg.content.indexOf('repl disable') !== -1) return
          try {
            const mstore = store[msg.channel.id]
            const context = mstore.sandbox
            const code = msg.content
            const resp = vm.runInContext(code, context)
            mstore.sandbox = context
            mstore.sandbox._ = resp
            store[msg.channel.id] = mstore
            let res = resp
            if(typeof res === 'object') {
              res = JSON.stringify(res, null, 2)
            }
            const embed = api.success('Evaluation success', msg.author)
            embed.setTitle(`<:script:380455368758657035> \`Eval Succeeded\``)
            embed.setDescription(`\`\`\`${res}\`\`\``)
            msg.channel.send({embed})
          } catch(err) {
            console.error(err)
            const embed = api.error('Evaluation failed', msg.author)
            embed.setTitle(`<:script:380455368758657035> \`Eval Failed\``)
            embed.setDescription(`An error occurred while evaluating your script.\n\`\`\`${err.stack || err.message}\`\`\``)
            msg.channel.send({embed})
          }
        }
      }
    }
    if(!global.replSetup) {
      this.handler.client.on('message', global.replEvent)
      global.replSetup = true
    }
  }
  async run(args, msg, api) {
    if(args[0] === 'enable') {
      if(store[msg.channel.id]) {
        return api.error('The REPL is already enabled for the current channel', msg.author)
      }
      //const duser = await db.getUser(msg.author)
      const defContext = {
        user: msg.author,
        //duser: duser,
        Discord: require('discord.js'),
        require: require,
        _global: global,
        client: api.handler.client,
        channel: msg.channel,
        send: (message) => {
          console.log(message)
          if(typeof message === 'object') {
            return msg.channel.send(JSON.stringify(message, null, 4), {
              code: 'json'
            })
          } else {
            return msg.channel.send(message, {
              code: true
            })
          }
        }
      }
      store[msg.channel.id] = {
        user: msg.author,
        sandbox: vm.createContext(defContext)
      }
      return api.success('The REPL was enabled for the current channel', msg.author)
    } else if(args[0] === 'disable') {
      if(typeof store[msg.channel.id] === 'undefined') {
        return api.error('The REPL isn\'t enabled for the current channel', msg.author)
      }
      store[msg.channel.id] = undefined
      return api.success('The REPL was disabled for the current channel', msg.author)
    }
    return api.error('Arguments: repl [setup/enable/disable]', msg.author)
  }
}