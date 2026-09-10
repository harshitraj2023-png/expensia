# EORM Expense App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-user personal expense tracker — log income, expenses and savings, set per-category monthly budgets, and see monthly and yearly reports.

**Architecture:** An Expo React Native app talks over the LAN to a Node/Express API running on the user's Mac, which is the only thing that touches Supabase Postgres. The API owns all validation and aggregation so the app stays presentational and the database stays plain storage.

**Tech Stack:** Expo (React Native, plain JS), React Navigation bottom tabs, Node + Express (ESM), `@supabase/supabase-js`, Supabase Postgres.

**Spec:** `docs/superpowers/specs/2026-09-10-eorm-expense-app-design.md`

## Reference implementation

The reference tree below is a planning-time snapshot; `app/` and `backend/` in the repository are authoritative after the final review fixes.

Every file in this plan has already been written and cross-checked by four review passes (import wiring, API contract, runtime correctness, scope compliance). The verified source lives at:

```
docs/superpowers/plans/2026-09-10-eorm-reference/
```

Its layout mirrors the project root exactly, so `…/2026-09-10-eorm-reference/backend/src/routes/expenses.js` becomes `backend/src/routes/expenses.js`. When a step says **copy the reference file**, that means copy it verbatim — the content is committed at that exact path, not left to invent.

**One exception, and it matters:** `app/package.json` in the reference pins Expo SDK 51. Do not copy it. Expo Go on a phone only runs the *current* SDK, so hand-pinned versions will fail to launch. Task 8 scaffolds with `create-expo-app@latest` and installs via `npx expo install`, which resolves correct versions for whatever SDK is current. The reference `app/package.json` is authoritative for the **dependency list only**, never the version numbers.

## Global Constraints

- **No test suite.** The spec rules one out explicitly. Every task ends with an executable verification instead — real curl commands with expected output, or a real check in the running app. Never mark a step done without running its verification and seeing the expected result.
- **No code comments.** The user asked for this directly. Use clear names instead.
- **Plain JavaScript only.** No TypeScript, no type annotations, in either package.
- **Backend dependencies, complete list:** `express`, `cors`, `dotenv`, `@supabase/supabase-js`.
- **App dependencies, complete list:** `expo`, `react`, `react-native`, `@react-navigation/native`, `@react-navigation/bottom-tabs`, `react-native-screens`, `react-native-safe-area-context`, `@react-native-community/datetimepicker`.
- Adding any package outside those two lists is a change to the design, not an implementation detail. Stop and ask.
- **Every amount leaving the backend passes through `num()`.** `supabase-js` returns `numeric` columns as strings; unconverted, `+` concatenates and every total is wrong.
- **Month arithmetic is string/integer math, never `Date`.** Applies to `monthRange`, `MonthPicker`, and building any `YYYY-MM-DD` value. The single permitted use of `Date` is reading *today* via local parts (`getFullYear`/`getMonth`/`getDate`) — never `toISOString()`, which shifts the date across the UTC boundary.
- **Express 4 does not forward async rejections.** Every async route handler wraps its body in try/catch and responds itself.
- **No auth anywhere.** Single user, LAN-only. The `service_role` key lives in `backend/.env` and never reaches the app.
- **Scope is closed:** no investments, no recurring transactions, no charts library, no offline mode, no export.
- `balance = income_total - expense_total - savings_total`, and may be negative.
- `pct = limit > 0 ? Math.round(spent / limit * 100) : 0`; `over = limit > 0 && spent > limit`. A category with no budget is never flagged over.

## File structure

```
expense/
├── README.md                     setup guide — the user's entry point
├── schema.sql                    five tables, indexes, RLS, 6 seeded categories
├── .gitignore                    already committed
├── backend/
│   ├── package.json              ESM, 4 deps, start/dev scripts
│   ├── .env.example              committed template
│   └── src/
│       ├── server.js             app wiring, /health, 404 + error handlers
│       ├── supabase.js           the only dotenv.config() call; service-role client
│       ├── month.js              monthRange / num / currentMonth
│       └── routes/
│           ├── categories.js     CRUD + 23505 duplicate-name handling
│           ├── expenses.js       CRUD + category join flattening
│           ├── income.js         CRUD + source field
│           ├── savings.js        CRUD
│           ├── budgets.js        all-categories merge + upsert
│           └── summary.js        month + year aggregation
└── app/
    ├── package.json              8 deps, versions resolved by expo install
    ├── app.json                  Expo config, name EORM
    ├── babel.config.js           babel-preset-expo
    ├── .env.example              EXPO_PUBLIC_API_URL template
    ├── App.js                    NavigationContainer + 5 bottom tabs
    └── src/
        ├── api.js                apiGet/apiPost/apiPut/apiDelete
        ├── theme.js              colors, spacing, CURRENCY, money()
        ├── components/           Card, MonthPicker, AmountInput, CategoryChips,
        │                         BudgetBar, EmptyState, ErrorState, Screen
        └── screens/              HomeScreen, AddScreen, RecordsScreen,
                                  ReportsScreen, BudgetsScreen
```

