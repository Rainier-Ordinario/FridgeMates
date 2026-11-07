# FridgeMates mobile (Expo SDK 58, TypeScript, Expo Router)

## Run
```bash
cd mobile
npm install
npx expo start            # press i for the iOS simulator
npx expo start --tunnel   # if venue Wi-Fi blocks Expo Go on your phone
```
On your iPhone: install **Expo Go** from the App Store, join the same Wi-Fi, scan the QR code in the terminal.

## Config
Copy `.env.example` to `.env`. `EXPO_PUBLIC_USE_MOCK=true` (default) uses `src/api/mocks` so every screen works offline.
Set `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_USE_MOCK=false` once the backend is deployed. The app never holds the Gemini key.

## Layout
| Folder | Owner | What |
|---|---|---|
| `app/` | Rainier | screens (Expo Router) |
| `src/components/` | Rainier | UI components |
| `src/theme/` | Rainier | design system (colors, moods, type, spacing) |
| `src/api/` | shared | API client, types (README contract), mocks |
| `src/logic/` | ios-logic teammate | store, expiry/mood engine, voices, notifications (stubs with TODOs) |

## Checks
```bash
npx tsc --noEmit && npx expo lint
```
