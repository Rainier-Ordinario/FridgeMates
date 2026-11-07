# FridgeMates design specs

For the React Native (Expo SDK 58) developer. Source of truth for tokens is `mobile/src/theme/*`; this file restates them, adds the screens and the new components, and fixes button contrast. Mockups: `docs/screens/*.png` (2×, 393 × 852 pt artboards). All sizes are in pt (React Native units).

Tagline: **Spoil alert: your food has feelings.**

---

## 1. Tokens

### Color (`theme/colors.ts`)

| Token | Hex | Use |
| --- | --- | --- |
| `bg` | `#FFF7EC` | Warm cream screen background, splash background |
| `surface` | `#FFFFFF` | Cards, bubbles, tiles, round buttons, chat input |
| `surfaceAlt` | `#FFF1DE` | Recipe step rows, debug chip |
| `ink` | `#2B2118` | All primary text, **text on tangerine buttons** |
| `inkMuted` | `#7A6B5E` | Captions, sender names, placeholders |
| `inkFaint` | `#B5A89A` | Decorative only (the `›` chevron). Never text. |
| `line` | `#EFE4D6` | 1.5 pt borders on round buttons, chips, input |
| `brand` | `#FF8A3D` | Tangerine: primary button fill, NEW tag, my chat bubbles |
| `brandDark` | `#E8702A` | Button shadow color, large accent text (≥ 24 pt bold only) |
| `brandInk` | `#FFFFFF` → **change to `#2B2118`** | Label on brand fill (see §5) |
| `success` | `#3DBE7A` | Rescued count, confetti |
| `danger` | `#E5483A` | Dramatic card border, lost count |
| `dangerStrong` *(new)* | `#C0392B` | Toss / "Take out the trash" button fill, white label |
| `overlay` | `rgba(43,33,24,0.45)` | Scrims |

### Mood (`theme/moods.ts`)

| Mood | Days left | `color` (ring, border) | `tint` (face, pill, bubble) | `text` (on tint) | Badge | Motion |
| --- | --- | --- | --- | --- | --- | --- |
| cocky | 6+ | `#3DBE7A` | `#E3F7EC` | `#1E7A4B` | 😎 | breathe 1600 ms |
| chill | 3–5 | `#4A90E2` | `#E4EFFC` | `#2A5DA0` | 😌 | bob 2200 ms |
| nervous | 1–2 | `#F2A91B` | `#FFF1D3` | `#8A5A00` | 😬 | wobble 220 ms |
| dramatic | 0 | `#FF6B5B` | `#FFE3DF` | `#B2321F` | 😱 | shake 70 ms + red border pulse 650 ms |
| ghost | expired | `#9AA0A6` | `#EEF0F2` | `#5E666D` | 👻 | float 1400 ms, opacity 0.6 |

### Type (`theme/typography.ts`, Nunito via `@expo-google-fonts/nunito`)

| Style | Size / line height | Weight | Use |
| --- | --- | --- | --- |
| `countdown` | 48 / 52 | 800, tabular nums | Days left, "+2" |
| `display` | 34 / 40 | 800 | "Fridge", "Rescued!" |
| `title` | 24 / 30 | 800 | Screen titles, names on match, score values |
| `heading` | 18 / 24 | 700 (800 on buttons) | Character names, button labels |
| `body` | 16 / 22 | 500 | Bubbles, chat, steps |
| `bodyBold` | 16 / 22 | 700 | Emphasis |
| `caption` | 13 / 18 | 600 | Pills, sublabels, sender names |

### Spacing, radius, size, shadow (`theme/spacing.ts`)

