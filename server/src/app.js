import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config/env.js';
import tasksRouter from './routes/tasks.js';
import assistRouter from './routes/assist.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../../client/dist');

const app = express();

const frameAncestors = ["'self'"];
if (config.allowTeamsEmbed) {
  frameAncestors.push('https://teams.microsoft.com', 'https://*.teams.microsoft.com', 'https://*.skype.com');
}

const contentSecurityPolicy = helmet.contentSecurityPolicy.getDefaultDirectives();
contentSecurityPolicy['frame-ancestors'] = frameAncestors;
delete contentSecurityPolicy['upgrade-insecure-requests'];

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: contentSecurityPolicy
    },
    crossOriginEmbedderPolicy: false
  })
);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || config.allowedOrigins.length === 0 || config.allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));

if (config.logLevel && config.logLevel !== 'none') {
  app.use(morgan(config.logLevel));
}

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

app.use('/api/tasks', tasksRouter);
app.use('/api/assist', assistRouter);

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
