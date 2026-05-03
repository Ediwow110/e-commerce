-- ============================================================
-- Migration: Add performance indexes + PromoRedemption FK
-- ============================================================

-- User
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");
CREATE INDEX IF NOT EXISTS "User_isActive_idx" ON "User"("isActive");
CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User"("createdAt");

-- AdminInvitation
CREATE INDEX IF NOT EXISTS "AdminInvitation_invitedById_idx" ON "AdminInvitation"("invitedById");
CREATE INDEX IF NOT EXISTS "AdminInvitation_expiresAt_idx" ON "AdminInvitation"("expiresAt");

-- PasswordResetToken
CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- RefreshSession
CREATE INDEX IF NOT EXISTS "RefreshSession_userId_idx" ON "RefreshSession"("userId");
CREATE INDEX IF NOT EXISTS "RefreshSession_userId_revokedAt_idx" ON "RefreshSession"("userId", "revokedAt");
CREATE INDEX IF NOT EXISTS "RefreshSession_expiresAt_idx" ON "RefreshSession"("expiresAt");

-- Address
CREATE INDEX IF NOT EXISTS "Address_userId_idx" ON "Address"("userId");

-- Product
CREATE INDEX IF NOT EXISTS "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX IF NOT EXISTS "Product_isActive_idx" ON "Product"("isActive");
CREATE INDEX IF NOT EXISTS "Product_isFeatured_idx" ON "Product"("isFeatured");
CREATE INDEX IF NOT EXISTS "Product_isActive_isFeatured_idx" ON "Product"("isActive", "isFeatured");
CREATE INDEX IF NOT EXISTS "Product_createdAt_idx" ON "Product"("createdAt");

-- ProductVariant
CREATE INDEX IF NOT EXISTS "ProductVariant_productId_idx" ON "ProductVariant"("productId");
CREATE INDEX IF NOT EXISTS "ProductVariant_stock_idx" ON "ProductVariant"("stock");

-- ProductImage
CREATE INDEX IF NOT EXISTS "ProductImage_productId_idx" ON "ProductImage"("productId");

-- InventoryMovement
CREATE INDEX IF NOT EXISTS "InventoryMovement_variantId_idx" ON "InventoryMovement"("variantId");
CREATE INDEX IF NOT EXISTS "InventoryMovement_createdAt_idx" ON "InventoryMovement"("createdAt");

-- CartItem
CREATE INDEX IF NOT EXISTS "CartItem_userId_idx" ON "CartItem"("userId");

-- WishlistItem
CREATE INDEX IF NOT EXISTS "WishlistItem_userId_idx" ON "WishlistItem"("userId");

-- PromoCode
CREATE INDEX IF NOT EXISTS "PromoCode_isActive_idx" ON "PromoCode"("isActive");
CREATE INDEX IF NOT EXISTS "PromoCode_endsAt_idx" ON "PromoCode"("endsAt");

-- PromoRedemption — add FK constraints for User and PromoCode
ALTER TABLE "PromoRedemption"
  ADD COLUMN IF NOT EXISTS "userId" TEXT,
  ADD COLUMN IF NOT EXISTS "promoCodeId" TEXT;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PromoRedemption_userId_fkey'
  ) THEN
    ALTER TABLE "PromoRedemption"
      ADD CONSTRAINT "PromoRedemption_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PromoRedemption_promoCodeId_fkey'
  ) THEN
    ALTER TABLE "PromoRedemption"
      ADD CONSTRAINT "PromoRedemption_promoCodeId_fkey"
      FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- Order
CREATE INDEX IF NOT EXISTS "Order_userId_idx" ON "Order"("userId");
CREATE INDEX IF NOT EXISTS "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status");
CREATE INDEX IF NOT EXISTS "Order_paymentStatus_idx" ON "Order"("paymentStatus");
CREATE INDEX IF NOT EXISTS "Order_createdAt_idx" ON "Order"("createdAt");

-- OrderItem
CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX IF NOT EXISTS "OrderItem_productId_idx" ON "OrderItem"("productId");

-- Payment
CREATE INDEX IF NOT EXISTS "Payment_status_idx" ON "Payment"("status");
CREATE INDEX IF NOT EXISTS "Payment_createdAt_idx" ON "Payment"("createdAt");

-- Review — add unique constraint if not already present
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Review_userId_productId_key'
  ) THEN
    ALTER TABLE "Review"
      ADD CONSTRAINT "Review_userId_productId_key" UNIQUE ("userId", "productId");
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "Review_productId_idx" ON "Review"("productId");
CREATE INDEX IF NOT EXISTS "Review_isApproved_idx" ON "Review"("isApproved");

-- AuditLog
CREATE INDEX IF NOT EXISTS "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE INDEX IF NOT EXISTS "AuditLog_resource_idx" ON "AuditLog"("resource");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- WebhookEvent
CREATE INDEX IF NOT EXISTS "WebhookEvent_provider_idx" ON "WebhookEvent"("provider");
CREATE INDEX IF NOT EXISTS "WebhookEvent_createdAt_idx" ON "WebhookEvent"("createdAt");
CREATE INDEX IF NOT EXISTS "WebhookEvent_processedAt_idx" ON "WebhookEvent"("processedAt");

-- PromoRedemption indexes
CREATE INDEX IF NOT EXISTS "PromoRedemption_userId_idx" ON "PromoRedemption"("userId");
CREATE INDEX IF NOT EXISTS "PromoRedemption_promoCodeId_idx" ON "PromoRedemption"("promoCodeId");