- **Space (4-pt grid):** xs 4 · sm 8 · md 12 · lg 16 · xl 24 · xxl 32 · huge 48. Screen gutter = 24. Card stack gap = 12.
- **Radius:** sm 12 (step rows, NEW tag) · md 20 (bubbles, score tiles) · lg **28** (cards, match card, sheets) · pill 999.
- **Hit targets:** min 48 · primary 56. Face sizes: 40 (chat), 56 (scan results), 64 (cards), 96 (match).
- **Shadow `card`** (the one soft shadow): `shadowColor #2B2118, opacity 0.08, radius 14, offset {0, 6}, elevation 3`.
- **Shadow `bubble`:** `#2B2118, 0.06, radius 8, offset {0, 3}, elevation 2`.
- **Shadow `button`:** `#E8702A, 0.30, radius 16, offset {0, 8}, elevation 6`. Brand button only.
- **Pressed:** opacity 0.85, scale 0.97. Haptics: medium impact on primary, selection on secondary.

---

## 2. Screens

Every screen: background `bg`, safe-area top, 24 pt side gutter, primary action docked 24 pt from the sides and 34 pt above the bottom edge (above the home indicator). Respect `useReducedMotion()`: drop every loop; keep fades.

### 2.1 Scan, loading — `docs/screens/scan-loading.png`

**A. Viewfinder (camera)**
1. Full-bleed camera preview (`expo-camera` `CameraView`; status bar light).
2. Hint pill, top 126: "Fit your groceries in the frame". `bg` at 94% opacity, `ink` 15/20 700, padding 10×16, radius pill.
3. Viewfinder frame: inset 40 left/right, top 190, height 400. Four corner brackets, 44 pt arms, 5 pt stroke, `brand`, outer radius 20.
4. Scan line: 3 pt `brand` bar with a glow (`shadowColor brand, opacity .6, radius 16`). Sweeps top → bottom → top, 1800 ms, `Easing.inOut(Easing.quad)`, repeat.
5. Bottom row (docked): gallery RoundButton 🖼️ (56, white 14% fill, white 25% border) · shutter (84 ring, 5 pt white border, 64 `brand` core) · close RoundButton ✕. Shutter press: scale 0.92 → 1, 120 ms, medium haptic, then go to B.

**B. Loader**
1. Top bar: close RoundButton ✕ (56).
2. 96 pt below: `MoodLoader` (existing). Circle 140, ring 140 scaling 1 → 1.45 while fading 0.5 → 0, 560 ms ease-out loop. Circle fill/border interpolate cocky → chill → nervous → dramatic → ghost → cocky over 2800 ms, linear. Emoji swaps every 550 ms: 🥛 🍅 🥑 🧀 🥬 🍓 🥚.
3. Phrase, `title` 24/30 800 centered: "Bringing your food to life…" then rotates every 1100 ms through "assigning personalities…", "reading the tiny printed dates…", "asking the fridge for gossip…", "rehearsing dramatic intros…".
4. Caption `inkMuted`: "this takes a few seconds".
5. Five 12 pt mood dots, gap 8, 20 pt below.
6. Footer caption (docked): "Found 6 items · 2 printed dates, 4 estimated" (appears when the response lands, fade 200 ms).

### 2.2 Scan, results — `docs/screens/scan-results.png`

1. Top bar 64: "Meet your food" (`title`) + right "+5 new" tag (`brand` fill, **`ink` text**, 13/18 800, padding 4×10, pill).
2. Sub caption, `inkMuted`: "They just woke up. Be nice." 16 below.
3. Intro list, rows 18 apart. Each row: Face 56 (badge on) · gap 12 · column { name 16/22 700 + compact MoodPill, gap 8 · 6 below · SpeechBubble with left tail, padding 10×14, 15/20 500 }.
4. Docked PrimaryButton: 🧊 "Put them in the fridge".

Copy (scan order):
- Sir Yogurtsworth (chill, 4 days): "Finally, someone opened the door."
- Avo (dramatic, use today!): "I'm ripe. Like, RIGHT NOW ripe. Tonight or never."
- Big Tom (nervous, 1 day): "Hi! Sorry. Is it hot in here or is it just me?"
- Mozz (nervous, 2 days): "Fresh, soft, and only in town for two days."
- Big Red (cocky, 30 days): "Relax. I've outlived three fridges."

