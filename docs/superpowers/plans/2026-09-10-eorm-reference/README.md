# EORM — Expenses of Resource Management

A personal expense tracker for one person. No accounts, no login, no cloud service to sign up for beyond a free Supabase database.

You log three kinds of entries — **expenses**, **income** and **savings** — and set a **monthly spending limit per category**. The app shows you, for any month: what came in, what went out, what you put aside, what is left, and which categories you have blown past their limit. There is also a yearly report and a full searchable record of every transaction you can edit or delete.

It has three pieces:

```
Expo app on your phone  ──HTTP──>  Node server on your Mac (:4000)  ──>  Supabase Postgres
```

The phone talks only to your Mac. Your Mac talks to the database. Both must be on the same wifi network for the app to work — this is a home-network app, not a hosted one.

---

## What I need from you

Four things. Everything else in this README is a step you follow; these four are things only you can supply.

- [ ] **1. A Supabase project** — free tier is fine. You will copy two values out of it: the **Project URL** and the **`service_role` API key**. (Steps 1 and 2 below.)
- [ ] **2. `schema.sql` run once** in that project's SQL Editor, to create the five tables and the eight starter categories. (Step 3.)
- [ ] **3. Expo Go installed on your phone** — free, from the iOS App Store or Google Play. This is what runs the app; you do not need to build or publish anything. (Step 6.)
- [ ] **4. Your Mac's LAN IP address** — a number like `192.168.1.24`. One terminal command gets it. (Step 5.)

---

## Prerequisites

| Thing | How to check | If missing |
|---|---|---|
| macOS with a Terminal | — | — |
| Node.js 18 or newer | `node -v` | Install from [nodejs.org](https://nodejs.org) (LTS) |
| npm | `npm -v` | Ships with Node |
| A phone on the **same wifi** as the Mac | — | — |
| Expo Go on that phone | — | App Store / Google Play, search "Expo Go" |
| `curl` | `curl --version` | Preinstalled on macOS |

Node 18+ matters: the backend uses ESM (`"type": "module"`) and the app's API layer uses the built-in `fetch`.

---

## Step 1 — Create a Supabase project

Supabase is a hosted Postgres database with a web dashboard. You will never write Supabase-specific code; it is just where your data lives.

1. Go to [supabase.com](https://supabase.com) and click **Start your project**. Sign in with GitHub or an email address.
2. On the dashboard, click **New project**.
3. Fill in:
   - **Name** — `eorm` (anything you like).
   - **Database Password** — click *Generate a password* and save it in your password manager. You will **not** need it for this app (the app connects with an API key, not the database password), but Supabase will not let you recover it later.
   - **Region** — pick the one closest to you.
   - **Pricing plan** — Free.
4. Click **Create new project** and wait. Provisioning takes 1–3 minutes; the dashboard shows a spinner and then drops you on the project home page.

---

## Step 2 — Copy the Project URL and the service_role key

In the left sidebar of your project, click the **gear icon (Project Settings)** at the bottom, then click **API**.

On that page you need exactly two values:

**a) Project URL**
Under the heading **Project URL**. It looks like:

```
https://abcdefghijklmnop.supabase.co
```

**b) service_role key**
Scroll to **Project API keys**. There are two keys listed:

| Key | Label in dashboard | Use it? |
|---|---|---|
| `anon` `public` | anon / public | **No.** Ignore this one. |
| `service_role` `secret` | service_role / secret — hidden behind a **Reveal** button | **Yes.** This is the one. |

Click **Reveal** next to `service_role`, then click the copy icon. It is a very long string starting with `eyJ`.

> ### ⚠️ The service_role key is a master password for your database
>
> It bypasses every security rule in Postgres. Anyone holding it can read, change or delete all of your data.
>
> - Put it **only** in `backend/.env` on your Mac.
> - Never paste it into the phone app, a browser, a chat message, a screenshot, or a public repo.
> - `.env` files are gitignored in this project. Keep it that way.
> - If you ever leak it, go back to **Settings → API** and use the reset/rotate option, then update `backend/.env`.
>
> The `anon` key is the one that is safe to expose — and this app deliberately does not use it at all.

Newer Supabase dashboards may show the keys under **Settings → API Keys** with the names **Publishable** (= anon) and **Secret** (= service_role). Take the **Secret** one.

Keep both values in a scratch note; you paste them in Step 4.

---

## Step 3 — Create the tables

