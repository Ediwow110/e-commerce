# Background jobs

LUXE Commerce currently has ONE recurring background job. It must be
scheduled by a cron-like process external to the backend container.

## `expire:orders` — clear abandoned carts

| | |
|---|---|
| Command | `cd /app/backend && npm run expire:orders` |
| Frequency | Every **1 minute** |
| Owner | Operations |
| Failure mode | Stock leaks (variants stay reserved against orders that will never pay) |

### What it does

Finds orders where `paymentExpiresAt <= now()` and `paymentStatus IN (UNPAID, PENDING)`,
and inside one transaction per order:

1. Sets `status=EXPIRED`, `paymentStatus=EXPIRED`.
2. Increments `productVariant.stock` by the previously-reserved quantity.
3. Writes an `InventoryMovement` of type `RETURN`.
4. Marks any pending `Payment` rows as `EXPIRED`.
5. Stamps `stockRestoredAt = now()` (idempotency marker).
6. Writes an `AuditLog` of action `ORDER_EXPIRED`.

### Multi-instance safety

The script uses a Postgres advisory lock keyed on the job name
(`luxe:cron:expire-orders`). If two cron runners fire simultaneously, only
one acquires the lock; the other exits with code 0 and a log line:

```
expire-orders skipped (another instance holds the lock)
```

The per-order transaction is **also independently idempotent**
(`stockRestoredAt IS NULL` guard), so even without the lock you cannot
double-restore stock. The lock simply prevents wasted work and noisy logs.

### Schedulers — pick one

#### a) Linux cron on a single VM

```cron
* * * * * cd /app/backend && /usr/bin/npm run --silent expire:orders >> /var/log/luxe-expire.log 2>&1
```

#### b) Replit Deployments — Scheduled

In your Deployment settings, add a Scheduled task:

- Schedule: `* * * * *`
- Command: `cd /app/backend && npm run expire:orders`

#### c) Kubernetes CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: luxe-expire-orders
spec:
  schedule: "* * * * *"
  concurrencyPolicy: Forbid       # cron-level guard; the advisory lock is the runtime guard
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: expire
              image: ghcr.io/your-org/luxe-backend:latest
              workingDir: /app/backend
              command: ["npm", "run", "expire:orders"]
              envFrom:
                - secretRef: { name: luxe-backend-env }
```

#### d) GitHub Actions (DEV / staging only — NOT recommended for production)

Possible but you sacrifice <1-minute precision and pay GH minutes. Not
recommended.

---

## Monitoring

Each successful run emits a single info log:

```
{"level":"info","scanned":12,"expired":3,"stockRestored":7,"alreadyHandled":0,"durationMs":118,"msg":"expire-orders completed"}
```

Each skipped run emits:

```
{"level":"info","durationMs":3,"msg":"expire-orders skipped (another instance holds the lock)"}
```

### Alert recommendation

> If no `expire-orders completed` log line is seen for **>5 minutes**, page
> the on-call. Either the cron stopped running or every run is silently
> losing the advisory-lock race (look for the skipped-message rate going to
> 100%).

Implement this in your log aggregator (Datadog, Logtail, Grafana Loki, etc.)
as a "no events match in last 5 minutes" alarm on `msg="expire-orders completed"`.

---

## Tests

`backend/tests/integration/cron-lock.test.ts` covers:

- Two concurrent calls — only one acquires the lock.
- Sequential call after release — the second call DOES acquire.

Order expiration idempotency is covered by
`backend/tests/integration/order-expiration.test.ts`.

---

## Future jobs (not yet implemented — only add when needed)

- `cleanup:refresh-tokens` — purge expired refresh sessions weekly.
- `reconcile:payments` — nightly diff of orders vs provider settlements.
- `digest:admin` — daily summary email to admins.

If you add a new job, give it a unique label string (used as the advisory-lock
key) and document it here.
