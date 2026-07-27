#!/data/data/com.termux/files/usr/bin/env bash
#
# One-command launcher for the Tour Cost Tracker live server.
#
# Starts the app server, then opens a free public Cloudflare tunnel and prints
# the shareable https://...trycloudflare.com link. Works in Termux on Android
# and on regular Linux/macOS too.
#
# Usage:   ./start.sh          (from inside the tour-cost-tracker-live folder)
# Stop:    press Ctrl-C
#
set -e

PORT="${PORT:-3000}"
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

# Keep the phone awake so Android doesn't kill the server (Termux only; ignored elsewhere).
command -v termux-wake-lock >/dev/null 2>&1 && termux-wake-lock || true

echo "Starting Tour Cost Tracker on port $PORT ..."
PORT="$PORT" node server.js &
SERVER_PID=$!

# Make sure the server and tunnel are stopped together on exit.
cleanup() {
  echo ""
  echo "Shutting down ..."
  kill "$SERVER_PID" 2>/dev/null || true
  command -v termux-wake-unlock >/dev/null 2>&1 && termux-wake-unlock || true
}
trap cleanup EXIT INT TERM

# Give the server a moment to boot.
sleep 2

if command -v cloudflared >/dev/null 2>&1; then
  echo ""
  echo "Opening public link (share the https://...trycloudflare.com URL below):"
  echo ""
  cloudflared tunnel --url "http://localhost:$PORT"
else
  echo ""
  echo "cloudflared not found. The app is running locally at http://localhost:$PORT"
  echo "Install it with:  pkg install cloudflared   (then re-run ./start.sh)"
  echo "Press Ctrl-C to stop."
  wait "$SERVER_PID"
fi
