const winston = require('winston'),
      path = require('path')
const env = process.env.NODE_ENV,
      prod = env === 'production'

const jsonFormatter = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
)

const consoleFormatter = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp(),
  winston.format.align(),
  winston.format.printf(info => `[${info.timestamp}] ${info.level}: ${info.message}`)
)

const logger = winston.createLogger({
  level: prod ? 'info' : 'verbose',
  format: winston.format.simple(),
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, 'logs', 'error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join(__dirname, 'logs', 'combined.log')
    }),
    new winston.transports.File({
      filename: path.join(__dirname, 'logs', 'error.log.json'),
      level: 'error',
      format: jsonFormatter
    }),
    new winston.transports.File({
      filename: path.join(__dirname, 'logs', 'combined.log.json'),
      format: jsonFormatter
    }),
    new winston.transports.Console({
      colorize: true,
      format: consoleFormatter
    })
  ]
})

module.exports = logger