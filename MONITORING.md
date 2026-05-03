# Monitoring & alerting

> Goal: a non-author engineer is paged within 5 minutes of any production
> incident, with enough context to start the matching runbook.

## Stack we assume

- **Sentry** (or Bugsnag / Rollbar) — uncaught exceptions, error rate.
- **Uptime monitor** (BetterUptime / UptimeRobot / Pingdom) — `/health` and
  `/ready`.
- **Log aggregator** (Datadog Logs / Logtail / Grafana Loki) — Pino JSON logs.
- **Provider dashboards** — PayMongo / Maya / Xendit each have their own
  webhook delivery status pages; bookmark them.

## Health endpoints

| Path | Returns | Purpose |
|---|---|---|
| `/health` | 200 always while process up | Liveness — load balancer / orchestrator restart trigger. |
| `/ready` | 200 when DB is reachable, 503 otherwise | Readiness — orchestrator drain & SLO. |

Configure the load balancer to use `/ready`; configure the platform's
liveness probe to use `/health`.

## Alerts — minimum set

| Alert | Source | Severity | Action |
|---|---|---|---|
| Uncaught exception rate >0 in 1 min | Sentry | P1 | RUNBOOK → "Spike in 5xx" |
| `/ready` returns 503 for >2 min | Uptime monitor | P1 | RUNBOOK → "Database connection failure" |
| `/health` unreachable for >1 min | Uptime monitor | P1 | Platform-level — check container logs |
| 5xx HTTP rate >2% over 5 min | Sentry / aggregator | P1 | RUNBOOK → "Spike in 5xx" |
| Webhook signature invalid >5 in 10 min | Log search `WEBHOOK_SIGNATURE_INVALID` | P1 | RUNBOOK → "Payment webhook failing" |
| `PAYMENT_AMOUNT_MISMATCH` audit log fired | Log search | **P0** | RUNBOOK → "Payment marked MANUAL_REVIEW" |
| `PAYMENT_CURRENCY_MISMATCH` audit log fired | Log search | **P0** | RUNBOOK → "Payment marked MANUAL_REVIEW" |
| `PAYMENT_LATE_REVIEW` audit log fired | Log search | P1 | RUNBOOK → "Payment marked MANUAL_REVIEW" |
| No `expire-orders completed` log for >5 min | Log search | P2 | RUNBOOK → "Orders stuck in PENDING_PAYMENT" |
| `STOCK_NEGATIVE_BLOCKED` log fired | Log search | P2 | RUNBOOK → "Stock mismatch detected" |
| Failed admin login spike: >20 fails in 5 min | Log search `LOGIN_FAILED` + `actorRole=ADMIN` | P2 | RUNBOOK → "Admin locked out" + check IPs |
| Dependency CVE Critical/High | GitHub Dependabot + CI audit job | P2 | Patch within 24h or workaround |

## Sentry setup

1. Create a project in Sentry → copy DSN → set `SENTRY_DSN`.
2. Set `RELEASE_VERSION` on every deploy (git SHA is fine) so source maps and
   regressions track per release.
3. Enable Performance (`tracesSampleRate: 0.1`) if budget allows.

## Uptime checks

Two checks per environment:

```
GET https://api.example.com/health      -> expect 200 within 2s
GET https://api.example.com/ready       -> expect 200 within 5s
```

Frequency: 60 s. Alert after 2 consecutive failures.

## Log redaction (already enforced)

Pino is configured to redact:
`password`, `passwordHash`, `passwordResetToken`, `accessToken`,
`refreshToken`, `authorization`, `cookie`, `paymentMethodId`,
`twoFactorSecret`, backup codes.

If you add a new sensitive field, add it to the Pino redact list in
`backend/src/logger.ts`.

## Dashboards to build

- **Orders** — PAID / PENDING_PAYMENT / EXPIRED / MANUAL_REVIEW counts per
  hour. Spike in PENDING_PAYMENT or MANUAL_REVIEW = something is wrong.
- **Payments** — count + amount by provider, success rate.
- **Auth** — login success / fail / locked counts, 2FA verify counts.
- **Cron** — last `expire-orders completed` timestamp; should never go >2 min
  stale.
