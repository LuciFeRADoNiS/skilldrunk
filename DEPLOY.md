# Deploying skilldrunk

End-to-end from local code to a live `*.vercel.app` URL, then swapping in
`skilldrunk.com` once you own it.

## 1. Create a Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New
   project**.
2. Pick a region close to your users. Note the DB password.
3. Once it's ready, go to **Project Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` secret → `SUPABASE_SERVICE_ROLE_KEY` (never ship to client)

## 2. Run the schema migration

Open **SQL Editor → New query**, paste the entire contents of
[`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql),
and run it. You should see every table listed in **Table Editor**.

## 3. Enable OAuth providers

**Authentication → Providers**:

- **GitHub** — create a GitHub OAuth App at
  [github.com/settings/developers](https://github.com/settings/developers).
  - Homepage URL: `https://your-site.vercel.app`
  - Callback URL: `https://<project-ref>.supabase.co/auth/v1/callback`
    (shown in the Supabase provider settings)
  - Paste the client ID + secret into Supabase.
- **Google** — same flow at
  [console.cloud.google.com](https://console.cloud.google.com). Use the same
  Supabase callback URL.

In **Authentication → URL Configuration**, set **Site URL** to
`https://your-site.vercel.app` and add the same to **Redirect URLs**.

## 4. Push the repo to GitHub

```bash
git add .
git commit -m "Initial skilldrunk scaffold"
gh repo create skilldrunk --private --source=. --remote=origin --push
```

(Or create the repo via the GitHub UI and `git push -u origin main`.)

## 5. Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) → import your GitHub repo.
2. Framework is auto-detected as Next.js.
3. Under **Environment Variables**, paste:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` → your `*.vercel.app` domain (update after step 7)
4. Click **Deploy**. First build takes ~2 minutes.
5. Visit the resulting `*.vercel.app` URL.

## 6. Seed the database

Locally, set the same env vars in `.env.local`, then:

```bash
pnpm tsx scripts/seed.ts
```

This imports ~17 Claude Skills + ~490 MCP servers into your `skills` table.
Refresh `/feed` on your deploy — they should appear.

## 7. Buy the domain via Vercel (optional)

Once you're happy:

1. Vercel dashboard → **Domains → Buy a Domain**.
2. Search for `skilldrunk.com` (or any TLD you like).
3. Buy → Vercel handles DNS + SSL automatically.
4. Add it to your project: **Project → Settings → Domains → Add**.
5. Update `NEXT_PUBLIC_SITE_URL` env var to `https://skilldrunk.com`,
   redeploy.
6. Update the **Site URL** in Supabase Auth settings to match.
7. Update the OAuth app Homepage URLs on GitHub and Google.

## 8. Production readiness checklist

- [ ] Supabase RLS policies enabled (migration does this)
- [ ] OAuth providers enabled + tested
- [ ] `NEXT_PUBLIC_SITE_URL` points to production domain
- [ ] Seed data loaded
- [ ] Monitor logs: Vercel → Deployments → Function Logs
- [ ] Supabase → Database → Backups turned on (free tier: daily)

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Vote/comment returns 401 | Sign in first, check OAuth redirect URLs match |
| Seed fails with 403 | Set `GITHUB_TOKEN` to raise GitHub rate limit |
| "You must be signed in" on `/new` | OAuth callback not wired — verify Site URL in Supabase |
| Build fails on Vercel | Check `NEXT_PUBLIC_*` env vars are set on the right environments (Production + Preview) |
