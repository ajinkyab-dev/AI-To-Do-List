import http from 'node:http'
import app from './app.js'
import config from './config/env.js'

const server = http.createServer(app)
const host = config.host || '0.0.0.0'

server.listen(config.port, host, () => {
  const location = config.publicUrl || `${host}:${config.port}`
  console.log(`Server listening on ${location}`)
  console.log(`Active provider: ${config.modelProvider}`)
})

function shutdown (signal) {
  console.log(`Received ${signal}. Closing server...`)
  server.close(() => {
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
