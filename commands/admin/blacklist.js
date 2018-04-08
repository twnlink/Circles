const { Command } = require('../../handler')
const db = require('../../db')

module.exports = class BlacklistCommand extends Command {
  constructor() {
    super('blacklist', {
      name: 'Blacklist',
      description: 'Blacklist command',
      module: 'admin',
      ownerOnly: true,
      args: [{
        name: 'user',
        type: 'user',
        required: true
      }, {
        name: 'blacklist',
        type: 'string',
        default: 'true'
      }]
    })
  }
  async run(args, msg, api) {
    let toBlacklist = args.blacklist.value.startsWith('t')
    let user = await db.getUser(args.user.value)
    if (toBlacklist) {
      await user.blacklist()
    } else {
      await user.unblacklist()
    }
    return api.success('That mate was blacklisted bruv')
  }
}