The file `schema.sql` at the root of this project creates everything the app needs: five tables, four indexes, row-level security, and eight starter categories.

1. In the Supabase sidebar, click **SQL Editor**.
2. Click **New query**.
3. Open `schema.sql` from this project in a text editor, select all, copy.
4. Paste it into the SQL Editor.
5. Click **Run** (or press ⌘↵).

You should see **Success. No rows returned**.

To confirm it worked, click **Table Editor** in the sidebar. You should see five tables: `budgets`, `categories`, `expenses`, `income`, `savings`. Open `categories` — it should have exactly 8 rows: Food, Transport, Bills, Shopping, Health, Rent, Entertainment, Other, each with a hex color.

**The file is safe to re-run.** It starts with `drop table if exists ... cascade`, so running it again wipes your data and starts fresh. That is deliberate — but do not paste it into a project that has entries you want to keep.

One thing you may notice in the Table Editor: a warning that RLS is enabled with no policies. That is intentional. Row-level security is on for all five tables and **no policies are defined**, which means the public `anon` key can read nothing. The backend uses the `service_role` key, which bypasses RLS, so it is unaffected. This is the lock on the front door.

---

## Step 4 — Configure and start the backend

```bash
cd backend
cp .env.example .env
```

Open `backend/.env` in an editor and fill in the two values from Step 2:

```
SUPABASE_URL=https://abcdefghijklmnop.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-very-long-service-role-key
PORT=4000
```

No quotes, no spaces around the `=`, no trailing slash on the URL.

Install and run:

```bash
npm install
npm start
```

You should see:

```
EORM API listening on http://0.0.0.0:4000
```

Leave this terminal window open — this is your server. Open a **second** terminal tab for the remaining steps. To stop the server later, press `Ctrl+C` in this window.

Quick check, from the second tab:

```bash
curl http://localhost:4000/health
```

```json
{"ok":true}
```

If that works, the server is up. If it starts and then immediately exits with a message about `SUPABASE_URL`, your `.env` is missing or misspelled.

---

## Step 5 — Find your Mac's LAN IP address

The phone cannot reach `localhost` — on the phone, `localhost` means the phone. It needs your Mac's address on the wifi network.

```bash
ipconfig getifaddr en0
```

```
192.168.1.24
```

`en0` is wifi on most Macs. If that command prints nothing, you are probably on ethernet or a Mac where the interfaces are numbered differently — try:

```bash
ipconfig getifaddr en1
```

Or ask for both at once and take whichever answers:

```bash
ipconfig getifaddr en0 || ipconfig getifaddr en1
```

A valid answer starts with `192.168.`, `10.` or `172.`. If you get `127.0.0.1` that is loopback, not your LAN address — try the other interface. If both are empty, your Mac is not connected to a network.

Write the number down. Now confirm the phone-facing address works from the Mac itself:

```bash
curl http://192.168.1.24:4000/health
```

```json
{"ok":true}
```

(Substitute your own IP everywhere you see `192.168.1.24` from here on.)

---

## Step 6 — Configure and run the app

```bash
cd app
cp .env.example .env
```

Open `app/.env` and put in your IP from Step 5:

```
EXPO_PUBLIC_API_URL=http://192.168.1.24:4000
```

It must include `http://` and the `:4000` port, and must **not** have a trailing slash.

Install and start:

```bash
npm install
npx expo start
```

A QR code appears in the terminal.

- **iPhone** — open the built-in Camera app, point it at the QR code, tap the notification banner. It opens in Expo Go.
- **Android** — open **Expo Go**, tap **Scan QR code**, point it at the code.

The app downloads the JavaScript bundle from your Mac and starts. First load takes a few seconds.

Walk through it: **Home** shows this month's totals (all zeros to start), **Add** logs an entry, **Records** lists everything, **Reports** shows the year, **Budgets** sets per-category limits.

> **Important:** `EXPO_PUBLIC_*` variables are baked into the bundle when it is built. If you edit `app/.env` you must restart Expo and clear its cache:
>
> ```bash
> npx expo start -c
> ```
>
> Simply reloading the app on the phone is not enough.

---

## Smoke test the API with curl

Run these from a terminal on your Mac while `npm start` is running in the backend. This exercises every layer — server, Supabase connection, schema, and the aggregation logic — in about thirty seconds.

**1. Health**

```bash
curl http://localhost:4000/health
```

```json
{"ok":true}
```

