# FridgeMates
**Spoil alert: your food has feelings.**
Fall Hacks 2026 · Theme: *digital sidekick*

Scan your food and every item becomes its own character with a personality that fits the food.
As it gets closer to expiring, it gets more desperate for you to eat it. Items chat with each other
in a fridge group chat, recipes are matchmaking ("Tomato and Mozzarella want to go on a date"),
and expired food comes back as a ghost until you throw it out.

**Prize targets:** Best Design/UI/UX · Best Use of Theme · MLH Best Use of Gemini · SURGE (everyday inconvenience) · Best Overall

---

## Team and ownership
| Who | Owns | Branch |
|---|---|---|
| Rainier | UI/UX, screens, running the app on device | `rainier/ui` |
| Kenneth | Backend: Gemini prompts, `/scan` and the other endpoints, FoodKeeper data, deploy | `kenneth/scan-backend` |
| Kerwin | App logic (data model, expiry engine, voices, notifications); pitch + Devpost from 4pm | `kerwin` |

Folders: `mobile/` (Expo app) and `backend/` (Node server). Stay in your folder to avoid merge conflicts.
`backend/` is owned by Kenneth: please ask before changing it (style-only rewrites included).

## Running it
**App only (no key needed).** Mock data works offline:
```bash
cd mobile && npm install && npx expo start
```

**App + real backend (live Gemini scans):**
```bash
# 1. Backend (needs a free Gemini key from https://aistudio.google.com)
cd backend && npm install
cp .env.example .env        # then put your key in GEMINI_API_KEY
npm run dev                 # http://localhost:8000, check /health shows geminiKeySet: true

# 2. App: create mobile/.env (gitignored), then restart Expo (it only reads .env at startup)
EXPO_PUBLIC_USE_MOCK=false
EXPO_PUBLIC_API_URL=http://localhost:8000        # simulator
# EXPO_PUBLIC_API_URL=http://<your-computer-LAN-IP>:8000   # real phone, same Wi-Fi
```
Once the backend is deployed, teammates only set `EXPO_PUBLIC_API_URL` to the deployed URL and need no key.
Never commit `.env`, and send keys privately.

## Deployed backend (Render)
The backend is hosted on Render (free tier) so nobody needs a Gemini key or their own server. URL: **https://fridgemates.onrender.com**
Teammates only need these lines in `mobile/.env` (then restart Expo):
```
EXPO_PUBLIC_USE_MOCK=false
EXPO_PUBLIC_API_URL=https://fridgemates.onrender.com
EXPO_PUBLIC_APP_TOKEN=<shared token, ask Kenneth>
```
Scans take about 2-15s (the backend tries `gemini-3.1-flash-lite`, then falls back to `gemini-3.5-flash-lite` if Google reports it overloaded).
- `GET /health` is open; every other route needs the header `x-app-token`. It's a casual-abuse gate, not real security.
- Free Render **sleeps after 15 min idle**, and the first request after that takes 30-60s (a scan in that window will likely time out, just retry). **Before testing or a demo, open https://fridgemates.onrender.com/health in a browser and wait for it to load.** There is no keep-awake ping.
- Errors: 429 = Gemini quota reached, 504 = Gemini too slow, 401 = wrong token. Quota is per Google project and resets at midnight Pacific (AI Studio, Usage, Rate limit tab).
- Render env vars: `GEMINI_API_KEY`, `APP_TOKEN`. Root directory `backend`, build `npm install`, start `npm start`.

Before pushing: `cd mobile && npm run typecheck && npx expo lint` and `cd backend && npm run typecheck && npm test`.
If typecheck complains about routes that exist, start `npx expo start` once to regenerate the typed-route files.

## Status
| Piece | State |
|---|---|
| Fridge, scan, item detail, chat, match, rescue, memorial screens | Built (UI) |
| `POST /scan` | **Live** (Gemini `gemini-3.1-flash-lite`, structured JSON output) |
| `/chat`, `/match`, `/ghost`, `/messages` | **Mock only**: not on the backend yet, so live mode shows errors on those screens |
| Saving the fridge on the phone | Done: AsyncStorage persistence in `mobile/src/logic/store.tsx` (items, day offset, settings) |
| Notifications | Stub (`mobile/src/logic/notifications.ts`), not wired up |
| Scan quantities | Detected duplicates are grouped with a count users can adjust before and after adding |
| Backend deployed | **Live** on Render (manual deploys from `dev`) |
| USDA FoodKeeper shelf-life data | Not yet: `daysLeft` is currently Gemini's own estimate |
| Re-scan updates existing items instead of duplicating | Planned |

