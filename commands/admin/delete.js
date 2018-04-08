const { Command } = require('../../handler')
const db = require('../../db')
module.exports = class PingCommand extends Command {
  constructor() {
    super('delete', {
      name: 'Delete',
      description: 'Deletes a circle',
      module: 'admin',
      ownerOnly: true,
      args: [{
        name: 'id',
        type: 'string',
        required: true
      }]
    })
  }
  async run(args, msg, api) {
    const circle = await db.getCircle(args.id.value)
    if (!circle) return api.error('That circle doesn\'t exist bud')
    await msg.guild.channels.get(circle.channel).delete()
    await db.deleteCircle(args.id.value)
    return api.success('That circle was deleted')
  }
}