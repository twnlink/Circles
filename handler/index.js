const { Message, Client, User, GuildMember, Channel, TextChannel, DMChannel, Role, RichEmbed } = require('discord.js'),
      { Colors, Emoji } = require('./Constants'),
      errors = require('common-errors'),
      logger = require('../logger')

/*----------*/
/* Defaults */
/*----------*/
const HandlerOptions = {
  client: null,
  name: '*No name defined*',
  owner: '1',
  prefix: '!'
}
const ModuleOptions = {
  name: '*No name defined*',
  color: '#C33C54'
}
String.prototype.replaceAll = function(target, replacement) {
  return this.split(target).join(replacement);
}
const USER_MATCH = /^<@[!]?(\d+)>$/i
const ROLE_MATCH = /^<@&(\d+)>$/i
const CHANNEL_MATCH = /^<#(\d+)>$/i

/** The command handler */
class CommandHandler {
  /**
   * @typedef {Object} HandlerOptions
   * @property {Client} client - Discord.JS client
   * @property {string} name - The bot's name
   * @property {string} owner - The bot's owner's ID
   * @property {string} [prefix=!] - The bot's prefix
   */
  /**
   * Create a command handler
   * @param {HandlerOptions} options 
   */
  constructor(options) {
    /**
     * The command handler's options
     * @type {HandlerOptions}
     */

    this.options = Object.assign(HandlerOptions, options)
    /**
     * Discord.JS client
     * @type {Client}
     */
    this.client = this.options.client

    /**
     * The bot's name
     * @type {string}
     */
    this.name = this.options.name

    /**
     * The bot's owner's ID
     * @type {string}
     */
    this.owner = this.options.owner

    /**
     * The bot's prefix
     * @type {string}
     */
    this.prefix = this.options.prefix

    /**
     * The bot's prefixes
     * @type {string[]}
     */
    this.prefixes = [
      this.prefix,
      '@mention '
    ]

    /**
     * The modules registered under this command handler
     * @type {Module[]}
     */
    this.modules = []

    /**
     * The commands registered under this command handler
     * @type {Command[]}
     */
    this.commands = []

  }
  /**
   * Register a module
   * @param {Module} module - The module to register
   * @returns {CommandHandler} - The command handler
   */
  registerModule(module) {
    module.handler = this
    this.modules.push(module)
    return this
  }

  /**
   * Register a command
   * @param {Command} command - The command to register
   * @param {Module|string} module - The module to register
   * @returns {CommandHandler} - The command handler
   */
  registerCommand(command) {
    if(!(command instanceof Command)) throw new errors.TypeError('command is not a Command')
    let mod = this.findModule(command.options.module)
    command.handler = this
    command.module = mod
    mod.commands.push(command)
    this.commands.push(command)
    if(typeof command.postConstruct === 'function') command.postConstruct(this)
    return this
  }

  /**
   * Find a module by its ID 
   * @param {string|Module} id - The module's ID to find
   * @returns {Module} - The module
   */
  findModule(id) {
    if(id instanceof Module) return id
    for(let module of this.modules) {
      if(module.id == id) return module
    }
    throw new errors.NotFoundError('module')
  }
  /**
   * 
   * @param {string|Command} id - The command's ID to find 
   * @param {Module|string} [module] - The module to find the command in, if any
   * @param {boolean} [aliases = false] - Find using aliases
   */
  findCommand(id, module, aliases = false) {
    if(id instanceof Command) return id
    if(typeof module === 'undefined') {
      for(let command of this.commands) {
        if(!command) continue
        if(aliases && command.aliases && command.aliases.indexOf(id) !== -1) return command
        if(command.id == id) return command
      }
      throw new errors.NotFoundError('command')
    } else {
      let module = this.findModule(module)
      return module.findCommand(id, aliases)
    }
  } 
  /**
   * Reload a command
   * @param {string|Command} id - The command's ID to find 
   * @param {Module|string} [module] - The module to find the command in, if any
   */
  reload(id, module) {
    let cmd = this.findCommand(id)
    module = typeof module == 'undefined' ? cmd.module : this.findModule(module)
    for(let _c in this.commands) {
      let c = this.commands[_c]
      let path = c.path
      if(c.id == cmd.id) {
        delete this.commands[_c]
        for(let _cm in module.commands) {
          let cm = module.commands[_cm]
          if(cm.id == c.id) {
            delete module.commands[_cm]
            break
          }
        }
        delete require.cache[c.path]
        let newCmd = new (require(path))()
        newCmd.path = path
        this.registerCommand(newCmd)
        break
      }
    }
  }