**2. Categories** — should be the eight seeded rows, ordered by name

```bash
curl http://localhost:4000/categories
```

```json
[{"id":"6f0d2f1e-6a55-4f8e-9a13-2b7c4d8e1a01","name":"Bills","color":"#8B5CF6"},
 {"id":"c1a7b9d2-33e4-4a71-88ff-5d2e9c0b7a12","name":"Entertainment","color":"#06B6D4"},
 {"id":"9b3e5c77-1d20-4c6a-b0e9-77a1f2c3d4e5","name":"Food","color":"#F97316"},
 {"id":"2d8f4a10-9c33-4b52-a7d6-11e8b9c0f3a4","name":"Health","color":"#10B981"},
 {"id":"7e5c1b39-4a88-4d02-9f31-6c0a2b4d8e97","name":"Other","color":"#94A3B8"},
 {"id":"b4a2c6d8-5e71-4093-84ac-3f9d1e7b2c60","name":"Rent","color":"#F59E0B"},
 {"id":"05f9e3a1-72b4-4c88-9d16-8a3c5e7f1b29","name":"Shopping","color":"#EC4899"},
 {"id":"3c6b8e40-1f92-4a37-bd05-9e2a7c4f6d18","name":"Transport","color":"#3B82F6"}]
```

Your UUIDs will be different — that is expected. If you get `{"error":"Invalid API key"}` here, jump to Troubleshooting.

**3. Grab the Food category id into a shell variable**

```bash
FOOD=$(curl -s http://localhost:4000/categories \
  | tr ',' '\n' | grep -B2 '"Food"' | grep '"id"' \
  | head -1 | cut -d'"' -f4)
echo $FOOD
```

```
9b3e5c77-1d20-4c6a-b0e9-77a1f2c3d4e5
```

**4. Create an expense**

```bash
curl -X POST http://localhost:4000/expenses \
  -H 'Content-Type: application/json' \
  -d "{\"amount\":450.50,\"category_id\":\"$FOOD\",\"date\":\"2026-09-10\",\"note\":\"Groceries\"}"
```

```json
{"id":"e81c4a90-2b73-45de-9f60-1a3c8d5e7b02","amount":450.5,"category_id":"9b3e5c77-1d20-4c6a-b0e9-77a1f2c3d4e5","category_name":"Food","category_color":"#F97316","date":"2026-09-10","note":"Groceries"}
```

Note `450.5` — a **number**, not `"450.50"` in quotes. That matters; see Troubleshooting.

**5. Add some income and a saving**

```bash
curl -X POST http://localhost:4000/income \
  -H 'Content-Type: application/json' \
  -d '{"amount":50000,"source":"Salary","date":"2026-09-01","note":"September"}'

curl -X POST http://localhost:4000/savings \
  -H 'Content-Type: application/json' \
  -d '{"amount":8000,"date":"2026-09-02","note":"Emergency fund"}'
```

```json
{"id":"a2d7f5c1-88b0-4e39-91a4-6c2e0b7d3f58","amount":50000,"source":"Salary","date":"2026-09-01","note":"September"}
{"id":"fd91b3e7-4c26-4a80-b5f2-0e8a7c1d9642","amount":8000,"date":"2026-09-02","note":"Emergency fund"}
```

**6. List a month**

```bash
curl 'http://localhost:4000/expenses?month=2026-09'
```

```json
[{"id":"e81c4a90-2b73-45de-9f60-1a3c8d5e7b02","amount":450.5,"category_id":"9b3e5c77-1d20-4c6a-b0e9-77a1f2c3d4e5","category_name":"Food","category_color":"#F97316","date":"2026-09-10","note":"Groceries"}]
```

**7. Set a budget** — a limit of 5000 on Food for September

```bash
curl -X PUT http://localhost:4000/budgets \
  -H 'Content-Type: application/json' \
  -d "{\"month\":\"2026-09\",\"category_id\":\"$FOOD\",\"limit_amount\":5000}"
```

```json
{"id":"0f2a1b44-9c31-4e5d-8a77-2b6c9d0e1f34","category_id":"9b3e5c77-1d20-4c6a-b0e9-77a1f2c3d4e5","month":"2026-09","limit_amount":5000}
```

**8. Read budgets back** — every category appears, unset ones as `0`

```bash
curl 'http://localhost:4000/budgets?month=2026-09'
```

