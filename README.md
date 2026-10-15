# Gharieni Support

A small ticket app for website fixes across **Gharieni, GharieniGroup, Bentlon and Cobalt**.

- `/`: public form: pick website(s), priority (High = immediate fix, Medium, Low), describe the issue, optional page link / name / email.
- `/admin`: password-protected dashboard: see all tickets, filter by status / site / priority, search, mark **Done**, **Start** (in progress), **Reopen**, change priority, add private notes, delete.

Built with Next.js; tickets are stored in Upstash Redis (free tier is plenty).

## Deploy on Vercel

1. **Import the repo**: vercel.com → Add New → Project → pick `GharieniSup` → Deploy (defaults are fine).
2. **Add storage**: in the project, go to **Storage** → **Create Database** → **Upstash for Redis** (free) → connect it to this project. This adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically.
3. **Set your password**: **Settings → Environment Variables** → add `ADMIN_PASSWORD` (whatever you want to log in with). Optionally add `SESSION_SECRET` (any long random string).
4. **Redeploy**: Deployments → ⋯ → Redeploy, so the new variables are picked up.

Then share the site's main URL with your team and log in yourself at `/admin`.

## Local development

```bash
npm install
cp .env.example .env.local   # set ADMIN_PASSWORD
npm run dev
```

Without Redis variables it keeps tickets in memory (local only; they reset on restart).

## Changing the list of websites

Edit `SITES` in `lib/constants.js`.
