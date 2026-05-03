-- =============================================================================
-- Production hardening migration
--   * Add explicit payment-lifecycle enum values
--   * Add unpaid-order expiration tracking
--   * Add 2FA columns + backup codes table
--   * Add login-lockout columns
--   * Add webhook (provider, eventId) compound unique
--   * Tighten payment indexes
-- All additive; safe to deploy.
-- =============================================================================

-- 1. New OrderStatus values: PENDING_PAYMENT, EXPIRED, PAYMENT_FAILED
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PENDING_PAYMENT';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PAYMENT_FAILED';

-- 2. New PaymentStatus values: CANCELLED, EXPIRED, MANUAL_REVIEW
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'MANUAL_REVIEW';

-- 3. Order: paymentExpiresAt + stockRestoredAt (idempotency guard)
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentExpiresAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "stockRestoredAt"  TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Order_paymentExpiresAt_idx" ON "Order"("paymentExpiresAt");
CREATE INDEX IF NOT EXISTS "Order_status_paymentStatus_idx" ON "Order"("status", "paymentStatus");

-- 4. User: 2FA + lockout tracking
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorEnabled"   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorSecret"    TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorEnrolledAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "failedLoginCount"   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lockedUntil"        TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt"        TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "User_lockedUntil_idx" ON "User"("lockedUntil");

-- 5. TwoFactorBackupCode (new table)
CREATE TABLE IF NOT EXISTS "TwoFactorBackupCode" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL,
  "codeHash"  TEXT NOT NULL UNIQUE,
  "usedAt"    TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TwoFactorBackupCode_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "TwoFactorBackupCode_userId_idx" ON "TwoFactorBackupCode"("userId");

-- 6. WebhookEvent: compound unique (provider, eventId).
--    Old schema had `eventId UNIQUE` only — collisions across providers possible.
--    The standalone unique stays for back-compat with code that looks up by eventId only;
--    the compound unique additionally enforces correctness when providers reuse IDs.
DO $$ BEGIN
  CREATE UNIQUE INDEX "WebhookEvent_provider_eventId_key"
    ON "WebhookEvent"("provider", "eventId");
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

-- 7. Payment.reference index for webhook lookups
CREATE INDEX IF NOT EXISTS "Payment_reference_idx" ON "Payment"("reference");
CREATE INDEX IF NOT EXISTS "Payment_provider_reference_idx" ON "Payment"("provider", "reference");

-- 8. AuditLog action+createdAt index for security forensics
CREATE INDEX IF NOT EXISTS "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