  /**
   * Message handler for discord.js
   * @param {Message} message 
   * @param {DUser} user
   * @param {DGuild} [guild]
   * @returns {boolean} - Did it handle the message and run a command?
   */
  async onMessage(message, user, guild) {
    let content = message.content
    let prefix
    if(guild && guild.prefix && guild.prefix !== 'dbans.') {
      if(content.startsWith(`${this.client.user.toString()} `)) {
        prefix = `${this.client.user.toString()} `
      } else if(content.startsWith(guild.prefix)) {
        prefix = guild.prefix
      }
    } else {
      for(let p of this.prefixes) {
        let f = p.replace('@mention', this.client.user.toString())
        if(content.startsWith(f)) {
          prefix = f
          break
        }
      }
    }
    if(message.author.id == this.client.user.id || message.author.bot) return false
    if(!prefix) return false
    let c = content.substr(prefix.length).split(' ')
    let command
    try {
      command = this.findCommand(c[0], undefined, true)
    } catch(err) { return false }
    let prerun = await command._prerun(message)
    if(!prerun) return false
    let prerun2 = await command.preRun(message)
    if(!prerun2) return false
    try {
      let api = new CommandAPI(message, this, command, prefix)
      let args = c.splice(1)
      let rawargs = args
      if(typeof command.args === 'object' && command.args.length > 0) {
        args = {}
        let firstArg = command.args[0]
        let usageEmbed = api.error(`**Usage:**\n${api.prefix}`+typeof command.usage === 'string' ? command.usage.replaceAll('^pfx^', api.prefix) : `${command.id}`, message.author)
          .setFooter(`${api.handler.name} ${build.version} | ${api.prefix}help ${command.id}`)
        if(firstArg.required == true && rawargs.length < 1) {
          return message.channel.send({embed: usageEmbed})
        }
        for(const a of command.args) {
          let idx = command.args.indexOf(a)
          const arg = rawargs[idx] || ''
          switch(a.type) {
            case 'string':
              if(a.required) {
                if(typeof rawargs[idx] !== 'string') {
                  return message.channel.send({embed: usageEmbed})
                }
              }
              if (a.multiword) {
                let val = rawargs.splice(idx).join(' ')
                args[a.name] = new CommandArg(a.name, a.type, val || a.default)
              } else {
                if(typeof rawargs[idx] === 'string' || typeof a.default === 'string') args[a.name] = new CommandArg(a.name, a.type, rawargs[idx] || a.default)
              }
              
              break
            case 'user':
              if(a.required) {
                if(typeof rawargs[idx] !== 'string' || !USER_MATCH.test(arg)) {
                  return message.channel.send({embed: usageEmbed})
                }
              }
              if(typeof rawargs[idx] === 'string' && USER_MATCH.test(arg)) {
                let matches = arg.match(USER_MATCH)
                if(matches.length < 2 && a.required) {
                  return message.channel.send({
                    embed: usageEmbed
                  })
                }
                if(matches.length > 1) {
                  let id = matches[1]
                  try {
                    let user = await this.client.fetchUser(id)
                    args[a.name] = new CommandArg(a.name, a.type, user)
                  } catch(err) {
                    log.error('Couldn\'t find a user ' + id + ' ' + msg.author.id + ' ' + msg.id + ' ' + msg.channel.id, err)
                    return message.channel.send({
                      embed: api.error(`Could not find that user. Go to the support server linked in the footer of this embed and ask for help.`, msg.author)
                        .setFooter(`${api.handler.name} ${build.version} | ${api.prefix}help ${command.id}`)
                    })
                  }
                }
              } else if(a.default) {
                args[a.name] = new CommandArg(a.name, a.type, message.author)
              }
              break
            case 'channel':
              if(!message.guild) {
                return message.channel.send({embed: usageEmbed}) 
              }
              if(a.required) {
                if(typeof rawargs[idx] !== 'string' || !CHANNEL_MATCH.test(arg)) {
                  return message.channel.send({embed: usageEmbed})
                }
              }
              if(typeof rawargs[idx] === 'string' && CHANNEL_MATCH.test(arg)) {
                let matches = arg.match(CHANNEL_MATCH)
                if(matches.length < 2 && a.required) {
                  return message.channel.send({
                    embed: usageEmbed
                  })
                }
                if(matches.length > 1) {
                  let id = matches[1]
                  try {
                    let channel = message.guild.channels.get(id)
                    if(!channel) {
                      log.error('Couldn\'t find a channel ' + id + ' ' + msg.author.id + ' ' + msg.id + ' ' + msg.channel.id, err)
                      return message.channel.send({
                        embed: api.error(`Could not find that channel. Go to the support server linked in the footer of this embed and ask for help.`, msg.author)
                          .setFooter(`${api.handler.name} ${build.version} | ${api.prefix}help ${command.id}`)
                      })
                    }
                    args[a.name] = new CommandArg(a.name, a.type, channel)
                  } catch(err) {
                    log.error('Couldn\'t find a channel ' + id + ' ' + msg.author.id + ' ' + msg.id + ' ' + msg.channel.id, err)
                    return message.channel.send({
                      embed: api.error(`Could not find that channel. Go to the support server linked in the footer of this embed and ask for help.`, msg.author)
                        .setFooter(`${api.handler.name} ${build.version} | ${api.prefix}help ${command.id}`)
                    })
                  }
                }
              }
              break
            case 'role':
              if(!message.guild) {
                return message.channel.send({embed: usageEmbed}) 
              }
              if(a.required) {
                if(typeof rawargs[idx] !== 'string' || !ROLE_MATCH.test(arg)) {
                  return message.channel.send({embed: usageEmbed})
                }
              }
              if(typeof rawargs[idx] === 'string' && ROLE_MATCH.test(arg)) {
                let matches = arg.match(ROLE_MATCH)
                if(matches.length < 2 && a.required) {
                  return message.channel.send({
                    embed: usageEmbed
                  })
                }
                if(matches.length > 1) {
                  let id = matches[1]
                  try {
                    let role = message.guild.roles.get(id)
                    if(!role) {
                      log.error('Couldn\'t find a role ' + id + ' ' + msg.author.id + ' ' + msg.id + ' ' + msg.channel.id, err)
                      return message.channel.send({
                        embed: api.error(`Could not find that role. Go to the support server linked in the footer of this embed and ask for help.`, msg.author)
                          .setFooter(`${api.handler.name} ${build.version} | ${api.prefix}help ${command.id}`)
                      })
                    }
                    args[a.name] = new CommandArg(a.name, a.type, role)
                  } catch(err) {
                    log.error('Couldn\'t find a role ' + id + ' ' + msg.author.id + ' ' + msg.id + ' ' + msg.channel.id, err)
                    return message.channel.send({
                      embed: api.error(`Could not find that role. Go to the support server linked in the footer of this embed and ask for help.`, msg.author)
                        .setFooter(`${api.handler.name} ${build.version} | ${api.prefix}help ${command.id}`)
                    })
                  }
                }
              }
              break
            default:
              if(a.required) {
                if(typeof rawargs[idx] !== 'string') {
                  return message.channel.send({embed: usageEmbed})
                }
              }
              if(typeof rawargs[idx] === 'string' || typeof a.default === 'string') args[a.name] = new CommandArg(a.name, a.type,  rawargs[idx] || a.default)
              break
          }
        }
      }
      let response = await command.run(args, message, api)
      if(!!response) {
        if(response.title && response.description) {
          return message.channel.send({
            embed: response
          })
        }
        message.channel.send(response)        
      }
    } catch(err) {
      message.channel.send(`Error while executing command \`${command.id}\`\n\`\`\`${err}\n${err.stack}\`\`\``)
    }
  }
}

