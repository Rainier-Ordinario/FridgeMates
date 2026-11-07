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
| Rainier | UI/UX, iOS screens, running the app on device | `rainier/ui` |
| Teammate 2 | Backend + Gemini prompts + FoodKeeper data + deploy | `name/backend` |
| Teammate 3 | iOS data model, expiry engine, voices, notifications; pitch + Devpost from 4pm | `name/ios-logic` |

Folders: `ios/` (app) and `backend/` (server). Stay in your folder to avoid merge conflicts.

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

`POST /scan` body `{ "image": "<base64 jpeg>" }`
```json
{ "items": [ {
  "name": "Greek yogurt", "emoji": "🥛",
  "characterName": "Sir Yogurtsworth", "personality": "dramatic, needy",
  "daysLeft": 4, "dateSource": "printed",
  "intro": "Finally, someone opened the door."
} ] }
```
`dateSource` is `"printed"` or `"estimated"`. The app assigns each item a local `id`.

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