Screen files are named `*Screen.js` and `App.js` imports them by those exact names. The reference had these disagreeing — a blocker that stopped the bundle from building at all — and it is fixed in the committed reference. Do not reintroduce it.

---

## Task 1: Database and setup documentation

**Files:**
- Create: `schema.sql`
- Create: `README.md`

**Interfaces:**
- Produces: the five tables (`categories`, `expenses`, `income`, `savings`, `budgets`) every backend route queries, and the 6 seeded category rows the app expects on first launch.

- [ ] **Step 1: Copy the schema**

Copy `docs/superpowers/plans/2026-09-10-eorm-reference/schema.sql` to `schema.sql`.

It creates the five tables with their checks and foreign-key behaviours (`expenses.category_id` → `on delete set null`, `budgets.category_id` → `on delete cascade`), four date indexes, `unique(category_id, month)` on budgets, `enable row level security` on all five with **no policies**, and the 6 seeded categories. It is safe to re-run.

- [ ] **Step 2: Copy the README**

Copy `docs/superpowers/plans/2026-09-10-eorm-reference/README.md` to `README.md`.

This is the user's entry point and the most important non-code deliverable. It opens with a "What I need from you" checklist and walks through Supabase project creation, where to find the Project URL and `service_role` key, running the schema, both `.env` files, finding the Mac's LAN IP, starting both halves, a 13-command curl cookbook, and troubleshooting.

- [ ] **Step 3: Create the Supabase project and run the schema**

In the Supabase dashboard: create a project, open the SQL Editor, paste the whole of `schema.sql`, and run it.

- [ ] **Step 4: Verify the tables and seed data**

In the Supabase dashboard, open Table Editor. Expected: five tables listed — `categories`, `expenses`, `income`, `savings`, `budgets`. Open `categories`. Expected: exactly 6 rows — Food, Transport, Shopping, Health, Rent, Entertainment — each with a hex color.

If `categories` is empty, the seed block did not run; re-run `schema.sql` in full.

- [ ] **Step 5: Commit**

```bash
git add schema.sql README.md
git commit -m "feat: add Supabase schema and setup README"
```

---

## Task 2: Backend foundation

**Files:**
- Create: `backend/package.json`, `backend/.env.example`, `backend/.env`
- Create: `backend/src/supabase.js`, `backend/src/month.js`, `backend/src/server.js`

**Interfaces:**
- Consumes: the Supabase project from Task 1.
- Produces:
  - `supabase.js` → `export const supabase`
  - `month.js` → `export function monthRange(month)` returning `{ start, end }` as a **half-open** interval (filter `.gte('date', start).lt('date', end)` — never `.lte` on `end`), `export function num(v)` (null/undefined → 0, else `Number(v)`), `export function currentMonth()` → `'YYYY-MM'`
  - `server.js` mounts `/categories /expenses /income /savings /budgets /summary` and serves `GET /health`

- [ ] **Step 1: Copy the six files**

Copy each from `docs/superpowers/plans/2026-09-10-eorm-reference/backend/` to `backend/`, preserving paths. Then `cp backend/.env.example backend/.env`.

Three details that later tasks depend on and must not drift:
- `dotenv.config()` is called **exactly once**, in `supabase.js`, immediately before `createClient`. ESM evaluates route imports before `server.js`'s body, so `process.env.PORT` is populated in time. No other file may call it.
- `server.js` listens on `0.0.0.0`, not `localhost`. Bound to localhost the phone cannot reach it, and that failure looks identical to a firewall problem.
- Routers are mounted at their prefix, so paths **inside** each router file are relative: `summary.js` defines `GET '/'` and `GET '/year'`, not `/summary/...`.

- [ ] **Step 2: Fill in the credentials**

Edit `backend/.env` with the Project URL and `service_role` key from Supabase (Settings → API). `backend/.env` is already gitignored — confirm with `git check-ignore backend/.env`, which should print the path.

- [ ] **Step 3: Install and start**

```bash
cd backend && npm install && npm start
```

Expected: `EORM backend listening on http://0.0.0.0:4000`.

