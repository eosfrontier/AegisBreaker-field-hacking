# Frontier AegisBreaker (Field Hacking)

Interactive field-hacking application build for Frontier LAIT built with React and Vite. The app supports live sessions, puzzle tooling, and GM controls backed by Firebase.

## Features
- Live hacking sessions with Firestore-backed state.
- Puzzle suite: Frequency, Logic, Sequence, Master Lock, Signal Shunt.
- GM tools: admin panel, session editor, feedback dashboard, puzzle QR generator.
- QR scanner for players and QR-based deep links to puzzles.
- PWA-ready build with installable app shell.

## Tech Stack
- React 18 + Vite 6
- React Router
- Firebase Firestore
- motion/react for transitions
- Chart.js and QR utilities

## Getting Started
Prereqs: Node 18+ and npm.

1. Install dependencies:
   ```
   npm install
   ```
2. Configure environment:
   ```
   cp .env.example .env
   ```
   Vite only exposes variables prefixed with `VITE_`, so make sure `.env` uses the `VITE_FIREBASE_*` keys.
3. Start the dev server:
   ```
   npm run dev
   ```

## Environment Variables
```
VITE_FIREBASE_API_KEY="..."
VITE_FIREBASE_AUTH_DOMAIN="..."
VITE_FIREBASE_PROJECT_ID="..."
VITE_FIREBASE_STORAGE_BUCKET="..."
VITE_FIREBASE_MESSAGING_SENDER_ID="..."
VITE_FIREBASE_APP_ID="..."
```

## Scripts
- `npm run dev` - start the Vite dev server
- `npm run build` - production build
- `npm run preview` - preview the production build
- `npm run lint` - run ESLint
- `npm test` - run Vitest tests

## Core Routes
```text
/                Home (role select)
/session/:id     Live hacking session
/puzzle          Puzzle host (query string driven)
/QuickHack       Single puzzle flow
/gm-qr           GM puzzle QR generator
/qr-scanner      QR scanner
/scripts-store   Scripts store
/admin           Admin panel
/admin/feedback  Feedback dashboard
```

## Adding puzzles
- Start from `src/features/puzzles/PuzzleTemplate.jsx`.
- Call `markSolved()` from `usePuzzleCompletion()` when the puzzle is complete.
- Register the new puzzle type in:
  - `src/features/puzzles/common/PuzzleHost.jsx`
  - `src/features/unplanned-puzzle/puzzleOptions.js`
  - `src/features/admin/SessionEditor.jsx`
  - `src/features/hacking-session/DefenseGrid.jsx`
  - `src/features/hacking-session/HexGrid.jsx`
  - `src/features/puzzles/styles/PuzzleBase.css` (color variables + class, if needed)

## Deployment
This project is configured for Firebase Hosting.

1. Build the app:
   ```
   npm run build
   ```
2. Deploy:
   ```
   firebase deploy
   ```

Hosting settings live in `firebase.json`, and the project defaults to the `.firebaserc` entry.
