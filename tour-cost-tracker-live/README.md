# 🧳 Tour Cost Tracker — Live (multi-device sync)

The real-time version of the tracker. Everyone on the trip opens the **same URL
on their own phone** and sees the same totals update **live** — when one person
adds an expense, it pops up on everyone's screen within a second.

There is **one shared trip**. All devices read and write the same data.

## What's different from the simple version

| | Simple (`../tour-cost-tracker`) | Live (this folder) |
|---|---|---|
| Setup | Just open the file | Run one command |
| Data lives | In each browser | On the server, shared by all |
| Multi-device | No | **Yes, real-time** |
| Needs a running server | No | Yes |

## Run it

You need [Node.js](https://nodejs.org) (v16+). **No `npm install` needed** — it
uses zero dependencies.

```bash
cd tour-cost-tracker-live
npm start        # or: node server.js
```

Then open **http://localhost:3000** in a browser.

To use a different port: `PORT=8080 node server.js`

## Let everyone on the trip join

**On the same Wi-Fi:** find your computer's local IP (e.g. `192.168.1.5`) and
have everyone open `http://192.168.1.5:3000`. That computer must stay on and
running the server.

**From anywhere (recommended for a real trip):** deploy it so it has a public
URL everyone can reach from mobile data:

- **[Render](https://render.com)** / **[Railway](https://railway.app)** —
  create a new web service from this repo, start command `node server.js`.
  (Note: free tiers with an ephemeral disk may reset `data.json` on redeploy.)
- **A small VPS** — copy the folder up and run `node server.js` behind a
  reverse proxy.
- **Quick temporary link** — with the server running locally, expose it using a
  tunnel like `ngrok http 3000` and share the printed URL.

## How it works

- **`server.js`** — a tiny zero-dependency Node HTTP server. It serves the app,
  exposes a small JSON API, and pushes every change to all connected browsers
  using **Server-Sent Events** (`/api/events`). No database — data is saved to
  `data.json` on disk.
- **`public/index.html`** — the app. It subscribes to the live stream and sends
  each action (add person, add expense, delete, set currency) to the server,
  which validates it, saves it, and broadcasts the new state to everyone.
- Edits are **granular** (add/delete specific items), so two people adding
  expenses at the same moment never overwrite each other.
- The green dot in the header shows the live-connection status; if a phone drops
  off Wi-Fi it reconnects automatically.

## Data & reset

- All data is stored in `data.json` next to the server (git-ignored). Back it up
  by copying that file.
- **Reset all data** in the app wipes the shared trip for **everyone** — use
  with care.

## API (for reference)

| Method | Path | Body | Purpose |
|---|---|---|---|
| GET | `/api/state` | — | Current trip data |
| GET | `/api/events` | — | Live updates (SSE) |
| POST | `/api/people` | `{name}` | Add a person |
| DELETE | `/api/people` | `{name}` | Remove a person |
| POST | `/api/expenses` | `{desc, amount, payer, date}` | Add an expense |
| DELETE | `/api/expenses/:id` | — | Delete an expense |
| POST | `/api/currency` | `{currency}` | Set the currency symbol |
| POST | `/api/reset` | — | Wipe everything |
