const { Command } = require('../../handler')
const { RichEmbed } = require('discord.js')
const { Colors } = require('../../handler/Constants')

module.exports = class HelpCommand extends Command {
  constructor() {
    super('help', {
      name: 'help',
      description: 'Help command',
      module: 'misc',
      ownerOnly: false,
      args: [{
        name: 'module',
        type: 'string',
        required: false,
        description: 'The module/command you want to look up'
      }],
      usage: `help - Shows every module you have access to\n^pfx^help [module/command] - Look up the help for a module or command`
    })
  }
  async run(args, msg, api) {
    let cmds = this.handler.commands
    let modules = this.handler.modules
    let mods = {}
    let _cmds = {}
    let membed = new RichEmbed()    
    membed.setTitle(`ℹ \`Help\``).setColor(Colors.blue).setTimestamp().setFooter(`${api.handler.name} ${build.version} | relative`)
    
    for(const mod of modules) {
      let embed = new RichEmbed()
      for(const cmd of mod.commands) {
        if(!cmd) continue
        let prerun1 = await cmd._prerun(msg)
        if(!prerun1) continue
        let prerun2 = await cmd.preRun(msg)
        if(!prerun2) continue
        let cmde = new RichEmbed()
        cmde.setTitle(`ℹ \`${cmd.name}\``)
        cmde.setColor(Colors.blue)
        cmde.addField('Description', cmd.description)
        cmde.addField('Usage', typeof cmd.usage === 'string' ? `${api.prefix}${cmd.usage.replaceAll('^pfx^', api.prefix)}` : cmd.id)
        let argz = ''
        if(typeof cmd.args === 'object' && cmd.args.length > 0) {
          for(const arg of cmd.args) {
            argz += `${arg.required ? '<' : '['}${arg.name}${arg.required ? '>' : ']'} - ${arg.description || '*No argument description*'}\n`
          }
          if(argz.length > 2) {
            argz = argz.substr(0, argz.length - 1)
            cmde.addField('Arguments', argz)
          }
        }
        cmde.setTimestamp().setFooter(`${api.handler.name} ${build.version} | relative`)
        _cmds[cmd.id] = cmde
        embed.addField(cmd.id, cmd.description)
      }
      if(embed.fields.length >= 1) {
        membed.addField(mod.name, `${api.prefix}help **${mod.id}**`)
        embed.setTitle(`ℹ \`${mod.name}\``)
        embed.setColor(Colors.blue)
        embed.setTimestamp()
        embed.setFooter(`${api.handler.name} ${build.version} | relative`)
        mods[mod.id] = embed
      }
    }
    if(!args || !args.module) {
      return membed
    } else if(args.module && mods[args.module.value]) {
      return mods[args.module.value]
    } else if(args.module && _cmds[args.module.value]) {
      return _cmds[args.module.value]
    } else {
      return api.error(`The module or command \`${args.module.value}\` doesn't exist, or you do not have permission to view it.\nRun \`${api.prefix}help\` to view all modules.`)
        .setFooter(`${api.handler.name} ${build.version} | relative`)
    }
  }
}