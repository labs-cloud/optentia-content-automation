# Database configuration

The canonical database connection for the app, local scripts, and the render worker is the
`DATABASE_URL` environment variable stored on the Vercel project
`labs-clouds-projects/optentia-content-automation`.

Use the Vercel project env as the source of truth:

```bash
vercel env pull .env.vercel.production.local --environment=production
```

Do not commit pulled env files or copy the URL into source. The connection points at the TiDB Cloud
MySQL gateway and may include an `ssl={"rejectUnauthorized":true}` query parameter. `server/db.ts`
normalizes that JSON SSL query into a `mysql2` pool option so the same URL works in the Vercel app,
one-off scripts, and off-Vercel workers.

If `DATABASE_URL` changes in Vercel, redeploy production before running scripts or workers against
that new value so all runtimes observe the same database.
