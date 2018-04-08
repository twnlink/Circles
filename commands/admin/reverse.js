const { Command } = require('../../handler')
const config = require('config')
const db = require('../../db')

module.exports = class ReverseCommand extends Command {
  constructor() {
    super('reverse', {
      name: 'Reverse',
      description: 'Reverses a betrayal.',
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
    const guild = msg.guild
    let id = args.id.value
    let circle = await db.getCircle(id)
    circle.betrayed = false
    await circle.push()
    const perms = [{
      deny: ['VIEW_CHANNEL'],
      id: config.get('ids.server')
    },
    {
      allow: ['VIEW_CHANNEL'],
      id: msg.author.id
    }]
    circle.members.forEach((member) => {
      perms.push({
        allow: ['VIEW_CHANNEL'],
        id: member
      })
    })
    const channel = await guild.createChannel(circle.name.replaceAll(' ', '-'), 'text', perms)
    channel.setParent(config.get('ids.category'))
    let message = await channel.send(`Your circle's betrayal was reversed! 🎉\nYour circle's ID is: **${circle.id}**\nYour circle's key is: **${circle.key}**`)
    message.pin()
    return api.success('The betrayal was reversed successfully wew')
  }
}