```json
[{"category_id":"6f0d2f1e-6a55-4f8e-9a13-2b7c4d8e1a01","category_name":"Bills","category_color":"#8B5CF6","limit_amount":0},
 {"category_id":"c1a7b9d2-33e4-4a71-88ff-5d2e9c0b7a12","category_name":"Entertainment","category_color":"#06B6D4","limit_amount":0},
 {"category_id":"9b3e5c77-1d20-4c6a-b0e9-77a1f2c3d4e5","category_name":"Food","category_color":"#F97316","limit_amount":5000},
 {"category_id":"2d8f4a10-9c33-4b52-a7d6-11e8b9c0f3a4","category_name":"Health","category_color":"#10B981","limit_amount":0},
 {"category_id":"7e5c1b39-4a88-4d02-9f31-6c0a2b4d8e97","category_name":"Other","category_color":"#94A3B8","limit_amount":0},
 {"category_id":"b4a2c6d8-5e71-4093-84ac-3f9d1e7b2c60","category_name":"Rent","category_color":"#F59E0B","limit_amount":0},
 {"category_id":"05f9e3a1-72b4-4c88-9d16-8a3c5e7f1b29","category_name":"Shopping","category_color":"#EC4899","limit_amount":0},
 {"category_id":"3c6b8e40-1f92-4a37-bd05-9e2a7c4f6d18","category_name":"Transport","category_color":"#3B82F6","limit_amount":0}]
```

**9. Monthly summary** — the one call the Home screen makes

```bash
curl 'http://localhost:4000/summary?month=2026-09'
```

```json
{"month":"2026-09","income_total":50000,"expense_total":450.5,"savings_total":8000,"balance":41549.5,
 "categories":[
  {"category_id":"6f0d2f1e-6a55-4f8e-9a13-2b7c4d8e1a01","name":"Bills","color":"#8B5CF6","spent":0,"limit":0,"over":false,"pct":0},
  {"category_id":"c1a7b9d2-33e4-4a71-88ff-5d2e9c0b7a12","name":"Entertainment","color":"#06B6D4","spent":0,"limit":0,"over":false,"pct":0},
  {"category_id":"9b3e5c77-1d20-4c6a-b0e9-77a1f2c3d4e5","name":"Food","color":"#F97316","spent":450.5,"limit":5000,"over":false,"pct":9},
  {"category_id":"2d8f4a10-9c33-4b52-a7d6-11e8b9c0f3a4","name":"Health","color":"#10B981","spent":0,"limit":0,"over":false,"pct":0},
  {"category_id":"7e5c1b39-4a88-4d02-9f31-6c0a2b4d8e97","name":"Other","color":"#94A3B8","spent":0,"limit":0,"over":false,"pct":0},
  {"category_id":"b4a2c6d8-5e71-4093-84ac-3f9d1e7b2c60","name":"Rent","color":"#F59E0B","spent":0,"limit":0,"over":false,"pct":0},
  {"category_id":"05f9e3a1-72b4-4c88-9d16-8a3c5e7f1b29","name":"Shopping","color":"#EC4899","spent":0,"limit":0,"over":false,"pct":0},
  {"category_id":"3c6b8e40-1f92-4a37-bd05-9e2a7c4f6d18","name":"Transport","color":"#3B82F6","spent":0,"limit":0,"over":false,"pct":0}]}
```

Check the arithmetic: `balance = 50000 - 450.5 - 8000 = 41549.5`. Balance can go negative and the app renders that in red.

**10. Trip the overspend flag** — spend past the 5000 limit

```bash
curl -X POST http://localhost:4000/expenses \
  -H 'Content-Type: application/json' \
  -d "{\"amount\":5800,\"category_id\":\"$FOOD\",\"date\":\"2026-09-11\",\"note\":\"Big shop\"}"

curl 'http://localhost:4000/summary?month=2026-09'
```

The Food entry now reads:

```json
{"category_id":"9b3e5c77-1d20-4c6a-b0e9-77a1f2c3d4e5","name":"Food","color":"#F97316","spent":6250.5,"limit":5000,"over":true,"pct":125}
```

`over: true`, `pct: 125`. That is the red bar on the Home screen.

**11. Yearly summary** — twelve months, always all twelve, zero-filled

```bash
curl 'http://localhost:4000/summary/year?year=2026'
```

