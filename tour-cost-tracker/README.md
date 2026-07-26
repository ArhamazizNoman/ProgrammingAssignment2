# 🧳 Tour Cost Tracker

A tiny, single-file web app to track the total cost of a group tour and see
**who paid what** so everyone can settle up at the end.

Built for the classic case: *you and a few friends go on a trip. There are
different costs (flight tickets, bus tickets, hotel, food…). Sometimes you pay,
sometimes someone else pays. At the end you want to know the total and how much
each person actually paid.*

## Features

- **People** – Starts with the owner (★) + 3 others. Add or remove anyone.
- **Expenses** – Log each cost with a description, amount, who paid, and a date.
- **Total tour cost** – A live running total of everything.
- **Settlement** – Splits the total equally and shows, for each person,
  how much they paid and whether they should **get money back** or **owe money**.
- **Suggested payments** – The fewest transfers needed so everyone ends up even.
- **Currency picker** – $ / ৳ / € / £ / ₹ / ¥ or none.
- **Saves automatically** – Data is stored in your browser (localStorage).

## How to use

Just open `index.html` in any web browser. No install, no server, no internet
needed.

1. Adjust the list of people (rename by removing/re-adding, add more, etc.).
2. Add each expense as it happens — pick who paid.
3. Watch the **Total tour cost** and the **Who paid & who owes** section update.

## Note on saving / sharing

Data is saved in the browser it was entered in, so refreshing keeps your data.
It is **not** synced across different phones/computers automatically — for a
shared trip, either keep the tally on one device that everyone updates, or host
the file somewhere everyone opens the same link (data still stays per-device).
