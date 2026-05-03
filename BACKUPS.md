# Backups & restore

## Policy

| Item | Target |
|---|---|
| Frequency | **Daily full backup minimum.** Hourly preferred. |
| Point-in-time recovery (PITR) | **Enabled** if your provider supports it (RDS, Neon, Supabase, Crunchy, Replit DB-as-a-service, etc.). PITR replays the WAL, giving you per-second granularity. |
| Retention | **30 days** of daily snapshots. **7 days** of PITR window. |
| Off-region copy | At least the last 7 daily snapshots in a different region. |
| Encryption | At rest (provider-managed) AND in transit (TLS). |
| Restore drill | **Quarterly** — restore to a throwaway DB and verify the app boots. |

## Configure on common providers

### Neon

- Project Settings → Backups → enable "automatic backups", retention 30 days.
- PITR: on by default (7-day window on the Free plan; longer on paid).

### Supabase

- Project Settings → Database → "Daily backups" enabled.
- Pro plan: PITR up to 7 days. Enterprise: longer.

### AWS RDS

- Modify instance → "Backup retention period: 30". Multi-AZ recommended.
- Snapshot copy to a second region via cron / Lambda.

### Replit Deployments DB

- Replit-managed PostgreSQL takes daily backups automatically; check the
  Database tab for retention details and download options.

### Self-hosted Postgres

```bash
# Daily logical backup, kept for 30 days
0 3 * * * pg_dump -Fc -U postgres luxe \
  | gzip > /backups/luxe-$(date +\%F).dump.gz \
  && find /backups -name 'luxe-*.dump.gz' -mtime +30 -delete

# Off-site copy (S3 example)
0 4 * * * aws s3 cp /backups/luxe-$(date +\%F).dump.gz s3://luxe-backups/
```

For PITR on self-hosted: enable WAL archiving (`archive_mode = on`,
`archive_command = ...`) and retain WAL segments long enough.

## Restore drill — run quarterly

1. Provision an EMPTY Postgres database, separate from prod.
2. Restore the latest production snapshot:
   ```bash
   pg_restore -d $DRILL_DATABASE_URL --clean --no-owner latest.dump
   ```
3. Point a backend instance at `$DRILL_DATABASE_URL`:
   ```
   DATABASE_URL=$DRILL_DATABASE_URL LAUNCH_MODE=staging npm start
   ```
4. Verify:
   - [ ] `/health` 200
   - [ ] `/ready` 200
   - [ ] `npx prisma migrate status` reports "Database schema is up to date"
   - [ ] An admin can log in
   - [ ] An old order opens correctly
   - [ ] `npm test` passes against the restored DB
5. Document the drill: date, snapshot ID, time-to-restore, anomalies.
6. Tear down the drill DB.

If you have NEVER successfully restored a backup, you do NOT have backups —
you have unverified files.

## Migration procedure (with backup)

1. **Take a fresh snapshot** before applying.
2. `npx prisma migrate deploy` (CI does this on deploy).
3. Verify `/health`, `/ready`, smoke order.
4. If the migration was risky (large table rewrite, data backfill), keep an
   eye on slow-query and CPU graphs for the next hour.

## Migration rollback limitations

Prisma migrations are forward-only. There is NO `down.sql`. See
`ROLLBACK.md → "Procedure — bad migration"` for the forward-fix strategy.

## What's in backup vs what's not

| In backup | NOT in backup |
|---|---|
| Postgres data (orders, users, products, audit logs, etc.) | App container images |
| Prisma migration history | Env vars / secrets |
| | Object storage uploads (configure separately) |
| | Sentry events |
| | Provider data (PayMongo / Maya / Xendit dashboards) |

Keep your env-vars / secrets in your password manager (1Password, Doppler,
AWS Secrets Manager) — they are NOT in the database backup.
