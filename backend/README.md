# Deploying the EORM backend to Render

This backend is a plain Node/Express app (`src/server.js`) with no build step. It reads
`SUPABASE_URL`, `SUPABASE_SERVICE_KEY` and the optional `API_KEY` from the environment
and serves `GET /health` for uptime/health checks. `render.yaml` at the repo root
describes the Render Blueprint for it — Render reads that file automatically when you
connect the repo as a Blueprint.

## 1. Push the repo to GitHub

Render deploys from a Git repository, so the project needs to live on GitHub (or
GitLab/Bitbucket) first.

```bash
# from the repo root
gh repo create <your-username>/eorm --private --source=. --remote=origin
git push -u origin build-eorm
```

(If you already have a GitHub remote, just `git push`.) Do **not** commit `backend/.env`
or `backend/corporate-ca.pem` — both are gitignored on purpose; only `backend/.env.example`
should be tracked.

## 2. Connect the repo to Render

1. Go to the [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**.
2. Pick the GitHub repo you just pushed and the branch to deploy.
3. Render finds `render.yaml` at the repo root and proposes one web service,
   `eorm-backend`, rooted at `backend/`. Review and click **Apply**.

If you'd rather create the service by hand instead of via Blueprint: **New** → **Web
Service**, point it at the repo, set **Root Directory** to `backend`, **Build Command**
to `npm ci`, **Start Command** to `npm start`, and add a health check path of
`/health`. (`npm ci` installs exactly the tree pinned in `package-lock.json`;
`npm install` may silently resolve newer, untested dependency versions.)

## 3. Set the environment variables

`render.yaml` declares `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` and `API_KEY` with
`sync: false`, which means Render will **not** read them from any file in the repo — it
prompts for them once when you apply the Blueprint, and after that they live only in the
Render dashboard under the service's **Environment** tab. Copy the two Supabase values
out of your local `backend/.env` (or your Supabase project's API settings) and paste them
in there; see the API key section below for the third.

> **`SUPABASE_SERVICE_KEY` is a secret.** It is the `service_role` key, which bypasses
> Row Level Security entirely. Never commit it, never put it in `render.yaml`, never
> paste it into a PR or a chat log — only into Render's dashboard (or your local,
> gitignored `.env`). If it ever leaks, rotate it from the Supabase dashboard
> (Project Settings → API) immediately.

## 4. Free plan cold starts

`render.yaml` sets `plan: free`. Free Render web services spin down after about 15
minutes with no traffic. The **first** request after that idle period has to wake the
instance back up, which can take roughly 50 seconds — during that window the app will
likely show its error/retry card instead of data, because the request will time out or
the connection will simply hang. This is expected: **just retry** once the service has
had a few seconds to boot. Every request after the first one is fast again until the
service goes idle once more.

## 5. Finding the deployed URL

After the Blueprint deploy finishes, the service's page in the Render dashboard shows
its URL near the top, e.g. `https://eorm-backend.onrender.com`. That's what belongs in
the app's `EXPO_PUBLIC_API_URL` (in place of `http://<your-ip>:4000`) when testing
against the deployed backend from a phone instead of your Mac. Confirm it's alive with:

```bash
curl https://eorm-backend.onrender.com/health
```

which should return `{"ok":true}` (allow ~50s for the first request if the service had
gone idle).

## Protecting the API with a shared secret (`API_KEY`)

Once this backend is on the public internet, anyone who learns its URL can reach it. It
talks to Supabase with the `service_role` key, which bypasses Row Level Security
completely, so an unprotected deployment means a single `curl` can read, modify or delete
your entire financial history. `API_KEY` is the shared secret that prevents that.

**How it works.** If `API_KEY` is set to a non-empty value, every request must carry the
header `x-api-key` with exactly that value; anything else gets
`401 {"error":"Invalid or missing API key"}` and never reaches a route. The comparison is
timing-safe. `GET /health` is always exempt, because Render's health check cannot send
custom headers.

**If `API_KEY` is unset or empty there is NO protection at all** — the server accepts
every request from everyone, exactly as it did before this option existed. That mode
exists only to keep local development friction-free. It is not safe for a public
deployment. The startup log line says which mode the server is in (`API key
authentication ENABLED` / `DISABLED`), so you can confirm it at a glance in Render's log
stream; the key itself is never logged.

**Generate a good one** — don't invent it by hand:

```bash
openssl rand -hex 32
```

**Where to set it:**

1. **Render** — service page → **Environment** tab → the `API_KEY` variable (Render
   prompts for it when you apply the Blueprint, since it is declared `sync: false`).
   Paste the generated value and save; the service redeploys.
2. **The app** — open the app's **Settings** tab and enter the *identical* value. A
   mismatch of even one character means every request fails with a 401, which the app
   surfaces as an error rather than data.
3. **Locally (optional)** — `API_KEY=` in `backend/.env`. Leaving it blank there keeps
   local development unauthenticated.

Treat the key like a password: rotate it by generating a new one and updating both Render
and the app's Settings tab.

## The API key is not a substitute for protecting the `service_role` key

These are two different secrets and only one of them is ever allowed near the app.
`API_KEY` guards the API surface and is shared with the app by design. The Supabase
`service_role` key stays **server-side only** — it must never be shipped to the app,
never be committed, and never appear in `render.yaml` or a chat log. If it leaks, rotate
it from the Supabase dashboard (Project Settings → API) immediately; rotating `API_KEY`
does nothing to contain that.

## A note on security: CORS is not access control

`app.use(cors())` is wide open by design so the phone app can call the backend from
anywhere. **Restricting CORS would not protect anything.** CORS is a browser-enforced
policy; it does nothing against `curl`, Postman, or another server, and React Native's
own network layer doesn't enforce CORS at all, so tightening it wouldn't even affect the
app it's meant to protect. `API_KEY` — not CORS — is what keeps this deployment private.

There is still no login and no per-user separation of data: `API_KEY` is a single shared
secret for a single-user personal app, so anyone holding it has full read/write access to
every expense, income, savings and budget row. Per-user auth (Supabase auth + RLS scoped
per user) remains a separate piece of work.
