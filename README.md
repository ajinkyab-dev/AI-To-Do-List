# AI To-Do List Manager

A production-ready React + Node.js application that turns unstructured task notes into a prioritised to-do list. The UI uses Material UI exclusively, while the backend can call OpenAI or Google Gemini (or fall back to heuristics) based on environment configuration. Security headers and CORS options are tuned so the app can be embedded as a Microsoft Teams tab.

## Project layout

```
.
+-- client/        # React + Vite frontend (Material UI)
+-- server/        # Express backend with AI provider integrations
+-- .env.example   # Shared environment template
+-- README.md
```

## Prerequisites

- Node.js 18 or newer (Node 22+ recommended for native `fetch` on the backend)
- npm, pnpm, or yarn (examples below use npm)

## Environment variables

1. Copy `.env.example` to `server/.env` and adjust values:
   - `MODEL_PROVIDER`: `openai`, `gemini`, or `mock`
   - `OPENAI_API_KEY` / `GEMINI_API_KEY`: credentials for the chosen provider
   - `ALLOWED_ORIGINS`: comma-separated list for CORS (e.g. `http://localhost:5173`)
   - `ALLOW_TEAMS_EMBED`: set `false` to block Teams iframe embedding

2. Copy `client/.env.example` to `client/.env` and ensure `VITE_API_BASE_URL` matches the backend URL (default `http://localhost:8000`).

> Keep real `.env` files out of version control; `.gitignore` already ignores them.

## Local development

Install dependencies (requires network access):

```bash
cd server
npm install
cd ../client
npm install
```

Start the backend:

```bash
cd server
npm run dev
```

Start the frontend in a second terminal:

```bash
cd client
npm run dev
```

Visit `http://localhost:5173`. The Vite dev server proxies `/api` requests to `http://localhost:8000` by default.

## Production build

1. Build the frontend:
   ```bash
   cd client
   npm run build
   ```
   Outputs to `client/dist`.

2. Serve with the backend (serves static assets when `client/dist` exists):
   ```bash
   cd server
   npm start
   ```

## AI provider configuration

- **OpenAI**: `MODEL_PROVIDER=openai`, set `OPENAI_API_KEY`, optional `OPENAI_MODEL` (default `gpt-4o-mini`).
- **Google Gemini**: `MODEL_PROVIDER=gemini`, set `GEMINI_API_KEY`, optional `GEMINI_MODEL` (default `gemini-1.5-flash`).
- **Mock heuristics**: `MODEL_PROVIDER=mock` avoids external calls and uses built-in keyword heuristics. Failures from real providers fall back to heuristics and return a warning field.

Sample API response:

```json
{
  "tasks": [
    {
      "title": "Call client",
      "priority": "High",
      "category": "Meetings",
      "notes": ["Requires communication"]
    }
  ],
  "grouped": true,
  "provider": "openai",
  "providerLabel": "OpenAI",
  "model": "gpt-4o-mini",
  "warning": null,
  "timestamp": "2024-05-06T14:12:11.125Z"
}
```

## Microsoft Teams integration tips

- When `ALLOW_TEAMS_EMBED` is `true`, the backend allows Teams domains in `frame-ancestors` so the app can run as a custom tab.
- Align `ALLOWED_ORIGINS` with the domains listed in your Teams app manifest.
- Deploy the server publicly (or on your intranet) and reference its URL in the Teams manifest `contentUrl`.
- Consider adding authentication/SSO before shipping to production.

## Available scripts

- **client**: `npm run dev`, `npm run build`, `npm run preview`, `npm run lint`
- **server**: `npm run dev`, `npm start`, `npm run lint`

## Next steps

- Add automated tests around the task formatting pipeline.
- Extend the backend with application telemetry and structured logging.
- Harden prompts and response validation once specific AI models are finalised.