## Git workflow
- `main` = demo-ready only. `dev` = shared working branch. Everyone works on their own branch.
- Start your branch:
  ```bash
  git checkout dev && git pull
  git checkout -b yourname/feature
  git push -u origin yourname/feature
  ```
- Pull in others' work often: `git checkout dev && git pull && git checkout yourname/feature && git merge dev`
- Merge into `dev` every 1–2 hours when something works (or open a PR into `dev`).
- **Never commit `.env` or any API key.** The Gemini key lives only on the backend.

## API contract (backend returns exactly this)
The app uses mock data until the backend is deployed. Base URL lives in one config constant.

**Family-friendly rule (organizers' requirement).** Every prompt the app sends carries: "Always family-friendly and kind. Never use profanity, slurs, sexual content, insults about people, or crude jokes. Playful teasing about food only." (`mobile/src/logic/safety.ts`). The app also blocks such input locally before calling the API and filters every response (chat lines, scan intros, match text, epitaphs, messages) with in-character fallbacks. Backend prompts must follow the same rule.

`POST /scan` body `{ "image": "<base64 jpeg>" }`
```json
{ "items": [ {
  "name": "Greek yogurt", "emoji": "🥛",
  "quantity": 1,
  "characterName": "Sir Yogurtsworth", "personality": "dramatic, needy",
  "daysLeft": 4, "dateSource": "printed",
  "intro": "Finally, someone opened the door.",
  "box": [120, 60, 720, 360]
} ] }
```
`dateSource` is `"printed"` or `"estimated"`. `quantity` is the count of identical visible units/packages (1–99); identical names are combined by the backend. Before adding scan results, the app lets users adjust each quantity or remove the row; quantities stay editable on the item screen. The app assigns each item a local `id`.
`box?: [ymin, xmin, ymax, xmax]` normalized 0–1000 (optional): where the item sits in the photo. The app crops a thumbnail from it on the
device; the photo and the crops never leave the phone.
**Live `/scan` today:** Gemini returns `name`, `emoji`, `quantity`, `daysLeft` and `dateSource`. The backend fills `characterName` with the
food name and sends empty `personality` and `intro`, so the UI must not rely on those. A new photo takes about 2s (the first call after
the server idles can take ~10s+). The app's timeout is 30s for `/scan` and 15s for other calls.

`POST /chat` body `{ "items": [{ "id", "name", "characterName", "personality", "daysLeft" }], "userMessage": "optional" }`
```json
{ "lines": [ { "id": "<item id>", "text": "Don't trust him, he said that to the last avocado." } ] }
```

`POST /match` body `{ "items": [ ... ] }`
```json
{ "title": "Caprese date night", "minutes": 15, "rescues": ["<item ids>"],
  "steps": ["Slice tomato and mozzarella", "..."], "thankYou": "You saved me. I'll never forget this." }
```

`POST /ghost` body `{ "item": { ... } }` → `{ "epitaph": "Here lies Spinach. Bought with good intentions." }`

`POST /messages` body `{ "items": [ ... ] }` → `{ "messages": [ { "id": "<item id>", "text": "u up? it's about tomorrow" } ] }`

## Mood system
| Days left | Mood | Look |
|---|---|---|
| 6+ | Cocky | Green, relaxed |
| 3–5 | Chill | Blue |
| 1–2 | Nervous | Amber, wobble |
| 0 | Dramatic | Coral, shaking |
| Expired | Ghost | Gray, translucent, floating |

Expiry estimates: printed date if visible (unopened) → USDA FoodKeeper storage times by food type → user correction always wins.
Show it as a "use soon" reminder, never a food-safety verdict.

## Scope for today
**Must have:** scan → characters with moods → fridge group chat with voices → matchmaking recipe → ghosts + memorial → scoreboard → "Skip ahead a day" demo button.
**If time:** food texts you (local notifications in character), leftovers become new characters.
**Not today:** accounts, receipt scanning, barcode, shared households, widget.

## Timeline (adjust to the official deadline)
| Time | Goal |
|---|---|
| 11:15 | Contract agreed, everyone building |
| 12:30 | Scan works end to end on a phone |
| 2:30 | Chat + voices, matchmaking, ghosts working |
| 4:00 | Feature freeze → polish; Teammate 3 starts pitch + Devpost |
| Last 1.5–2h | Backup demo video, Devpost submitted, 2 full pitch rehearsals |

If something isn't working by its checkpoint, cut it.