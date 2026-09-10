# EORM — Expenses of Resource Management

Design spec — 2026-09-10

## Purpose

A personal expense tracker for a single user (no auth, no multi-user support). It exists to serve six goals, taken from the original handwritten notes:

1. Track income and monthly/yearly expenses
2. Control unnecessary spending
3. Manage by budgeting
4. Save from income
5. Investment of savings — **deferred, not in v1**
6. Keep a record of all financial transactions

## Scope

**In:** income, expense and savings entries; per-category monthly budgets with overspend flags; custom categories; monthly and yearly reports; a full searchable record with edit and delete.

**Out:** authentication, multi-user, investments, recurring transactions, receipt photos, offline mode, currency conversion, push notifications, CSV export, charts requiring a charting library.

## Stack

- **App:** Expo (React Native), plain JavaScript, React Navigation bottom tabs. No TypeScript, no state library — `useState`/`useEffect` with a manual refresh on focus.
- **Backend:** Node + Express, plain JavaScript (ESM), `@supabase/supabase-js`.
- **Database:** Supabase Postgres.

The app never talks to Supabase directly; every read and write goes through the Node API. The backend runs on the user's Mac and the phone reaches it over the local wifi network.

**Dependencies, in full.** Backend: `express`, `cors`, `dotenv`, `@supabase/supabase-js`. App: `expo`, `react`, `react-native`, `@react-navigation/native`, `@react-navigation/bottom-tabs`, `react-native-screens`, `react-native-safe-area-context`, `@react-native-community/datetimepicker`. Nothing else — no charting, gesture, icon-set or state-management packages. Anything beyond this list is a change to the design, not an implementation detail.

## Architecture

```
Expo app (phone)  ──HTTP/JSON──>  Node/Express (Mac, :4000)  ──supabase-js──>  Supabase Postgres
```

Each layer has one job. The app renders and collects input. The backend owns validation, aggregation and the shape of every response. Postgres owns storage and constraints. Aggregation lives in Node rather than in SQL views or RPCs — at personal-scale data volume the cost is irrelevant, and it keeps all logic in one readable place instead of split across two languages.

## Database

Five tables. `schema.sql` at the repo root is pasted into the Supabase SQL editor once.

| Table | Columns |
|---|---|
| `categories` | `id` uuid pk, `name` text unique not null, `color` text not null, `created_at` timestamptz |
| `expenses` | `id` uuid pk, `amount` numeric(12,2) > 0, `category_id` uuid → categories (on delete set null), `date` date, `note` text, `created_at` timestamptz |
| `income` | `id` uuid pk, `amount` numeric(12,2) > 0, `source` text, `date` date, `note` text, `created_at` timestamptz |
| `savings` | `id` uuid pk, `amount` numeric(12,2) > 0, `date` date, `note` text, `created_at` timestamptz |
| `budgets` | `id` uuid pk, `category_id` uuid → categories (on delete cascade), `month` text `'YYYY-MM'`, `limit_amount` numeric(12,2) >= 0, unique(`category_id`, `month`) |

Indexes on `expenses.date`, `income.date`, `savings.date`, `budgets.month`.

**Seeded categories:** Food, Transport, Shopping, Health, Rent, Entertainment — each with a fixed hex color. The user adds more from the app; these six are just the starting set, not a fixed list.

**Deleting a category** sets `expenses.category_id` to null (those expenses render as "Uncategorized" and are never silently lost) and cascade-deletes that category's budget rows.

**Row-level security is enabled on every table with no policies defined.** The service-role key bypasses RLS, so the backend is unaffected; this closes the door on the anon key reading anything if the project URL ever leaks.

## API

Base URL `http://<LAN_IP>:4000`. JSON in, JSON out. CORS open — the API is only reachable on the local network.

All errors return `{ "error": "<message>" }` with status 400 (validation), 404 (missing id) or 500 (upstream failure). Success bodies are the resource itself; deletes return 204 with no body.

### Resources

```
GET    /categories                 -> [{id, name, color}]                 (ordered by name)
POST   /categories                 {name, color?}              -> 201
PUT    /categories/:id             {name?, color?}             -> 200
DELETE /categories/:id                                         -> 204

GET    /expenses?month=YYYY-MM     -> [{id, amount, category_id, category_name, category_color, date, note, created_at}]
POST   /expenses                   {amount, category_id, date, note?}     -> 201
PUT    /expenses/:id               {amount?, category_id?, date?, note?}  -> 200
DELETE /expenses/:id                                           -> 204

GET    /income?month=YYYY-MM       -> [{id, amount, source, date, note, created_at}]
POST   /income                     {amount, source?, date, note?}         -> 201
PUT    /income/:id                                             -> 200
DELETE /income/:id                                             -> 204

GET    /savings?month=YYYY-MM      -> [{id, amount, date, note, created_at}]
POST   /savings                    {amount, date, note?}                  -> 201
PUT    /savings/:id                                            -> 200
DELETE /savings/:id                                            -> 204
```

The `month` query parameter is optional on every list endpoint; omitting it returns all rows. Lists are ordered `date desc, created_at desc`.

`created_at` is returned on all three transaction types because the Records screen merges the three lists client-side and needs it to interleave same-day entries correctly. Without it, entries logged on the same day render grouped by type rather than newest-first.

### Budgets

```
GET /budgets?month=YYYY-MM
-> [{category_id, category_name, category_color, limit_amount}]
```

Returns a row for **every** category, with `limit_amount: 0` where no budget has been set for that month. The app therefore never has to merge two lists.

```
PUT /budgets   {month, category_id, limit_amount}  -> 200
```

Upserts on the `(category_id, month)` unique constraint.

### Summary

```
GET /summary?month=YYYY-MM
```