```json
{"year":2026,
 "months":[{"month":"2026-01","income":0,"expense":0,"savings":0},
           {"month":"2026-02","income":0,"expense":0,"savings":0},
           {"month":"2026-03","income":0,"expense":0,"savings":0},
           {"month":"2026-04","income":0,"expense":0,"savings":0},
           {"month":"2026-05","income":0,"expense":0,"savings":0},
           {"month":"2026-06","income":0,"expense":0,"savings":0},
           {"month":"2026-07","income":0,"expense":0,"savings":0},
           {"month":"2026-08","income":0,"expense":0,"savings":0},
           {"month":"2026-09","income":50000,"expense":6250.5,"savings":8000},
           {"month":"2026-10","income":0,"expense":0,"savings":0},
           {"month":"2026-11","income":0,"expense":0,"savings":0},
           {"month":"2026-12","income":0,"expense":0,"savings":0}],
 "income_total":50000,"expense_total":6250.5,"savings_total":8000,
 "categories":[{"name":"Food","color":"#F97316","spent":6250.5}]}
```

**12. Delete the test expense** — returns 204 with an empty body

```bash
curl -i -X DELETE http://localhost:4000/expenses/e81c4a90-2b73-45de-9f60-1a3c8d5e7b02
```

```
HTTP/1.1 204 No Content
```

**13. Confirm errors look right**

```bash
curl -i -X POST http://localhost:4000/expenses \
  -H 'Content-Type: application/json' -d '{"amount":-5}'
```

```
HTTP/1.1 400 Bad Request
{"error":"Amount must be greater than 0"}
```

Every failure comes back as `{"error":"..."}` with status 400 (bad input), 404 (no such id) or 500 (Supabase problem). The app shows that exact text on screen.

If all thirteen behaved, the backend is fully working and any remaining problem is on the phone side.

---

## Troubleshooting

### The phone shows "the backend may not be reachable" / everything spins forever

This is far and away the most common problem, and it is almost always the network, not the code. Work through these in order:

1. **Is the backend actually running?** In the backend terminal you should still see the "listening" line and no crash. Run `curl http://localhost:4000/health` on the Mac.
2. **Is the LAN IP still right?** Re-run `ipconfig getifaddr en0` and compare it to `EXPO_PUBLIC_API_URL` in `app/.env`. See the router-reboot note below.
3. **Same wifi?** On the phone, Settings → Wi-Fi, and on the Mac, click the wifi icon in the menu bar. The network **names must match exactly**. Being on "MyWifi" and "MyWifi_5G" counts as two different networks on many routers, and they often cannot see each other.
4. **Phone not on cellular.** If wifi is weak the phone may have quietly switched to mobile data, which cannot reach your Mac at all. Toggle wifi off and on.
5. **Test from the phone's browser.** Open Safari/Chrome on the phone and go to `http://192.168.1.24:4000/health` (your IP). If you see `{"ok":true}` the network is fine and the problem is `app/.env`. If the browser times out too, it is the network or the firewall.
6. **macOS firewall.** The first time the Node server accepts an outside connection, macOS pops up **"Do you want the application 'node' to accept incoming network connections?"** — you must click **Allow**. If you clicked Deny, or the prompt never appeared, go to **System Settings → Network → Firewall**. Either turn the firewall off while you use the app, or click **Options…** and make sure `node` is listed as **Allow incoming connections**. If `node` is not listed, quit the server, restart it, and hit the endpoint from the phone to re-trigger the prompt.
7. **Guest network / client isolation.** Some routers (and most guest networks) block devices from talking to each other. If you are on a guest SSID, switch both devices to the main one.
8. **VPN.** A VPN running on either the phone or the Mac will route traffic away from the LAN. Turn it off.
9. **Did you restart Expo after editing `.env`?** `EXPO_PUBLIC_*` values are compiled into the bundle. Stop Expo and run `npx expo start -c`.

### The IP changed after a router reboot

Your Mac gets its IP from the router by DHCP, and a reboot or a lease expiry can hand it a different one. Symptom: everything worked yesterday and today the app cannot connect.

Fix:

```bash
ipconfig getifaddr en0
```

Put the new number in `app/.env`, then restart Expo with the cache cleared:

```bash
cd app && npx expo start -c
```

The backend needs no change — it listens on all interfaces.

To stop this happening, reserve a fixed address for your Mac in your router's admin page (usually called *DHCP Reservation* or *Static Lease*, keyed to the Mac's wifi MAC address). Then the IP never moves and `app/.env` never needs touching again.

### `{"error":"Invalid API key"}` or `{"error":"JWT..."}` from any endpoint

