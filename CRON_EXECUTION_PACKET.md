# Cron Execution Packet — `expire-orders`

Operational steps to schedule the unpaid-order expirer. Owner: platform / DevOps owner. Backup: technical owner.

---

## 1. The job

| Field | Value |
|---|---|
| Command | `node backend/scripts/expire-orders.ts` |
| Working directory | repo root in your deploy image |
| Frequency | every **5 minutes** |
| Required env | `DATABASE_URL`, `NODE_ENV=production`, `LAUNCH_MODE=production` |
| Timeout | 60 s soft (job is fast; finishing within 5 s is normal) |
| Concurrency | safe — uses Postgres advisory lock `withAdvisoryLock('expire:orders')` |

### Success log pattern

```
cron.expire-orders lock acquired
cron.expire-orders complete  (count=N durationMs=…)
```

### Failure log pattern (any of)

```
cron.expire-orders lock not acquired   ← benign: another worker is running; exit 0
cron.expire-orders error               ← real failure
ECONNREFUSED / ETIMEDOUT               ← DB unreachable
```

If the second-or-third pattern appears, page on-call.

---

## 2. Platform examples

### 2.1 Render (Cron Job)

1. **Render dashboard → New → Cron Job**.
2. Repo + branch: same as your web service.
3. Schedule: `*/5 * * * *`.
4. Command: `node backend/scripts/expire-orders.ts`.
5. Environment: link to the same env group as the web service (`DATABASE_URL`, etc.).
6. Save → first run within 5 min.

### 2.2 Railway (Scheduled Job)

1. Railway → **New service → Scheduled job**.
2. Same repo + branch.
3. Cron expression: `*/5 * * * *`.
4. Start command: `node backend/scripts/expire-orders.ts`.
5. Inherit env from the project.

### 2.3 Fly.io (machine + cron container OR `fly machines run --schedule`)

```bash
fly machines run \
  --schedule "*/5 * * * *" \
  --env DATABASE_URL=$DATABASE_URL \
  registry.fly.io/<app>:<deploy> \
  node backend/scripts/expire-orders.ts
```

Or run a small `cron` container with the same image and a system crontab.

### 2.4 VPS (Linux crontab)

```cron
# /etc/cron.d/expire-orders
*/5 * * * * deploy cd /srv/app && /usr/bin/node backend/scripts/expire-orders.ts >> /var/log/expire-orders.log 2>&1
```

### 2.5 GitHub Actions (only if appropriate)

> Use only if your platform doesn't offer a scheduler. GH Actions has 5–15 min minimum granularity in practice and may run from a public runner — make sure secrets are scoped tightly.

```yaml
# .github/workflows/expire-orders.yml
on:
  schedule: [{ cron: "*/5 * * * *" }]
jobs:
  expire-orders:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm ci --workspace=backend
      - run: node backend/scripts/expire-orders.ts
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          NODE_ENV: production
          LAUNCH_MODE: production
```

---

## 3. Advisory lock — what to know

The job calls `withAdvisoryLock('expire:orders', ...)`. This means:

- Multiple workers can run the cron at the same time. Only one acquires the lock; the rest log `lock not acquired` and exit 0. **This is correct.**
- If the lock is held by a stuck process, subsequent runs wait briefly then exit. Restart the stuck worker.
- The lock is per-database, so dev and prod databases are isolated.

---

## 4. Stale-cron alert (required)

Configure in your monitoring tool: **page on-call if no `cron.expire-orders complete` log line appears for 15 minutes**.

UptimeRobot / BetterStack / Datadog all support log-pattern absence alerts. Alternatively, use a **heartbeat URL** (Healthchecks.io, BetterStack heartbeats) and `curl` it from the cron after success:

```bash
node backend/scripts/expire-orders.ts && curl -fsS -m 10 "$HEARTBEAT_URL" || true
```

The heartbeat service then alerts when the heartbeat is missed for >10 min.

---

## 5. Manual proof procedure

1. **Create a pending order** in admin (or place a real test order and abandon checkout).
   ```sql
   SELECT id, "orderNumber", status, "paymentStatus", "paymentExpiresAt"
   FROM "Order" WHERE "paymentStatus" = 'UNPAID' ORDER BY "createdAt" DESC LIMIT 5;
   ```
2. **Force expiry** by setting `paymentExpiresAt` to a past time on the test order:
   ```sql
   UPDATE "Order"
   SET "paymentExpiresAt" = now() - interval '1 hour'
   WHERE "orderNumber" = '<TEST_ORDER>';
   ```
3. **Wait one tick** (5 min) OR run the job once on demand.
4. **Verify expiration**:
   ```sql
   SELECT id, status, "paymentStatus", "stockRestoredAt"
   FROM "Order" WHERE "orderNumber" = '<TEST_ORDER>';
   -- expect status='EXPIRED', stockRestoredAt IS NOT NULL
   ```
5. **Verify stock returned** (compare to the variant stock you noted before):
   ```sql
   SELECT stock FROM "ProductVariant" WHERE id = $1;
   ```
6. **Verify no double-restore** by running the job again immediately:
   ```bash
   node backend/scripts/expire-orders.ts
   ```
   The order is already EXPIRED with `stockRestoredAt`; the job must not restore stock again. Confirm the variant stock is unchanged from step 5.

Save the steps + outputs (redacted) as `04-cron-manual-proof.txt`.

---

## 6. Evidence filenames

| File | What | Classification |
|---|---|---|
| `04-cron-schedule.png` | Scheduler screen showing job + `*/5 * * * *` | SAFE TO COMMIT REDACTED |
| `04-cron-log.txt` | Tail showing `cron.expire-orders complete` < 5 min ago | SAFE TO COMMIT REDACTED |
| `04-cron-alert.png` | Stale-cron alert rule configured | SAFE TO COMMIT REDACTED |
| `04-cron-manual-proof.txt` | Steps 1–6 above | SAFE TO COMMIT REDACTED |

---

## 7. Pass / fail

- **Pass:** scheduler shows the job, last run < 10 min ago with `complete`, stale-cron alert configured, manual proof captured, no double-restore.
- **Fail:** any of the above missing.