If it instead throws `Missing SUPABASE_URL or SUPABASE_SERVICE_KEY`, `.env` is unfilled or in the wrong directory — it belongs at `backend/.env`, not the repo root.

- [ ] **Step 4: Verify health**

```bash
curl -s http://localhost:4000/health
```

Expected: `{"ok":true}`

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4000/nope
```

Expected: `404`

- [ ] **Step 5: Commit**

```bash
git add backend/package.json backend/.env.example backend/src
git commit -m "feat: add backend foundation with Supabase client and month helpers"
```

---

## Task 3: Categories endpoint

**Files:**
- Create: `backend/src/routes/categories.js`

**Interfaces:**
- Consumes: `supabase` from `../supabase.js`.
- Produces: `GET/POST/PUT/DELETE /categories`, items shaped `{id, name, color}`, ordered by name. Every later task depends on category ids from `GET /categories`.

- [ ] **Step 1: Copy the router**

Copy the reference `backend/src/routes/categories.js`.

Behaviours later tasks rely on: `POST` defaults `color` to `#94A3B8` when omitted; a duplicate name raises Postgres error `23505`, which is caught and returned as `400 {"error":"Category already exists"}` rather than a raw 500 — the Add and Budgets screens surface that text inline. `PUT`/`DELETE` on an unknown id return `404 {"error":"Category not found"}`, detected with `.maybeSingle()`.

- [ ] **Step 2: Restart and list the seeded categories**

```bash
curl -s http://localhost:4000/categories | head -c 300
```

Expected: a JSON array of 6 objects, alphabetically ordered, starting with Entertainment. Each has `id`, `name`, `color`.

- [ ] **Step 3: Verify create, duplicate rejection, update and delete**

```bash
NEW=$(curl -s -X POST http://localhost:4000/categories \
  -H 'Content-Type: application/json' -d '{"name":"Gifts"}' | sed 's/.*"id":"\([^"]*\)".*/\1/')
echo "created: $NEW"
```

Expected: a uuid.

```bash
curl -s -X POST http://localhost:4000/categories \
  -H 'Content-Type: application/json' -d '{"name":"Gifts"}'
```

Expected: `{"error":"Category already exists"}`

```bash
curl -s -X PUT http://localhost:4000/categories/$NEW \
  -H 'Content-Type: application/json' -d '{"color":"#FF00AA"}'
curl -s -o /dev/null -w '%{http_code}\n' -X DELETE http://localhost:4000/categories/$NEW
```

