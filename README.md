Travel Agent

A small travel-planning agent UI. It can run in two modes:

- Local mode: fake trip planning data generated in the browser.
- AI Gateway mode: uses a Vercel AI Gateway key from a local `.env` file or environment variable.

## Run locally

```bash
npm start
```

Then open:

```text
http://127.0.0.1:4174/
```

## Use a Vercel AI Gateway key

Create a local `.env` file. Do not commit it. This needs a Vercel AI Gateway key, not a deployment-only Vercel token.

```bash
AI_GATEWAY_API_KEY=your-vercel-ai-gateway-key
AI_GATEWAY_MODEL=openai/gpt-4.1-mini
PORT=4174
```

The app will show `AI Gateway` in the chat header when the server is using the Vercel-backed model path. If the key is missing or the request fails, it falls back to the local fake planner.

If port 4174 is already busy, run with another port:

```bash
PORT=4180 npm start
```

## Test

```bash
npm test
```