Animation: each row enters with Reanimated `ZoomIn.springify().damping(12)` (scale 0.6 → 1, opacity 0 → 1), staggered 120 ms; light haptic per row. Face mood loops start after entry.

### 2.3 Fridge group chat — `docs/screens/chat.png`

1. Top bar 64: back RoundButton ‹ (56) · gap 12 · column { "Fridge group chat" 18/24 800, single line · avatar stack of six 22 pt faces, no badge, overlap −6 } · "Play voices" button (height 40, padding 0×10, pill, `surface` + 1.5 `line`, 13/18 700, leading 22 pt `brand` circle with ▶ in `ink`).
2. Day caption, centered `inkMuted`: "Today · 6 members, 1 ghost".
3. Message list (`FlatList`, inverted). Character message: Face 40 (no badge) bottom-aligned · gap 8 · column max-width 262 { sender name `caption` `inkMuted`, 12 left inset, 3 below · bubble }. Bubble fill = speaker's mood `tint`, text `ink` `body`, padding 12×16, radius 20 with bottom-left 6, shadow `bubble`. 10 between messages. Ghost messages: whole row opacity 0.6.
4. My message: right-aligned, fill `brand`, text `ink`, bottom-right radius 6.
5. Docked ChatInput (§3.1).

Copy:
- Avo: "Tonight is my one perfect day."
- Big Tom: "Nobody panic. I'm panicking."
- Big Red: "Relax, I've got 30 days."
- Mozz: "Tom, are you thinking what I'm thinking?"
- Big Tom: "…caprese? 🥺"
- Sir Yogurtsworth: "Must you all be so loud before breakfast."
- Me: "Who wants to be dinner?"

