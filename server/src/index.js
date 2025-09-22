import http from 'node:http';
import app from './app.js';
import config from './config/env.js';

const server = http.createServer(app);

server.listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port}`);
  console.log(`Active provider: ${config.modelProvider}`);
});

function shutdown(signal) {
  console.log(`Received ${signal}. Closing server...`);
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
