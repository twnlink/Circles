const { Command } = require('../../handler')
const db = require('../../db')
const Discord = require('discord.js')

module.exports = class ListCommand extends Command {
  constructor() {
    super('list', {
      name: 'List',
      description: 'List all circles',
      module: 'circles',
      args: [{
        name: 'mode',
        type: 'string',
        required: false,
        default: 'default',
        description: 'default - default sorting, members - sort by member count'
      }],
      ownerOnly: false
    })
  }
  async run(args, msg, api) {
    let circles = await db.r.table('circles').run()
    let buf = '⛔ = Betrayed\n--==: **Circles** :==--\n'
    if (args.mode.value == 'members') {
      circles.sort(function(a, b){
        let keyA = a.members.length || 0
        let keyB = b.members.length || 0
        if(keyA > keyB) return -1
        if(keyA < keyB) return 1
        return 0
      })
    }
    circles.forEach((circle) => {
      let owner = msg.guild.members.get(circle.owner)
      if (!owner) return
      buf += `${circle.betrayed ? '⛔ ' : ''} ${circle.members.length} - (${circle.id}) ${circle.name} - ${owner.user.username}#${owner.user.discriminator}\n`
    })
    let split = Discord.Util.splitMessage(buf, {
      char: '\n',
      prepend: '--==: **Circles** :==--\n'
    })
    if (typeof split === 'string') {
      msg.channel.send(split)
    } else {
      split.forEach((msg) => {
        msg.channel.send(msg)
      })
    }
  }
}