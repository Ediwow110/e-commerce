# Rollback

> **Rule of thumb:** rolling back the *app* is easy, rolling back the
> *database* is not. Our migrations are deliberately additive so that
> rolling back the app to N-1 is safe even after migration N has run.

## What you can safely roll back

| Layer | Reversibility |
|---|---|
| Frontend bundle | ✅ trivially — redeploy the previous static build |
| Backend container | ✅ trivially — redeploy the previous tag |
| **Additive migration** (new column / index / table) | ⚠️ usually safe to leave applied even if the app rolls back |
| **Destructive migration** (drop column / non-null + no default) | ❌ NOT safely reversible — forward-fix only |

## Procedure — bad backend deploy

1. **Stop the bleeding.** If 5xx is high, use the platform's "promote
   previous deployment" / "redeploy git SHA <PREV>" button. This is a
   one-click container swap.
2. Verify `/health` and `/ready` on the rolled-back revision.
3. Smoke-test: place one test order through the test card.
4. Open Sentry — confirm the error rate has dropped.
5. Open an incident issue in GitHub describing what broke and link the bad
   commit. Do NOT redeploy the bad commit before fixing it.

## Procedure — bad frontend deploy

1. Redeploy the previous static bundle (most platforms keep the last 5).
2. Verify with a hard refresh in incognito.
3. Open the diff between the bad and good build, find the regression, fix
   on a branch, redeploy.

## Procedure — bad migration

> Prisma migrations are forward-only. We do NOT keep a `down.sql`. The
> recovery strategy is **forward-fix**.

1. **Stop deploys** so no other instance picks up the broken migration.
2. If migration HAS NOT yet applied anywhere → `git revert` the migration
   file commit, redeploy.
3. If migration HAS applied:
   - If additive (column added, default fine): the rolled-back app simply
     ignores the new column. Roll back the app, then write a new additive
     migration that fixes the schema, deploy again.
   - If destructive (column dropped, data lost): restore from backup → see
     `BACKUPS.md → restore`. There is no clean code-only recovery.

## Procedure — corrupted production data

1. **Take a fresh backup BEFORE doing anything else.** You will need a
   "before this fix" snapshot to compare against.
2. Identify the affected rows with a read-only query.
3. Decide: SQL fix (small scope, reviewed by 2 engineers) vs restore from
   backup (large scope).
4. Apply the fix in a transaction; verify with the same read-only query;
   commit.
5. Audit-log the manual fix in your incident channel with the commit / SQL.

## Post-rollback checklist

- [ ] `/health` 200
- [ ] `/ready` 200
- [ ] Test order placed and paid
- [ ] Webhook for the test order received and order PAID
- [ ] Confirmation email received
- [ ] Sentry 5xx rate normal
- [ ] `expire-orders completed` log seen within 2 min
- [ ] Customer-facing status page updated (if you posted an incident)

## What NEVER to roll back

- A payment refund. Once Stripe / PayMongo / Maya / Xendit acknowledges the
  refund, it is final. If you "roll back" the order to PAID, the customer
  has a paid order with no money charged.
- A 2FA disable performed in Runbook 6 — re-enable through the UI.
- A user account deletion / GDPR-erase. Restore from backup if you must.
