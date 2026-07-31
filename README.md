# Her Personal Stylist — Phase 1

A private, password-protected app being built in phases. This phase covers:
login, session handling, and a working deployment on a real HTTPS link.
Everything else (outfit generator, makeup, skincare, wardrobe, archives)
comes in later phases.

## What's actually here right now

- `public/index.html` — the login screen (intro line → password form)
- `public/dashboard.html` — placeholder home screen, protected by login
- `public/css/style.css` — shared styling
- `public/js/guard.js` — redirects to login if the session isn't valid
- `api/login.js` — checks the password server-side, sets a signed session cookie
- `api/logout.js` — clears the session cookie
- `api/session-check.js` — used by protected pages to verify login status
- `api/_session.js` — shared helper for signing/verifying session tokens

No database yet, no Claude integration yet — those arrive in later phases
without needing to touch this login system.

## 1. Push this to GitHub

If you haven't already:

```bash
cd her-personal-stylist
git init
git add .
git commit -m "Phase 1: login and deployment skeleton"
```

Then create a new empty repository on GitHub (no README/license — you already
have these), and:

```bash
git remote add origin https://github.com/<your-username>/her-personal-stylist.git
git branch -M main
git push -u origin main
```

## 2. Create a Vercel account

1. Go to https://vercel.com and choose **Sign Up**.
2. Pick **Continue with GitHub** — this is the easiest path since it lets
   Vercel deploy straight from your repo with no extra setup.
3. Authorize Vercel to access your GitHub account (you can limit it to just
   this one repository if you'd rather not grant access to everything).

## 3. Import the project

1. From the Vercel dashboard, click **Add New → Project**.
2. Select the `her-personal-stylist` repository.
3. Vercel will auto-detect it as a plain project (no framework) — leave the
   build settings as default, you don't need to change anything.
4. **Before clicking Deploy**, add the environment variables (next step).

## 4. Set environment variables

In the project's **Settings → Environment Variables** page, add:

| Key | Value |
|---|---|
| `SITE_PASSWORD` | Divya |
| `SESSION_SECRET` | a long random string — generate one with `openssl rand -hex 32` in your terminal, or ask me and I'll explain another way to generate it |

Do this for the **Production** environment (and Preview, if you want branch
previews to also require login — recommended).

Then click **Deploy**.

## 5. Test it

Once deployed, Vercel gives you a URL like `her-personal-stylist.vercel.app`.

- Visit it → you should see the intro line, then the login card.
- Wrong password → clear error message, no crash.
- Correct password (`Divya`, or whatever you set) → redirects to the
  dashboard placeholder.
- Refresh the dashboard page → should stay logged in (cookie persists).
- Click **Log out** → should return to login, and reloading the dashboard
  URL directly should now bounce you back to login too.
- Try 6 wrong passwords in a row quickly → should get a "too many attempts"
  message instead of letting you keep guessing.

## Common errors and fixes

- **"Something went wrong" on login** — usually means `SITE_PASSWORD` or
  `SESSION_SECRET` wasn't set in Vercel's environment variables, or you
  deployed before adding them (redeploy after adding).
- **Stuck on the intro line forever** — check the browser console for a
  JS error; most likely a typo in a file path.
- **Login works but dashboard immediately bounces you back to login** —
  the cookie isn't being read; make sure you're testing on the actual
  `https://` Vercel URL, not opening `index.html` directly as a local file
  (cookies and `/api` routes only work when served properly).

## What's next (later phases)

- Home dashboard: real greeting, weather, quick occasion buttons
- Outfit generator (Claude-powered, structured JSON output)
- Makeup companion, skincare companion
- Digital wardrobe with image upload
- Archives
- Moving from the JSON file to a real database once there's enough data
  to justify it

## Security notes for this phase

- The password is never stored in the HTML/JS — it's checked server-side
  in `api/login.js` against an environment variable.
- The session cookie is `HttpOnly` (invisible to page JavaScript) and
  cryptographically signed, so it can't be forged without knowing
  `SESSION_SECRET`.
- Login attempts are rate-limited (5 per 10 minutes per IP) to slow down
  guessing. This resets on server cold starts — a known limitation of the
  simplest possible version, fine for this use case, upgradeable later.
- `SESSION_SECRET` and `SITE_PASSWORD` live only in Vercel's environment
  variable settings and your local `.env` (which is git-ignored) — never
  in a committed file.