Animation: new message slides up 12 pt + fades in, 220 ms `Easing.out(Easing.cubic)`; a typing indicator (three 6 pt dots in the speaker's tint, bouncing 900 ms, staggered 150 ms) shows 600 ms before each character line. **Play voices**: reads lines in order with `expo-speech` using each character's pitch/rate from `logic/voices.ts`; the speaking bubble scales to 1.03 and its face runs its mood motion; button label becomes "■ Stop".

### 2.4 Matchmaking — `docs/screens/match.png`

1. Top bar 64: back ‹ · "Matchmaker" (`title`).
2. MatchCard (§3.2) for Big Tom × Mozz with Basil 🌿 as third wheel.
3. 20 below: row { "Caprese date night" 20/26 800 · Chip "⏱ 15 min" }.
4. 10 below: steps list, gap 8. Step row: `surfaceAlt`, radius 12, padding 10×12, gap 12; number in a 28 pt `surface` circle, 13 800 `ink` (the mockup shows `brandDark`, but that is 3.1:1 on white, so use `ink`); text 15/20 500.
   1. Slice Big Tom into thick rounds.
   2. Tear Mozz into soft pieces.
   3. Layer them, alternating. Tuck Basil in between.
   4. Olive oil, flaky salt, pepper. Serve.
5. Docked: text button "Not tonight → next match" (15/20 700 `inkMuted`, 48 tall hit area), then 12 below a big PrimaryButton: height 64, 🍳 "I cooked it", 20 pt label.

Animation: card springs in from scale 0.8 (damping 14); faces slide in from ±60 pt, 300 ms `Easing.out(Easing.back(1.4))`; heart pops 0 → 1.2 → 1 last (200 ms); success haptic when the heart lands. "I cooked it" marks matched items eaten and navigates to Rescue.

### 2.5 Rescue celebration — `docs/screens/celebration.png`

1. Confetti layer (§3.4), full screen, behind content.
2. 28 below status: 🎉 (44) · "Rescued!" (`display`) · "Caprese date night · 15 min" (15/20 600 `inkMuted`).
3. 28 below: thanks rows, 14 apart. Face 64 shown as **cocky** (rescued = happy) + SpeechBubble with `cockyTint` fill:
   - Big Tom: "You actually did it. I'm emotional."
   - Mozz: "Best date of my life. Also my last."
   - Cameo, Face 40 dramatic, white bubble 14/19: Avo: "Um, hello? Still here. Tonight. Me."
4. 26 below: "RESCUED" label (13/18 700, uppercase, letter-spacing 0.8, `inkMuted`) over "+2" (`countdown`, `success`).
5. Scoreboard (existing), rescued tile with a 3 pt `success` ring; value counts 5 → 7.
6. Docked PrimaryButton: 🧊 "Back to the fridge".

Animation: on mount, success notification haptic; confetti bursts; thanks rows fade+rise 16 pt, staggered 150 ms; "+2" pops 0.6 → 1 spring; score value counts up over 600 ms `Easing.out(Easing.cubic)` with the ring fading in at the end.

### 2.6 Ghost and memorial — `docs/screens/ghost-memorial.png`

**A. Fridge with ghost**
1. Top bar: "Fridge" (`display`) · RoundButtons 💬 (chat) and 💘 (match).
2. Scoreboard (in fridge / rescued / lost). Tapping "lost" opens B.
3. CharacterCard list, sorted most urgent first, 12 apart.
4. GhostLayer (existing) over the list, right 12: Face 72 ghost (opacity 0.6) with a bubble above it — white 92%, 1.5 pt dashed `ghost` border, 15/20 700: "Still here. Take out the trash." — and a name tag "👻 Leafy Lou" (white 85%, pill, `caption` `inkMuted`).
5. Docked PrimaryButton, tone danger (`dangerStrong` fill, white label): 🗑️ "Take out the trash".

Animation: ghost floats ±10 pt, 2800 ms full cycle, `Easing.inOut(Easing.sin)`; on Toss the ghost drifts up 80 pt and fades out (500 ms), light haptic, lost count +1.

**B. Memorial wall**
1. Top bar: back ‹ · "Memorial wall" (`title`). Sub 15/20 600 `inkMuted`: "3 lost this month. Gone, not forgotten."
2. 2-column grid of Tombstones (§3.3), gap 16.
3. Footer caption: "🕯️ Rest in pieces".

Epitaphs:
- Leafy Lou (Spinach), Nov 1 – Nov 4: "Here lies Spinach. Bought with good intentions. Never opened."
- Half an Onion, Oct 20 – Oct 29: "Wrapped in foil. Forgotten in spirit."
- Cilantro Carl, Oct 12 – Oct 15: "It wasn't you. It was the soap."
- Pad Thai, Oct 3 – Oct 9: "Tasted better than it smelled."

Animation: stones rise in 12 pt with fade, staggered 80 ms.

---

## 3. New components (not yet in `src/components`)

### 3.1 ChatInput

```ts
interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: (text: string) => void;
  placeholder?: string;      // default "Talk to the fridge…"
  sending?: boolean;         // shows a spinner in the send button
}
```

- Row: height 56 min, radius pill, `surface`, 1.5 `line` border, padding left 20, right 4, gap 8.
- `TextInput`: `body` 16/22 500 `ink`, placeholder `inkMuted`, `returnKeyType="send"`, multiline up to 4 lines (row grows, radius becomes 28).
- Send button: 48 circle, `brand` fill, ➤ glyph in `ink`.
- States: **empty** send at opacity 0.4, disabled · **typing** opacity 1 · **focused** border `ink` 2 pt · **sending** `ActivityIndicator` color `ink`.
- Wrap the screen in `KeyboardAvoidingView` (`behavior="padding"` on iOS) so the input rides on the keyboard.

### 3.2 MatchCard

```ts
interface MatchCardProps {
  pair: [Character, Character];
  thirdWheel?: { emoji: string; name: string };   // Basil 🌿
  kicker?: string;                                 // default "It's a match!"
}
```

- Card: `surface`, radius 28, padding 20, `shadow.card`, items centered, gap 8.
- Kicker: 30/36 800, `brandDark` (3.1:1 on white is fine for 30 pt bold; never smaller).
- Faces: two `Face` 96 with a ❤️ (36 pt) between them, overlapping −8 each side.
- Names: `title` "Big Tom & Mozz", the "&" in `brandDark`.
- Third wheel row: Face 32 (cocky, no badge) + `caption` `inkMuted` "+ Basil, third wheel".
- States: **entering** (spring, see §2.4) · **static**.

### 3.3 Tombstone

```ts
interface TombstoneProps {
  emoji: string;
  name: string;
  dates: string;       // "Nov 1 – Nov 4"
  epitaph: string;     // keep ≤ 70 chars
}
```

- Container: `ghost.tint` fill, 2 pt `ghost.color` border, radii `{ topLeft: 80, topRight: 80, bottomLeft: 12, bottomRight: 12 }`, padding 20 top, 12 sides, 16 bottom, gap 4, centered.
- Face 48, ghost, no badge.
- Name 16/22 700 `ink` · dates 12/16 600 `ghost.text` · epitaph 13/18 500 `ghost.text` (5.1:1), 4 pt above.
- States: static only. Long-press (optional) shows the full epitaph in a sheet.

### 3.4 Confetti

```ts
interface ConfettiProps {
  count?: number;          // default 46
  colors?: string[];       // default [brand, cocky, chill, nervous, dramatic]
  durationMs?: number;     // default 2400
  onDone?: () => void;
}
```

- `pointerEvents="none"`, absolute fill, behind content.
- Pieces: random from 8×14 rect (radius 2), 10×10 circle, 6×16 rect. Random x across width, start y −20 to 40%.
- Motion per piece (Reanimated): fall 60–300 pt with `Easing.in(Easing.quad)`, rotate ±180°, opacity 0 → 1 (first 15%) → 0, random delay 0–600 ms. One burst, no loop.
- Reduced motion: render nothing.

### 3.5 Face expression overlays (optional)

SVGs in `assets/faces/{cocky,chill,nervous,dramatic,ghost}.svg`, 100×100 viewBox matching the face circle. Render with `react-native-svg` (or `expo-image`) absolutely over the circle at the same size as the Face; dim the emoji to 0.4 when an overlay is on. Preview: `docs/face-expressions.png`.

---

## 4. App icon and splash

- `assets/icon.png`: 1024×1024, opaque, no rounded corners (iOS masks it). Option A smiling fridge on `#FF8A3D`. Fridge occupies the center 47% × 66%.
- `assets/adaptive-icon.png`: 1024×1024 transparent foreground. Fridge scaled to fit inside the central 66% safe circle. Background color `#FF8A3D`.
- `assets/splash.png`: 1024×1024 on `#FFF7EC`: rounded icon tile (500) + "FridgeMates" Nunito 900. The image's own background matches `backgroundColor`, so edges never show.
- Legibility check at 60 / 40 / 29 pt on cream, dark and blue wallpapers: `docs/icon-check.png`.

**Splash background: `#FFF7EC`** (same as `bg`).

Recommended `app.json` changes (not applied; the current file still points at `./assets/images/*`):

```json
{
  "expo": {
    "icon": "./assets/icon.png",
    "backgroundColor": "#FFF7EC",
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FF8A3D"
      }
    },
    "plugins": [
      [
        "expo-splash-screen",
        {
          "image": "./assets/splash.png",
          "imageWidth": 240,
          "resizeMode": "contain",
          "backgroundColor": "#FFF7EC"
        }
      ]
    ]
  }
}
```

`imageWidth` 240 keeps the wordmark legible (~31 pt tall text). If you keep the existing `android.adaptiveIcon.backgroundImage` / `monochromeImage` entries, remove `backgroundImage` so the solid `backgroundColor` is used. Splash and icon changes need a new native build (`npx expo prebuild` / dev build); they don't show in a JS reload.

---

## 5. Accessibility: final color pairs

WCAG 2 contrast. Body text ≥ 4.5:1; text ≥ 24 pt (or ≥ 18.5 pt bold) ≥ 3:1.

**Button fix:** white on tangerine is 2.35:1 and fails. Use **dark text on tangerine**: set `brandInk` to `#2B2118` (6.72:1). If you must keep white text, use the darker fill `#B8500F` (white 5.01:1), but that changes the brand color, so dark text is the recommendation.

| Foreground | Background | Ratio | Use | Pass |
| --- | --- | --- | --- | --- |
| `#2B2118` ink | `#FF8A3D` brand | 6.72 | **Primary button label**, my chat bubble, +N tag | ✅ |
| `#2B2118` ink | `#3DBE7A` success | 6.63 | Success button label ("Ate it") | ✅ |
| `#FFFFFF` | `#C0392B` dangerStrong | 5.44 | Danger button label ("Take out the trash") | ✅ |
| `#FFFFFF` | `#E5483A` danger | 3.95 | ❌ don't use for button text |
| `#FFFFFF` | `#FF8A3D` brand | 2.35 | ❌ old button label |
| `#2B2118` ink | `#FFF7EC` bg | 14.82 | All text on screen | ✅ |
| `#7A6B5E` inkMuted | `#FFF7EC` bg | 4.83 | Captions on background | ✅ |
| `#7A6B5E` inkMuted | `#FFFFFF` surface | 5.13 | Captions on cards | ✅ |
| `#1E7A4B` cocky.text | `#E3F7EC` cocky.tint | 4.77 | Cocky pill | ✅ |
| `#2A5DA0` chill.text | `#E4EFFC` chill.tint | 5.69 | Chill pill | ✅ |
| `#8A5A00` nervous.text | `#FFF1D3` nervous.tint | 5.30 | Nervous pill | ✅ |
| `#B2321F` dramatic.text | `#FFE3DF` dramatic.tint | 5.14 | Dramatic pill | ✅ |
| `#5E666D` ghost.text | `#EEF0F2` ghost.tint | 5.11 | Ghost pill, epitaphs | ✅ |
| `#2B2118` ink | any mood tint | ≥ 12 | Chat bubbles | ✅ |
| `#E8702A` brandDark | `#FFFFFF` | 3.10 | Only ≥ 24 pt bold ("It's a match!") | ✅ large only |
| `#E8702A` brandDark | `#FFF1DE` surfaceAlt | 2.79 | ❌ debug chip text → use `ink` |
| `#B5A89A` inkFaint | `#FFF7EC` bg | 2.19 | Decorative chevron only | n/a |

Also:
- Every icon-only button needs `accessibilityLabel` (RoundButton already requires `label`).
- Mood is never color-only: the pill always says the days left, and the badge emoji differs per mood.
- Focus ring (external keyboard / web): 3 pt `ink` outline with 2 pt offset.
- Minimum tap target 48 pt; primary actions 56–64 pt.
- Honor `useReducedMotion()` everywhere listed above.

---

## 6. File index

| Path | What |
| --- | --- |
| `assets/icon.png` | iOS / default app icon, 1024 opaque |
| `assets/adaptive-icon.png` | Android adaptive foreground, 1024 transparent |
| `assets/splash.png` | Splash image, 1024 on cream |
| `assets/faces/*.svg` | Mood expression overlays (5) |
| `docs/screens/*.png` | Screen mockups, 2× |
| `docs/icon-check.png` | Icon at small sizes on three wallpapers |
| `docs/face-expressions.png` | Expression overlay preview |
| `docs/devpost-cover.png` | Devpost cover, 1500×1000 |