/** A module */
class Module {
  /**
   * @typedef {Object} ModuleOptions
   * @property {string} name - The module's name
   * @property {string} color - The module's color
   */

  /**
   * Define a module
   * @param {string} id - Module ID (no spaces) 
   * @param {ModuleOptions} [options] - Options for the module
   */
  constructor(id, options = {}) {
    /**
     * The module's options
     * @type {ModuleOptions}
     */
    this.options = Object.assign(ModuleOptions, options)  
    
    /**
     * The module's ID
     * @type {string}
     */
    this.id = id

    /**
     * The module's display name
     * @type {string}
     */
    this.name = this.options.name

    /**
     * The module's color
     * @type {string}
     */
    this.color = this.options.color
    
    /**
     * The command handler the module is registered under
     * @type {CommandHandler}
     */
    this.handler = null

    /**
     * The commands the module has registered
     * @type {Command[]}
     */
    this.commands = []
  }

  /**
   * Find a command by its ID
   * @param {string|Command} id 
   * @param {boolean} [aliases = false] - Find using aliases
   * @return {Command} - Command it found
   */
  findCommand(id, aliases = false) {
    if(id instanceof Command) return id
    if(!this.commands) throw new errors.Error('No commands have been registered under this module')
    for(let command of this.commands) {
      if(!command) continue
      if(aliases && command.aliases && command.aliases.indexOf(id) !== -1) return command
      if(command.id == id) {
        return command
      }
    }
    throw new errors.NotFoundError('command')
  }

