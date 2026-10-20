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

### Email alerts for new tickets (optional)

1. Sign up free at resend.com (use the email address you want alerts sent to).
2. Create an API key under **API Keys**.
3. In Vercel → **Settings → Environment Variables**, add:
   - `RESEND_API_KEY`: the key from Resend
   - `NOTIFY_EMAIL`: where to send alerts (comma-separate several addresses)
   - `NOTIFY_FROM` (optional): e.g. `Gharieni Support <support@yourdomain.com>`, only once you've verified that domain in Resend. Without it, alerts come from onboarding@resend.dev and can only go to your Resend sign-up address.
4. Redeploy.

When you mark a ticket **Done**, the person who submitted it gets a "your ticket has been completed" email (only if they left their email). The dashboard shows whether it was sent. Note: this needs a verified domain in Resend plus `NOTIFY_FROM`; with the default onboarding@resend.dev sender, Resend only delivers to your own address.

Urgent tickets get a 🔴 URGENT subject line, and replying to the email replies to the person who submitted it (if they gave an email).

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