```json
{
  "month": "2026-09",
  "income_total": 50000,
  "expense_total": 32000,
  "savings_total": 8000,
  "balance": 10000,
  "categories": [
    { "category_id": "…", "name": "Food", "color": "#F97316",
      "spent": 6200, "limit": 5000, "over": true, "pct": 124 }
  ]
}
```

`balance = income_total - expense_total - savings_total`. It can be negative and the app must render that correctly.

Every category appears in `categories`, including ones with zero spend, so the Home screen shows the full picture. `pct` is `round(spent / limit * 100)`, and is `0` when `limit` is 0. `over` is `limit > 0 && spent > limit` — a category with no budget set is never flagged as over.

```
GET /summary/year?year=YYYY
```

```json
{
  "year": 2026,
  "months": [{ "month": "2026-01", "income": 0, "expense": 0, "savings": 0 }],
  "income_total": 0, "expense_total": 0, "savings_total": 0,
  "categories": [{ "name": "Food", "color": "#F97316", "spent": 0 }]
}
```

`months` always contains all twelve entries in order, zero-filled.

### Two rules the implementation must follow

1. **`supabase-js` returns `numeric` columns as strings.** Every amount is passed through `Number()` before it leaves the backend. The app receives numbers, never strings — otherwise `+` silently concatenates and totals are garbage.
2. **Month filtering is string math, never `Date` arithmetic.** `month=2026-09` becomes `date >= '2026-09-01' and date < '2026-10-01'`, with the upper bound computed by incrementing the year/month integers. Using `new Date()` here introduces timezone drift that misfiles entries near month boundaries.

## App

Five screens in a bottom tab bar. Currency symbol is `₹`, defined once as a constant in `theme.js`.

**1. Home** — the current month at a glance. Four totals (income, spent, saved, balance left), then a per-category budget bar for each category: spent vs limit, filled proportionally, red when over. Categories with no budget set show spend only, no bar. A month selector at the top moves between months. One `GET /summary` call feeds the whole screen.

**2. Add** — a segmented toggle across the top: Expense / Income / Saving. Amount field (numeric keypad, focused on open), date (defaults to today, tapping it opens the native picker via `@react-native-community/datetimepicker`), note. Expense mode additionally shows a horizontal row of category chips; Income mode shows a source field. The chip row ends with a **"+ Add new"** chip that opens an inline name input, creates the category via `POST /categories`, and selects it immediately. On save the form resets to blank and the screen confirms inline, so several entries can be logged in a row without leaving.

**3. Records** — every transaction in one list, newest first. Filters for type (All / Expense / Income / Saving) and month. Each row shows amount, category or source, date and note, color-coded by type. Expenses whose category was deleted render as "Uncategorized". Tap a row to edit it in a modal; long-press to delete after an `Alert` confirmation. Editing uses a modal rather than a pushed screen so the app needs only a tab navigator — no stack navigator, no gesture-handler swipe rows.

**4. Reports** — monthly totals for the selected year as twelve bars, plus year totals and a category breakdown ranked by spend with each category's share. Built from `GET /summary/year` with plain views — no charting library.

**5. Budgets** — every category listed with its monthly limit in an editable field, saved on blur via `PUT /budgets`. Long-press a category to rename, recolor or delete it. The list ends with a **"+ Add new category"** row that creates a custom category inline. A month selector at the top means limits can differ month to month.

### Loading and errors

Every screen fetches on focus and exposes pull-to-refresh. While loading, a spinner. On failure, an inline message with the API's `error` text and a Retry button — never a silent empty state, which would read as "no data" when it actually means "the backend is down". Empty states are explicit and distinct from errors.

## File layout

```
expense/
├── README.md
├── schema.sql
├── .gitignore
├── backend/
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── server.js          Express app, CORS, error handler, listen
│       ├── supabase.js        client from env
│       ├── month.js           month range helpers, numeric coercion
│       └── routes/
│           ├── categories.js
│           ├── expenses.js
│           ├── income.js
│           ├── savings.js
│           ├── budgets.js
│           └── summary.js
└── app/
    ├── package.json
    ├── app.json
    ├── .env.example
    ├── App.js                 navigation container + tabs
    └── src/
        ├── api.js             fetch wrapper, base URL from env, error unwrapping
        ├── theme.js           colors, spacing, ₹ constant, money formatter
        ├── components/        Card, BudgetBar, MonthPicker, AmountInput,
        │                      CategoryChips, EmptyState, ErrorState
        └── screens/           Home, Add, Records, Reports, Budgets
```

`expenses.js`, `income.js` and `savings.js` are near-identical CRUD routers. They stay as three explicit files rather than one generated factory: the total duplication is small, and each stays independently readable and editable.

## Configuration

**`backend/.env`**

```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
PORT=4000
```

**`app/.env`**

```
EXPO_PUBLIC_API_URL=http://192.168.1.x:4000
```

Expo exposes `EXPO_PUBLIC_*` variables to the client automatically. Both `.env` files are gitignored; `.env.example` files are committed.

## Verification

No test suite — this is a single-user personal app where the cost of a test harness exceeds its value. Verification is done by running the real thing: start the backend against the real Supabase project, exercise every endpoint with the curl commands listed in the README, then run the Expo app in a simulator and walk each screen — add an entry of each type, set a budget, trip the overspend flag, edit and delete a record, and check the monthly and yearly reports.

## What the user must provide

Documented in `README.md`:

1. A Supabase project — its URL and `service_role` key
2. Running `schema.sql` in the Supabase SQL editor
3. Expo Go installed on the phone
4. The Mac's LAN IP address (README shows the command)

## Security note

The `service_role` key bypasses all row-level security, and the API has no authentication. This is acceptable because the backend binds to the local network only. The port must never be forwarded to the internet or exposed through a tunnel.
