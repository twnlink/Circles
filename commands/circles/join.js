const { Command } = require('../../handler')
const { RichEmbed } = require('discord.js')
const { Colors } = require('../../handler/Constants')
const db = require('../../db')
const config = require('config')
const utils = require('../../utils')

module.exports = class JoinCommand extends Command {
  constructor() {
    super('join', {
      name: 'Join',
      description: 'Join a circle',
      module: 'circles',
      ownerOnly: false,
      args: [{
        name: 'id',
        type: 'string',
        required: true,
        description: 'The ID of the circle'
      }, {
        name: 'key',
        type: 'string',
        required: true,
        multiword: true,
        description: 'The key for the circle'
      }]
    })
  }
  async run(args, msg, api) {
    if (msg.channel.type !== 'dm') {
      msg.delete()
      return api.error('This command can only be run in a DM with the bot.')
    }
    let guild = api.handler.client.guilds.get(config.get('ids.server'))

    const circle = await db.getCircle(args.id.value)
    if (!circle) return api.error('That circle doesn\'t exist.')
    if (args.key.value !== circle.key) return api.error('The key you provided is invalid.')
    if (circle.members.indexOf(msg.author.id) !== -1) return api.error('You have already joined that circle.')
    if (circle.betrayed) return api.error('That circle has been betrayed.')
    circle.members.push(msg.author.id)
    await circle.push()
    const channel = guild.channels.get(circle.channel)
    await channel.overwritePermissions(msg.author, {
      VIEW_CHANNEL: true
    })
    let owner = await db.getUser(circle.owner)
    owner.members = owner.members + 1
    await owner.push()
    const embed = new RichEmbed()
    embed.setColor(Colors.green).setTitle('Circle Joined')
    embed.setAuthor(`${msg.author.username}#${msg.author.discriminator} (${msg.author.id})`, msg.author.displayAvatarURL)
    embed.setDescription('A circle was joined')
    embed.addField('Circle Name', circle.name)
    embed.addField('Circle ID', circle.id)
    embed.addField('Owner', `<@${circle.owner}>`)
    embed.addField('Joiner', `<@${msg.author.id}>`)

    logchan.send({embed})
    return api.success('You have joined that circle.')
  }
}