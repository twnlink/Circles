const { Command } = require('../../handler')
const db = require('../../db')
const config = require('config')
const utils = require('../../utils')
const {RichEmbed} = require('discord.js')
const {Colors} = require('../../handler/Constants')

module.exports = class BetrayCommand extends Command {
  constructor() {
    super('betray', {
      name: 'Betray',
      description: 'Betray a circle',
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
    const guild = api.handler.client.guilds.get(config.get('ids.server'))
    const circle = await db.getCircle(args.id.value)
    if (!circle) return api.error('That circle doesn\'t exist.')
    if (args.key.value !== circle.key) return api.error('The key you provided is invalid.')
    if (circle.members.indexOf(msg.author.id) !== -1) return api.error('You have already joined that circle.')
    if (circle.betrayed) return api.error('That circle has already been betrayed.')

    await circle.betray(msg.author)
    let channel = guild.channels.get(circle.channel)
    await guild.members.get(circle.owner).send(`Your circle was betrayed with ${circle.members.length} members in it :(`)
    await channel.delete()
    await guild.members.get(msg.author.id).addRole('431868770760392704')

    const embed = new RichEmbed()
    embed.setColor(Colors.red).setTitle('Circle Betrayed')
    embed.setAuthor(`${msg.author.username}#${msg.author.discriminator} (${msg.author.id})`, msg.author.displayAvatarURL)
    embed.setDescription('A circle was betrayed')
    embed.addField('Circle Name', circle.name)
    embed.addField('Circle ID', circle.id)
    embed.addField('Owner', `<@${circle.owner.id}>`)
    embed.addField('Betrayer', `<@${msg.author.id}>`)
    logchan.send({embed})
    return api.success('The circle was betrayed.')
  }
}