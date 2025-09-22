import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load server/.env if present
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: false });
// Load project root .env as secondary
dotenv.config({ path: path.resolve(__dirname, '../../../.env'), override: false });
// Finally load environment defaults (process.env)
dotenv.config({ override: false });

const parseList = (value) =>
  value
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean) || [];

const config = {
  port: Number.parseInt(process.env.PORT || '8000', 10),
  modelProvider: (process.env.MODEL_PROVIDER || 'mock').toLowerCase(),
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
  },
  allowedOrigins: parseList(process.env.ALLOWED_ORIGINS || ''),
  allowTeamsEmbed: process.env.ALLOW_TEAMS_EMBED !== 'false',
  logLevel: process.env.LOG_LEVEL || 'dev'
};

export default config;
