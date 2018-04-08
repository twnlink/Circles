const config = require('config')
const logger = require('../logger')
module.exports = (client) => {
  logger.info(`${client.user.username} is ready.`)
  global.logchan = client.channels.get(config.get('ids.logchannel'))
}