  /**
   * Register a command
   * @param {Command} command - The command to register
   */
  registerCommand(command) {
    this.commands.push(command)
    return command
  }
}

/** The command run API */
class CommandAPI {
  constructor(message, handler, command, prefix) {
    /**
     * API's message
     * @type {Message}
     */
    this.message = message
    /**
     * API's handler
     * @type {CommandHandler}
     */
    this.handler = handler
    /**
     * API's command
     * @type {Command}
     */
    this.command = command

    /**
     * Command's prefix
     * @type {string}
     */
    this.prefix = prefix
  }
  
  /**
   * Create an embed
   * @param {string} title - Embed title
   * @param {string} message - Embed description
   * @param {User} reply - The user to reply to
   * @returns {RichEmbed}
   */
  embed(title, message, reply) {
    let embed = new RichEmbed()
    embed.setTitle(title)
    embed.setDescription(message)
    embed.setTimestamp()
    embed.setFooter(`${this.handler.name} ${build.version}`)
    if(reply) {
      embed.setAuthor(reply.username+'#'+reply.discriminator, reply.displayAvatarURL)
    }
    return embed
  }
  /**
   * Make a success embed
   * @param {string} message - Embed's message
   * @param {User} reply - Who should the embed "reply" to?
   */
  success(message, reply) {
    let embed = this.embed(`${Emoji.check} \`Success\``, message, reply)
    embed.setColor(Colors.green)
    return embed
  }
  /**
   * Make an error embed
   * @param {string} message - Embed's message
   * @param {User} reply - Who should the embed "reply" to?
   */
  error(message, reply) {
    let embed = this.embed(`${Emoji.cross} \`Error\``, message, reply)
    embed.setColor(Colors.red)
    return embed
  }

}

class CommandArg {
  constructor(name, type, value) {
    /**
     * Argument name
     * @type {string}
     */
    this.name = name

    /**
     * Argument type
     * @type {string}
     */
    this.type = type

    /**
     * Argument value
     * @type {string|User|Guild|GuildMember|DGuild|DUser|Channel|Role}
     */
    this.value = value
  }
}

