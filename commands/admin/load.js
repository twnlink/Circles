const path = require('path')
const { Command } = require('../../handler')

module.exports = class LoadCommand extends Command {
  constructor() {
    super('load', {
      name: 'load',
      description: 'Load commands',
      module: 'admin',
      ownerOnly: true
    })
  }
  async run(args, msg, api) {
    let p = `./${args[0]}.js`
    let cmd = new (require(p))()
    cmd.path = p
    this.handler.registerCommand(cmd)
    return {
      embed: api.success(`Command \`${args[0]}\` loaded sucessfully!`, msg.author)
    }
  }
}