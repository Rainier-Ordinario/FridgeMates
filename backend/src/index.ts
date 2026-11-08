import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { isAuthorized } from './auth.js';
import { QuotaError, ScanTimeoutError, scanImage } from './scan.js';

const app = express();
app.use(cors());
// Photos arrive as base64 JPEG; the app should resize first, but leave headroom.
app.use(express.json({ limit: '15mb' }));

const localToday = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// /health stays open so uptime pings and warm-ups work. Everything below it needs the app token.
app.get('/health', (_req, res) => {
  res.json({ ok: true, geminiKeySet: Boolean(process.env.GEMINI_API_KEY), tokenRequired: Boolean(process.env.APP_TOKEN) });
});

app.use((req, res, next) => {
  if (isAuthorized(process.env.APP_TOKEN, req.get('x-app-token'))) {
    next();
    return;
  }
  res.status(401).json({ error: 'Missing or wrong app token' });
});

/** POST /scan  { image: "<base64 jpeg, no data: prefix>" }  ->  { items: ScanItem[] } */
app.post('/scan', async (req, res) => {
  let image: unknown;
  if (req.body && typeof req.body === 'object') {
    image = (req.body as { image?: unknown }).image;
  }
  if (typeof image !== 'string' || image.length < 100) {
    res.status(400).json({ error: 'Body must be { "image": "<base64 jpeg>" }' });
    return;
  }
  const clean = image.replace(/^data:image\/\w+;base64,/, '');
  const started = Date.now();
  try {
    const items = await scanImage(clean, localToday());
    // One line per scan: handy for a rough usage count in the host's logs.
    console.log(`scan ok: ${items.length} items in ${Date.now() - started}ms`);
    res.json({ items });
  } catch (err) {
    console.error(`scan failed after ${Date.now() - started}ms:`, err);
    if (err instanceof QuotaError) {
      res.status(429).json({ error: err.message });
      return;
    }
    if (err instanceof ScanTimeoutError) {
      res.status(504).json({ error: err.message });
      return;
    }
    let message = 'scan failed';
    if (err instanceof Error) {
      message = err.message;
    }
    res.status(502).json({ error: message });
  }
});

let portValue = process.env.PORT;
if (!portValue) {
  portValue = '8000';
}
const port = Number(portValue);
app.listen(port, '0.0.0.0', () => console.log(`FridgeMates backend on http://localhost:${port}`));