/**
 * Command argument
 * @typedef {Object} CommandArgument
 * @property {string} name - Name of the argument to refer to it in the argument object
 * @property {string} [type=string] - Type of argument. String, user, member, channel, role
 * @property {boolean} [required=true] - Whether the argument is required
 * @property {string} [default] - Value to default to if there is no value
 * @property {string} [description] - Argument's descripton
 */

 
/** A command */
class Command {
  /**
   * Options for defining a Command
   * @typedef {Object} CommandOptions
   * @property {string} name - Display name of the command
   * @property {string} description - Description of the command
   * @property {string|string[]} [aliases] - Command aliases
   * @property {boolean} [guildOnly=false] - Whether the command should only be ran in a guild channel
   * @property {boolean} [dmOnly=false] - Whether the command should only be ran in a DM channel
   * @property {CommandArgument[]} [args] - Command arguments
   * @property {boolean} [ownerOnly=true] - Whether the command can only be ran by the owner of the bot
   * @property {string} [usage] - Usage text to show in help
   */
  /**
   * Create a command
   * @param {string} id - The command ID
   * @param {CommandOptions} options - The options for the command
   */
  constructor(id, options) {
    /**
     * The command's options
     * @type {CommandOptions}
     */
    this.options = Object.assign({
      name: '*No name defined*',
      description: '*No description defined*',
      aliases: [],
      guildOnly: false,
      dmOnly: false,
      args: [],
      ownerOnly: true
    }, options)
    
    /**
     * The command's ID
     * @type {string}
     */
    this.id = id

    /**
     * The command's description
     * @type {string}
     */
    this.description = this.options.description

    /**
     * The command's display name
     * @type {string}
     */
    this.name = this.options.name

    /**
     * The command's alias(es)
     * @type {string|string[]}
     */
    this.aliases = this.options.aliases

    /**
     * Whether the command should only run in a guild channel
     * @type {boolean}
     */
    this.guildOnly = this.options.guildOnly

    /**
     * Whether the command should only run in a DM channel
     * @type {boolean}
     */
    this.dmOnly = this.options.dmOnly

    /**
     * The arguments that the command accepts
     * @type {CommandArgument[]}
     */
    this.args = this.options.args

    /**
     * Whether the command should only be executed by the owner of the bot
     * @type {boolean}
     */
    this.ownerOnly = this.options.ownerOnly

    /**
     * Whether the command is disabled or not
     * @type {boolean}
     */
    this.disabled = false

    /**
     * The command handler that the command is registered under
     * @type {CommandHandler}
     */
    this.handler = null

    /**
     * The module that the command is registered under
     * @type {Module}
     */
    this.module = null

    /**
     * The command's usage text
     * @type {string|undefined}
     */
    this.usage = this.options.usage
  }
  /**
   * Internal prerun method, do not call or override!!
   * @param {Message} msg
   */
  async _prerun(msg) {
    //if(msg.author.id == this.handler.owner) return true // Owner override
    let ret = !this.disabled
    if(this.ownerOnly && msg.author.id != this.handler.owner) ret = false
    if(this.guildOnly && !msg.guild) ret = false
    if(this.dmOnly && msg.type != 'dm') ret = false
    return ret
  }
  /**
   * Method that is called before Command#run is called.
   * @param {Message} msg 
   * @returns {boolean} - Whether the command should be ran
   */
  async preRun(msg) {
    return true
  }
  
  disable() {
    this.disabled = true
  }
  enable() {
    this.disabled = false
  }

  /**
   * Method that is called when the command is ran
   * @param {CommandArgument} args 
   * @param {Message} msg 
   * @param {CommandAPI} api
   */
  async run(args, msg, api) {
    throw new errors.NotImplementedError('This command is not ready yet.')
  }
}
module.exports = {
  CommandHandler,
  Module,
  Command,
  CommandAPI
}