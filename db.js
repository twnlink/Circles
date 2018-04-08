const config = require('config')
const { User } = require('discord.js')
const r = require('rethinkdbdash')({
  host: config.get('rethink.host'),
  port: 28015,
  username: config.get('rethink.username'),
  password: config.get('rethink.password'),
  db: config.get('rethink.db'),
  pool: true
})

const cache = {}
const circleCache = {}

/**
 * DUser class
 */
class DUser {
  /**
   * Create a DUser object
   * @param {object} info - Info object from the DB
   * @param {object} r - RethinkDB object
   * @param {User} [user] - Discord.JS user object
   */
  constructor(info, r, user) {
    /**
     * Original info from DB
     * @type {Object}
     */
    this.info = info

    /**
     * RethinkDB object
     * @type {Object}
     */
    this.r = r

    /**
     * Discord.JS user
     * @type {User|undefined}
     */
    this.user = user
    this.init(this.info)
  }

  /**
   * Initialize the DUser object with the data from the DB
   * @param {Object} info - DB info object
   */
  init(info) {
    this.info = info
    /**
     * User's ID
     * @type {string}
     */
    this.id = info.id

    /**
     * Blacklisted
     * @type {boolean}
     */
    this.blacklisted = info.blacklisted || false

    /**
     * User flags
     * @type {Object}
     */
    this.flags = info.flags || {
      developer: false,
    }

    /**
     * How many circles they have betrayed
     * @type {Number}
     */
    this.betrayed = info.betrayed || 0

    /**
     * How many circles they have joined
     * @type {Number}
     */
    this.joined = info.joined || 0
    
    /**
     * Member count
     * @type {Number}
     */
    this.members = info.members || 0
  }

  /**
   * Blacklist the user
   */
  async blacklist() {
    this.blacklisted = true
    await this.push()
  }

  /**
   * Unblacklist the user
   */
  async unblacklist() {
    this.blacklisted = false
    await this.push()
  }

  /**
   * Update the DUser from the DB
   */
  async update() {
    let info = await this.r.table('users').get(this.id).run()
    this.init(info)
  }

  /**
   * Pushes current data of the DUser object to the DB
   */
  async push() {
    let newUser = {
      id: this.id,
      blacklisted: this.blacklisted,
      flags: this.flags,
      betrayed: this.betrayed,
      joined: this.joined,
      members: this.members
    }
    await this.r.table('users').get(this.id).update(newUser).run()
    return true
  }
}

/**
 * DCircle class
 */
class DCircle {
  /**
   * Create a DCircle object
   * @param {object} info - Info object from the DB
   * @param {object} r - RethinkDB object
   */
  constructor(info, r) {
    /**
     * Original info from DB
     * @type {Object}
     */
    this.info = info

    /**
     * RethinkDB object
     * @type {Object}
     */
    this.r = r

    this.init(this.info)
  }

  /**
   * Initialize the DCircle object with the data from the DB
   * @param {Object} info - DB info object
   */
  init(info) {
    this.info = info
    /**
     * User's ID
     * @type {string}
     */
    this.id = info.id

    /**
     * Circle's key
     * @type {string}
     */
    this.key = info.key

    /**
     * Circle's channel ID
     * @type {string}
     */
    this.channel = info.channel

    /**
     * Members of circle
     * @type {string[]}
     */
    this.members = info.members || []

    /**
     * Name of circle
     * @type {string}
     */
    this.name = info.name

    /**
     * Owner of circle
     * @type {string}
     */
    this.owner = info.owner

    /**
     * Is the circle betrayed?
     * @type {boolean}
     */
    this.betrayed = false
  }

  /**
   * Betray this guild
   * @param {string|DUser|User|GuildMember} betrayer - Betrayer
   */
  async betray(betrayer) {
    if (betrayer.flags) {
      betrayer.betrayed = betrayer.betrayed + 1
      await betrayer.push()
      this.betrayed = true
      await this.push()
      return
    }
    let id = typeof betrayer === 'string' ? betrayer : betrayer.id
    let user = await require('./db').getUser(id)
    user.betrayed = user.betrayed + 1
    await user.push()
    this.betrayed = true
    await this.push()
    return
  }

  /**
   * Update the DUser from the DB
   */
  async update() {
    let info = await this.r.table('circles').get(this.id).run()
    this.init(info)
  }

  /**
   * Pushes current data of the DUser object to the DB
   */
  async push() {
    let newCircle = {
      id: this.id,
      key: this.key,
      channel: this.channel,
      members: this.members,
      name: this.name,
      owner: this.owner,
      betrayed: this.betrayed
    }
    await this.r.table('circles').get(this.id).update(newCircle).run()
    return true
  }
}

class Database {
  constructor(r) {
    this.r = r
  }
  async makeUser(id) {
    let newUser = {
      id,
      blacklisted: false,
      flags: {
        developer: false
      },
      betrayed: 0,
      joined: 0,
      members: 0
    }
    let res = await this.r.table('users').insert(newUser).run()
    return newUser
  }

  /**
   * Get database information of a user
   * @param {User|GuildMember|string} user - User to get database info from
   * @returns {DUser}
   */
  async getUser(user) {
    let id = user
    if(typeof user !== 'string') id = user.id
    if(cache[id]) return cache[id]
    let i = await this.r.table('users').get(id).run()
    if(typeof i == 'undefined' || !i) {
      await this.makeUser(id)
      return this.getUser(id)
    }
    let duser = new DUser(i, this.r, (user instanceof User ? user : undefined))
    cache[id] = duser
    return duser
  }

  async makeCircle(id, name, key, channel, owner) {
    let newCircle = {
      id,
      key,
      channel,
      owner,
      name,
      members: [owner],
      betrayed: false
    }
    let res = await this.r.table('circles').insert(newCircle).run()
    return newCircle
  }

  /**
   * Get database information of a circle
   * @param {string} id - Circle ID
   * @returns {DCircle}
   */
  async getCircle(id) {
    if(circleCache[id]) return circleCache[id]
    let exists = await this.circleExists(id)
    if (!exists) return false
    let i = await this.r.table('circles').get(id).run()
    let dcircle = new DCircle(i, this.r)
    circleCache[id] = dcircle
    return dcircle
  }

  async circleExists(id) {
    if (circleCache[id]) return true
    let f = await this.r.table('circles').get(id).run()
    return typeof f !== 'undefined'
  }

  async deleteCircle(id) {
    if (circleCache[id]) circleCache[id] = undefined
    await this.r.table('circles').get(id).delete().run()
    return true
  }

}

module.exports = new Database(r)