The backend is reaching Supabase but Supabase rejected the credentials. Check `backend/.env`:

- Did you copy the **`service_role` / Secret** key, not the `anon` / Publishable one? The anon key will connect but return **empty arrays for everything**, because RLS is on with no policies — so if lists come back as `[]` even though the Table Editor shows rows, this is your bug.
- Is the whole key there? It is very long and easy to truncate. It should start `eyJ` and have two dots in it.
- Any stray quotes, spaces or a trailing newline? The value goes in bare: `SUPABASE_SERVICE_KEY=eyJ...`, no quotes.
- Is `SUPABASE_URL` the full `https://xxxx.supabase.co` with no trailing slash and no `/rest/v1` on the end?
- Did you restart the backend after editing `.env`? `Ctrl+C`, then `npm start`. `dotenv` reads the file once at startup.
- Is this the same project you ran `schema.sql` in? If you have more than one Supabase project it is easy to mix the URL of one with the key of another.

### `{"error":"relation \"public.expenses\" does not exist"}`

`schema.sql` was never run, or it was run in a different project. Redo Step 3 and confirm five tables in the Table Editor.

### Amounts show up as strings — `"450.50"` instead of `450.5`

Postgres `numeric` columns come back from `supabase-js` as **strings**, not numbers. If a string reaches the app, totals silently concatenate: `"450.50" + "8000"` becomes `"450.508000"` and every number on Home is nonsense.

The backend passes every amount through `num()` in `backend/src/month.js` before responding, so you should never see this. If you do see quoted numbers in a curl response, that endpoint is missing a `num()` call — that is a backend bug, not a configuration problem. The tell in the app is a total that looks like digits jammed together, or a budget bar that renders at a wild width.

### A screen is empty vs a screen shows an error

These mean different things and the app keeps them distinct on purpose:

- **An explicit empty state** ("No expenses this month") means the request succeeded and there genuinely is nothing. Add an entry, or check the month selector — you may be looking at a month you have not used.
- **An error message with a Retry button** means the request failed. The text shown is the API's own `error` message. Retry after fixing whatever it names; if it mentions reachability, work through the network checklist above.

A blank screen with neither message means the app is still loading — you should see a spinner.

### Expo Go will not load the bundle / QR scan does nothing

- The phone must be on the same wifi for Expo too, not just for the API.
- Try `npx expo start --tunnel` to route the bundle through Expo's servers. Note this only fixes loading the **app code** — your API is still LAN-only, so `EXPO_PUBLIC_API_URL` must still be a reachable address.
- Make sure Expo Go is up to date in the App Store / Play Store.

### `npm install` fails or the app crashes on launch after an install

```bash
cd app && rm -rf node_modules && npm install && npx expo start -c
```

The dependency list is fixed by design — backend: `express`, `cors`, `dotenv`, `@supabase/supabase-js`; app: `expo`, `react`, `react-native`, `@react-navigation/native`, `@react-navigation/bottom-tabs`, `react-native-screens`, `react-native-safe-area-context`, `@react-native-community/datetimepicker`. Adding packages beyond these is a change to the design.

---

## Security

Read this once and then don't forget it.

- The API has **no authentication whatsoever**. Anything that can reach `http://<your-ip>:4000` can read and delete all of your financial records.
- The backend holds the `service_role` key, which **bypasses all row-level security** in Postgres.

That combination is only acceptable because the server is reachable **on your home wifi and nowhere else**. So:

- **Never forward port 4000 on your router.** Do not set up port forwarding, DMZ, UPnP exposure, or a static NAT rule for it.
- **Never tunnel it.** No `ngrok`, no Cloudflare Tunnel, no `localtunnel`, no `expo start --tunnel` pointed at the API. A tunnel puts your unauthenticated database on the public internet, and these URLs get scanned within minutes.
- **Be careful on shared networks** — a café, an office, a hostel. Anyone else on that network can reach your Mac. Stop the backend (`Ctrl+C`) when you are not at home.
- **Keep `.env` out of git.** Both `.env` files are gitignored; do not force-add them, and do not paste keys into issues, screenshots or chats.
- If a key does leak: **Settings → API** in Supabase, rotate the `service_role` key, update `backend/.env`, restart the backend.

If you ever want this app reachable from outside your home, that is a real project — authentication, TLS, a hosted backend, and moving off the `service_role` key. It is not a config toggle.
