const db = require('../db')
module.exports = async (client, handler, msg) => {
  const user = await db.getUser(msg.author)
  if (!!user.blacklisted) return
  await handler.onMessage(msg, msg.author, msg.guild)
}