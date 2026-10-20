# Gharieni Support

A small ticket app for website fixes across **Gharieni, GharieniGroup, Bentlon, Cobalt and MetaWell**.

- `/`: public form: name (required), pick website(s), priority (High = immediate fix, Medium, Low), describe the issue, optional page link / email, and optional screenshots, photos or files (drag & drop, click, or paste a screenshot with Ctrl+V; up to 5 files, 4 MB each).
- `/admin`: password-protected dashboard: see all tickets, filter by status / site / priority, search, mark **Done**, **Start** (in progress), **Reopen**, change priority, add private notes, delete.

Built with Next.js; tickets are stored in Upstash Redis and attachments in Vercel Blob (free tiers are plenty).

## Deploy on Vercel

1. **Import the repo**: vercel.com → Add New → Project → pick `GharieniSup` → Deploy (defaults are fine).
2. **Add storage**: in the project, go to **Storage** → **Create Database** → **Upstash for Redis** (free) → connect it to this project. This adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically.
3. **Add file storage**: **Storage** → **Create Database** → **Blob** → connect it to this project. This adds `BLOB_READ_WRITE_TOKEN`. (Until it's connected, the upload box is simply hidden.)
4. **Set your password**: **Settings → Environment Variables** → add `ADMIN_PASSWORD` (whatever you want to log in with). Optionally add `SESSION_SECRET` (any long random string).
5. **Redeploy**: Deployments → ⋯ → Redeploy, so the new variables are picked up.

### Email notifications (optional)

The app emails **you** when a ticket comes in, and emails **the submitter** (if they left an email) when you mark it Done.

**Easiest: send from your Gmail** (free, ~500 emails/day, no domain needed)

1. Turn on 2-Step Verification for your Google account (myaccount.google.com → Security).
2. Go to myaccount.google.com/apppasswords, create an app password named "Gharieni Support", and copy the 16-letter code.
3. In Vercel → **Settings → Environment Variables**, add:
   - `GMAIL_USER`: your Gmail address
   - `GMAIL_APP_PASSWORD`: the 16-letter code
   - `NOTIFY_EMAIL` (optional): where new-ticket alerts go (comma-separate several). Defaults to `GMAIL_USER`.
4. Redeploy.

**Alternative: Resend** (needs your own verified domain to email people other than yourself): set `RESEND_API_KEY`, `NOTIFY_EMAIL` and `NOTIFY_FROM`. If Gmail settings are present, Gmail is used instead.

Urgent tickets get a 🔴 URGENT subject line. Replying to an alert replies to the submitter; replying to a completion email replies to you. The dashboard shows whether each completion email was sent.

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

Note: uploaded files get long random URLs that only appear in your admin dashboard, but anyone holding a link can open that file. Deleting a ticket also deletes its files.