Expected: the PUT echoes the category with `"color":"#FF00AA"`; the DELETE prints `204`.

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/categories.js
git commit -m "feat: add categories CRUD endpoint"
```

---

## Task 4: Expenses endpoint

**Files:**
- Create: `backend/src/routes/expenses.js`

**Interfaces:**
- Consumes: `supabase`, `monthRange`, `num`.
- Produces: `GET/POST/PUT/DELETE /expenses`, items shaped `{id, amount, category_id, category_name, category_color, date, note, created_at}`. `amount` is a **number**. Records and Home both read `category_name`.

- [ ] **Step 1: Copy the router**

Copy the reference `backend/src/routes/expenses.js`.

The parts that carry real risk: it selects `'*, categories(name, color)'` and flattens the join in `shape()` **null-safely** — a deleted category leaves `category_id` null, and `row.categories` is then null, so `category_name` must come back as `null` rather than throwing. `amount` goes through `num()`. `created_at` is returned so the Records screen can interleave same-day rows across the three types.

- [ ] **Step 2: Restart and create an expense**

```bash
FOOD=$(curl -s http://localhost:4000/categories | tr ',' '\n' | grep -B2 Food | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1)
curl -s -X POST http://localhost:4000/expenses -H 'Content-Type: application/json' \
  -d "{\"amount\":250.50,\"category_id\":\"$FOOD\",\"date\":\"2026-09-05\",\"note\":\"lunch\"}"
```

Expected: the created row with `"amount":250.5` — **a number, not `"250.50"`**. A quoted string here means `num()` was skipped and every total downstream will be wrong.

- [ ] **Step 3: Verify the join, the month filter and validation**

```bash
curl -s 'http://localhost:4000/expenses?month=2026-09'
```

Expected: one row, with `"category_name":"Food"` and a `category_color` populated from the join.

```bash
curl -s 'http://localhost:4000/expenses?month=2026-08'
```

Expected: `[]` — the month filter excludes it.

```bash
curl -s 'http://localhost:4000/expenses?month=nonsense'
curl -s -X POST http://localhost:4000/expenses -H 'Content-Type: application/json' -d '{"amount":-5}'
```

Expected: `{"error":"Invalid month"}` then `{"error":"Amount must be greater than 0"}`, both with status 400.

- [ ] **Step 4: Verify the December rollover**

```bash
node -e "import('./backend/src/month.js').then(m=>console.log(JSON.stringify(m.monthRange('2026-12'))))"
```

Expected: `{"start":"2026-12-01","end":"2027-01-01"}`. A wrong year here silently drops every December entry from reports.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/expenses.js
git commit -m "feat: add expenses CRUD endpoint with category join"
```

---

## Task 5: Income and savings endpoints

**Files:**
- Create: `backend/src/routes/income.js`, `backend/src/routes/savings.js`

**Interfaces:**
- Produces: `GET/POST/PUT/DELETE /income` (items `{id, amount, source, date, note, created_at}`) and `/savings` (items `{id, amount, date, note, created_at}`). Both amounts are numbers.

These stay two explicit files rather than a shared factory — the spec calls for that deliberately, so each remains readable on its own.

- [ ] **Step 1: Copy both routers**

Copy the reference `backend/src/routes/income.js` and `backend/src/routes/savings.js`.

- [ ] **Step 2: Restart and create one of each**

```bash
curl -s -X POST http://localhost:4000/income -H 'Content-Type: application/json' \
  -d '{"amount":50000,"source":"Salary","date":"2026-09-01"}'
curl -s -X POST http://localhost:4000/savings -H 'Content-Type: application/json' \
  -d '{"amount":8000,"date":"2026-09-02","note":"emergency fund"}'
```

Expected: both echo back created rows with numeric `amount` (`50000`, `8000`) and a `created_at` timestamp.

- [ ] **Step 3: Verify listing and 404s**

```bash
curl -s 'http://localhost:4000/income?month=2026-09'
curl -s 'http://localhost:4000/savings?month=2026-09'
curl -s -X DELETE http://localhost:4000/savings/00000000-0000-0000-0000-000000000000
```

Expected: one row each, then `{"error":"Saving entry not found"}` with status 404.

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/income.js backend/src/routes/savings.js
git commit -m "feat: add income and savings CRUD endpoints"
```

---

## Task 6: Budgets endpoint

**Files:**
- Create: `backend/src/routes/budgets.js`

**Interfaces:**
- Produces: `GET /budgets?month=YYYY-MM` → one row **per category** as `{category_id, category_name, category_color, limit_amount}`, `limit_amount` 0 where unset, ordered by category name. `PUT /budgets {month, category_id, limit_amount}` upserts on `(category_id, month)`.

Returning every category — not only those with a saved budget — is what lets the Budgets and Home screens render a single list without merging two sources.

- [ ] **Step 1: Copy the router**

Copy the reference `backend/src/routes/budgets.js`. The upsert uses `.upsert(..., { onConflict: 'category_id,month' })`, which relies on the unique constraint created in Task 1.

- [ ] **Step 2: Restart and verify the unset case**

```bash
curl -s 'http://localhost:4000/budgets?month=2026-09'
```

Expected: 6 objects (one per category), every `limit_amount` `0`, ordered Entertainment → Transport.

- [ ] **Step 3: Set a limit and verify the upsert is idempotent**

```bash
FOOD=$(curl -s http://localhost:4000/categories | tr ',' '\n' | grep -B2 Food | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1)
curl -s -X PUT http://localhost:4000/budgets -H 'Content-Type: application/json' \
  -d "{\"month\":\"2026-09\",\"category_id\":\"$FOOD\",\"limit_amount\":5000}"
curl -s -X PUT http://localhost:4000/budgets -H 'Content-Type: application/json' \
  -d "{\"month\":\"2026-09\",\"category_id\":\"$FOOD\",\"limit_amount\":6000}"
curl -s 'http://localhost:4000/budgets?month=2026-09' | tr ',' '\n' | grep -A1 Food
```

Expected: Food shows `limit_amount` `6000` and there is exactly one Food row — the second PUT updated rather than inserting a duplicate.

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/budgets.js
git commit -m "feat: add budgets endpoint with per-category upsert"
```

---

## Task 7: Summary endpoint

**Files:**
- Create: `backend/src/routes/summary.js`

**Interfaces:**
- Produces:
  - `GET /summary?month=YYYY-MM` → `{month, income_total, expense_total, savings_total, balance, categories:[{category_id, name, color, spent, limit, over, pct}]}`. Every category appears, including zero-spend ones.
  - `GET /summary/year?year=YYYY` → `{year, months:[12 zero-filled], income_total, expense_total, savings_total, categories:[{name, color, spent}]}`

- [ ] **Step 1: Copy the router**

Copy the reference `backend/src/routes/summary.js`.

Two things that break silently if disturbed: `GET '/year'` must be registered **before** any parameterised route so it is never swallowed, and the `months` array must always contain all twelve entries in order even when empty — the Reports screen indexes it positionally.

- [ ] **Step 2: Restart and verify the month summary**

```bash
curl -s 'http://localhost:4000/summary?month=2026-09'
```

Expected, given Tasks 4–6 (income 50000, expense 250.50, savings 8000, Food limit 6000):
- `"income_total":50000`, `"expense_total":250.5`, `"savings_total":8000`
- `"balance":41749.5` — that is `50000 - 250.5 - 8000`
- 6 entries in `categories`; Food has `"spent":250.5`, `"limit":6000`, `"over":false`, `"pct":4`
- every other category has `"spent":0`, `"limit":0`, `"pct":0`, `"over":false`

All numbers, no quoted strings.

- [ ] **Step 3: Verify the overspend flag actually trips**

```bash
FOOD=$(curl -s http://localhost:4000/categories | tr ',' '\n' | grep -B2 Food | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1)
curl -s -X POST http://localhost:4000/expenses -H 'Content-Type: application/json' \
  -d "{\"amount\":7000,\"category_id\":\"$FOOD\",\"date\":\"2026-09-06\",\"note\":\"overspend test\"}"
curl -s 'http://localhost:4000/summary?month=2026-09' | tr '{' '\n' | grep Food
```

Expected: Food now `"spent":7250.5`, `"limit":6000`, `"over":true`, `"pct":121`.

Then confirm an unbudgeted category is never flagged: any category with `"limit":0` must still show `"over":false` and `"pct":0`, never a division-by-zero `Infinity` or `NaN`.

- [ ] **Step 4: Verify the year summary**

```bash
curl -s 'http://localhost:4000/summary/year?year=2026' | head -c 400
```

Expected: `months` has exactly 12 entries running `2026-01` through `2026-12`; September carries the totals and every other month is `{"income":0,"expense":0,"savings":0}`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/summary.js
git commit -m "feat: add month and year summary aggregation"
```

The backend is now complete. Every remaining task is app-side.

---

## Task 8: App scaffold

**Files:**
- Create: `app/` via `create-expo-app`, then `app/App.js`, `app/app.json`, `app/babel.config.js`, `app/.env.example`, `app/.env`, `app/src/api.js`, `app/src/theme.js`

**Interfaces:**
- Consumes: the running backend.
- Produces:
  - `api.js` → `apiGet(path)`, `apiPost(path, body)`, `apiPut(path, body)`, `apiDelete(path)`. Non-2xx throws `Error(body.error)`; a network failure throws an Error naming `EXPO_PUBLIC_API_URL` and the same-wifi requirement. 204 returns `null`.
  - `theme.js` → `colors` (bg, card, text, muted, border, expense, income, savings, danger, primary), `spacing` (xs 4, sm 8, md 12, lg 16, xl 24), `CURRENCY` (`₹`), `money(n)` — `en-IN` grouping, two decimals, negatives as `-₹1,234.50`.

- [ ] **Step 1: Scaffold with the current SDK**

```bash
cd /Users/harshit/Documents/project/expense
npx create-expo-app@latest app --template blank
```

**Do not copy the reference `app/package.json`.** It pins SDK 51 and Expo Go only runs the current SDK.

- [ ] **Step 2: Install the seven remaining dependencies**

```bash
cd app
npx expo install @react-navigation/native @react-navigation/bottom-tabs \
  react-native-screens react-native-safe-area-context \
  @react-native-community/datetimepicker
```

`expo install` picks versions matching the installed SDK. Confirm `app/package.json` now lists exactly the eight locked dependencies and nothing more.

- [ ] **Step 3: Copy the source files**

Copy from the reference `app/`: `App.js`, `app.json`, `babel.config.js`, `.env.example`, `src/api.js`, `src/theme.js`. Then `cp app/.env.example app/.env`.

`App.js` imports the five screens as `./src/screens/HomeScreen`, `./src/screens/AddScreen`, `./src/screens/RecordsScreen`, `./src/screens/ReportsScreen`, `./src/screens/BudgetsScreen`. Those files do not exist yet — the app will not bundle until Task 10. That is expected; finish Step 4 first.

- [ ] **Step 4: Point the app at the backend**

```bash
ipconfig getifaddr en0 || ipconfig getifaddr en1
```

Put the result in `app/.env` as `EXPO_PUBLIC_API_URL=http://<that-ip>:4000`. **Not `localhost`** — on the phone, `localhost` is the phone.

- [ ] **Step 5: Verify the phone can reach the backend**

From the phone's browser, open `http://<that-ip>:4000/health`. Expected: `{"ok":true}`.

Do this before writing any screen. If it fails, no screen will ever load data, and debugging it through the app is far harder than through the browser. Check both devices are on the same wifi, and accept the macOS firewall prompt if one appears.

- [ ] **Step 6: Commit**

```bash
git add app/package.json app/app.json app/babel.config.js app/.env.example app/App.js app/src/api.js app/src/theme.js
git commit -m "feat: scaffold Expo app with API client and theme"
```

---

## Task 9: Shared components

**Files:**
- Create: `app/src/components/` — `Card.js`, `MonthPicker.js`, `AmountInput.js`, `CategoryChips.js`, `BudgetBar.js`, `EmptyState.js`, `ErrorState.js`, `Screen.js`

**Interfaces:**
- Produces (every screen depends on these exact prop names):

```
Card({ children, style })
MonthPicker({ month, onChange })                       month is 'YYYY-MM'; string math only
AmountInput({ value, onChangeText, autoFocus })        decimal-pad, ₹ prefix, one dot max
CategoryChips({ categories, selectedId, onSelect, onAddNew })   last chip is always '+ Add new'
BudgetBar({ name, color, spent, limit, over, pct })    no track when limit is 0
EmptyState({ message })
ErrorState({ message, onRetry })
Screen({ children, loading, error, onRetry, refreshing, onRefresh })
```

- [ ] **Step 1: Copy all eight components**

Copy the whole reference `app/src/components/` directory to `app/src/components/`.

`Screen.js` is the shell every screen renders inside, and it is what keeps the three states distinct: spinner while `loading`, `ErrorState` when `error` is set, otherwise a `ScrollView` with a `RefreshControl`. The spec is explicit that an error must never look like "no data" — that is why `EmptyState` and `ErrorState` are separate components and not one.

`BudgetBar` clamps its fill to 100% width, so a 300%-over category renders a full bar rather than one overflowing the screen, and switches fill and amount to `colors.danger` when `over`.

- [ ] **Step 2: Verify they compile**

```bash
cd app && npx expo start --clear
```

The bundle still fails on the missing screens — that is expected until Task 10. What must **not** appear is any error naming a file inside `components/`. If one does, fix it now; every screen depends on these.

- [ ] **Step 3: Commit**

```bash
git add app/src/components
git commit -m "feat: add shared UI components"
```

---

## Task 10: Home screen

**Files:**
- Create: `app/src/screens/HomeScreen.js`
- Create (stubs): `AddScreen.js`, `RecordsScreen.js`, `ReportsScreen.js`, `BudgetsScreen.js`

**Interfaces:**
- Consumes: `GET /summary?month=`, `Screen`, `MonthPicker`, `BudgetBar`, `Card`, `money`.

- [ ] **Step 1: Copy HomeScreen and stub the other four**

Copy the reference `app/src/screens/HomeScreen.js`. Then create four temporary stubs so the bundle resolves:

```javascript
import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../theme';

export default function AddScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.muted }}>Add</Text>
    </View>
  );
}
```

Repeat for `RecordsScreen`, `ReportsScreen` and `BudgetsScreen`, changing the function name and the label. Tasks 11–14 replace each.

- [ ] **Step 2: Launch the app**

```bash
cd app && npx expo start
```

Scan the QR with Expo Go.

- [ ] **Step 3: Verify Home against known data**

Expected on the Home tab, with the month set to September 2026:
- five tabs at the bottom: Home, Add, Records, Reports, Budgets
- Income `₹50,000.00`, Spent `₹7,250.50`, Saved `₹8,000.00`, Balance left `₹34,749.50`
- a Food budget bar reading `₹7,250.50 / ₹6,000.00`, rendered in red because it is over
- the other five categories listed with `₹0.00` and no bar

Then check the three states are distinguishable: pull to refresh (spinner), stop the backend and pull again (an error message with a Retry button, **not** an empty list), restart the backend and hit Retry (data returns).

- [ ] **Step 4: Commit**

```bash
git add app/src/screens
git commit -m "feat: add Home screen with monthly totals and budget bars"
```

---

## Task 11: Add screen

**Files:**
- Modify: `app/src/screens/AddScreen.js` (replacing the stub)

**Interfaces:**
- Consumes: `POST /expenses`, `POST /income`, `POST /savings`, `GET /categories`, `POST /categories`, `CategoryChips`, `AmountInput`.

- [ ] **Step 1: Copy the real AddScreen**

Copy the reference `app/src/screens/AddScreen.js` over the stub.

The date is stored as `YYYY-MM-DD` built from **local** date parts. Using `toISOString()` here would shift the date backward for anyone east of UTC, filing an evening entry under the previous day.

- [ ] **Step 2: Verify each of the three types saves**

In the app, on the Add tab:
- Expense: amount `120`, category Transport, today's date, note `auto`. Save. Expected: an inline confirmation, and the form clears so another entry can be typed immediately.
- Income: amount `1000`, source `Freelance`. Save.
- Saving: amount `500`. Save.

Then open Home and confirm all three totals moved by those amounts.

- [ ] **Step 3: Verify the "+ Add new" category flow**

This is the feature the user asked for by name. On the Add tab in Expense mode, scroll the category chips to the end and tap **+ Add new**. Type `Books`, save.

Expected: the chip row now includes Books and it is **already selected**, so an amount can be entered without another tap.

Then tap **+ Add new** again and type `Books` a second time. Expected: an inline `Category already exists` message — not a crash, and not a silently swallowed failure.

- [ ] **Step 4: Verify validation**

Try saving with an empty amount. Expected: refused with a visible message. Try an expense with no category selected. Expected: refused. Confirm the save button is disabled while a save is in flight, so a double-tap cannot create two entries.

- [ ] **Step 5: Commit**

```bash
git add app/src/screens/AddScreen.js
git commit -m "feat: add entry screen with inline category creation"
```

---

## Task 12: Records screen

**Files:**
- Modify: `app/src/screens/RecordsScreen.js` (replacing the stub)

**Interfaces:**
- Consumes: `GET/PUT/DELETE` on all three transaction types, `GET /categories`, `MonthPicker`.

- [ ] **Step 1: Copy the real RecordsScreen**

Copy the reference `app/src/screens/RecordsScreen.js` over the stub.

It fetches the three lists for the month, tags each row with its type, merges, and sorts by `date desc` then `created_at desc`. That tiebreaker is why Task 4 and Task 5 return `created_at` — without it, same-day entries render grouped by type instead of newest-first.

Editing uses a `Modal`, and deleting is long-press plus an `Alert` confirmation. No stack navigator and no swipe library, per the locked dependency list.

- [ ] **Step 2: Verify the merged list and its ordering**

Open Records for September 2026. Expected: every entry from Tasks 4, 5 and 11 in one list, newest first, each colour-accented by type, expenses showing their category name.

Specifically check that the three entries added in Task 11 — all logged today — appear interleaved in creation order, not grouped as all-expenses-then-all-income-then-all-savings. That grouping is the exact symptom of a missing `created_at`.

- [ ] **Step 3: Verify the filters**

Switch the type filter through All / Expense / Income / Saving. Expected: each shows only that type, and the counts add up to All. Move the month back to August 2026. Expected: an explicit empty state, visually distinct from the error state seen in Task 10.

- [ ] **Step 4: Verify edit and delete**

Tap the `₹120` Transport expense. Change the amount to `130` and save. Expected: the row updates, and Home's Spent total rises by `₹10` accordingly.

Long-press the `overspend test` expense. Expected: a confirmation dialog; confirm it. The row disappears, and Home's Food bar returns to under-budget and to its normal colour.

- [ ] **Step 5: Verify the deleted-category case**

Delete the `Books` category from the Supabase Table Editor, then reopen Records. Expected: any expense that used it now reads **Uncategorized** — the entry itself is still there, with its amount intact. Nothing crashes.

- [ ] **Step 6: Commit**

```bash
git add app/src/screens/RecordsScreen.js
git commit -m "feat: add records screen with edit and delete"
```

---

## Task 13: Reports screen

**Files:**
- Modify: `app/src/screens/ReportsScreen.js` (replacing the stub)

**Interfaces:**
- Consumes: `GET /summary/year?year=`.

- [ ] **Step 1: Copy the real ReportsScreen**

Copy the reference `app/src/screens/ReportsScreen.js` over the stub.

The twelve month bars are proportional to the year's maximum monthly expense. When that maximum is 0 — an empty year — the width calculation must not divide by zero and produce `NaN`, which React Native rejects as a style value and turns into a red screen.

- [ ] **Step 2: Verify the populated year**

Open Reports for 2026. Expected: twelve month rows, September carrying the only bar, year totals matching Home's September figures, and a category breakdown ranked by spend with each category's percentage share.

- [ ] **Step 3: Verify the empty year**

Move the year selector to 2025. Expected: twelve zero rows and an empty-state message. **No red screen, no `NaN`** — this is the division-by-zero path.

- [ ] **Step 4: Commit**

```bash
git add app/src/screens/ReportsScreen.js
git commit -m "feat: add yearly reports screen"
```

---

## Task 14: Budgets screen

**Files:**
- Modify: `app/src/screens/BudgetsScreen.js` (replacing the stub)

**Interfaces:**
- Consumes: `GET /budgets?month=`, `PUT /budgets`, `POST/PUT/DELETE /categories`, `MonthPicker`.

- [ ] **Step 1: Copy the real BudgetsScreen**

Copy the reference `app/src/screens/BudgetsScreen.js` over the stub.

Limits save on blur and skip the request when the value is unchanged, so tabbing through eight fields does not fire eight writes.

- [ ] **Step 2: Verify limits save and drive Home**

Open Budgets for September 2026. Expected: all categories listed, Food showing `6000`.

Set Transport to `2000` and tap elsewhere to blur. Open Home. Expected: Transport now shows a bar reading against `₹2,000.00`.

- [ ] **Step 3: Verify limits are per-month**

Move to October 2026. Expected: all limits blank — budgets are per `(category, month)`, so September's do not leak forward.

- [ ] **Step 4: Verify category management**

Tap **+ Add new category** at the end of the list, add `Travel`. Expected: it appears in the list and, on the Add tab, in the chip row too.

Long-press `Travel` → Rename, change the colour, save. Expected: the new colour shows on both Budgets and Home.

Long-press `Travel` → Delete. Expected: a confirmation warning that its expenses become Uncategorized. Confirm, and it disappears from both screens.

- [ ] **Step 5: Commit**

```bash
git add app/src/screens/BudgetsScreen.js
git commit -m "feat: add budgets screen with category management"
```

---

## Task 15: End-to-end verification

**Files:**
- Modify: `README.md` (only if a documented command or output proves inaccurate)

- [ ] **Step 1: Run the README's curl cookbook verbatim**

Work through every command in the README's verification section against the running backend. Each documented expected output must match what actually comes back. Any mismatch is a README bug — fix the README, since the code has already been verified against the spec.

- [ ] **Step 2: Walk the six original purposes**

The app exists to serve the six lines from the user's notes. Confirm each is actually reachable:

1. *Track income and monthly/yearly expenses* — Home shows the month; Reports shows the year.
2. *Control unnecessary spending* — an over-budget category is visibly red on Home.
3. *Manage by budgeting* — per-category limits set on Budgets, per month.
4. *Saving from income* — savings entries log on Add and total on Home.
5. *Investment of savings* — deliberately not built; confirm nothing half-finished is showing.
6. *Keeping the record of all financial expenses* — Records lists everything, editable and deletable.

- [ ] **Step 3: Verify a cold start**

Stop both halves. Start only Expo. Expected: every screen shows an error state naming the backend, with a Retry button — never a blank screen that reads as "no data".

Start the backend, hit Retry. Expected: all five screens populate.

- [ ] **Step 4: Confirm no secret is tracked**

```bash
git status --porcelain --ignored | grep '\.env$'
git ls-files | grep '\.env$'
```

Expected: the first lists `backend/.env` and `app/.env` as **ignored**; the second returns **nothing** except the two `.env.example` files. If `backend/.env` is tracked, the Supabase `service_role` key is in git history and the key must be rotated in the Supabase dashboard.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: verify README against running system"
```

---

## Self-review

**Spec coverage** — every section of the spec maps to a task: five tables and seeding (T1), the two implementation rules on `num()` and month math (T2, verified T4/T7), all four CRUD resources (T3–T5), budgets (T6), both summary endpoints (T7), configuration and LAN reachability (T8), the loading/error/empty rule (T9, verified T10), all five screens (T10–T14), the "+ Add new" affordance in both places the user asked for (T11 Step 3, T14 Step 4), the deleted-category behaviour (T12 Step 5), the README (T1, verified T15), and the security note (T15 Step 4).

**Deliberate deviations from the drafted reference**, both fixed before commit:
- `App.js` imported screens by names that did not match their filenames — a blocker that prevented the bundle from building at all.
- `created_at` was consumed by the Records merge but never returned by the API. The spec's response shapes were updated to include it rather than dropping the tiebreaker, because merging three separately-ordered lists genuinely needs it.

**Known risk not yet resolvable:** the reference `app/package.json` targets Expo SDK 51, which will be behind the current SDK. Task 8 avoids it by scaffolding fresh and using `npx expo install`. If a copied version pin ever reaches `app/package.json`, Expo Go will refuse to open the project.
