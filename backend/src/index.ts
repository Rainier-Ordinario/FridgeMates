import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { scanImage } from './scan.js';

const app = express();
app.use(cors());
// Photos arrive as base64 JPEG; the app should resize first, but leave headroom.
app.use(express.json({ limit: '15mb' }));

const localToday = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

app.get('/health', (_req, res) => {
  res.json({ ok: true, geminiKeySet: Boolean(process.env.GEMINI_API_KEY) });
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
  try {
    const items = await scanImage(clean, localToday());
    res.json({ items });
  } catch (err) {
    console.error('scan failed:', err);
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
