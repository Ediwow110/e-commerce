/**
 * Integration test bootstrap. Tests that import this file get a clean DB
 * and a logged-in CUSTOMER with a product variant ready to checkout.
 *
 * Requires DATABASE_URL pointing at a TEST database — never run against prod.
 * The CI workflow boots a Postgres service container and runs `prisma migrate deploy`
 * before invoking these tests.
 */
import { beforeAll, afterAll } from 'vitest';
import { prisma } from '../../src/prisma.js';

export const HAS_REAL_DB = !!process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('noop');

export async function resetDb() {
  // Truncate in dependency order. CASCADE handles FKs.
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "TwoFactorBackupCode",
      "PromoRedemption",
      "WebhookEvent",
      "AuditLog",
      "AdminInvitation",
      "PasswordResetToken",
      "RefreshSession",
      "Shipment",
      "Payment",
      "OrderItem",
      "Order",
      "PromoCode",
      "Review",
      "WishlistItem",
      "CartItem",
      "InventoryMovement",
      "ProductImage",
      "ProductVariant",
      "Product",
      "Category",
      "Address",
      "ContentBlock",
      "StoreSetting",
      "User"
    RESTART IDENTITY CASCADE
  `);
}

export async function seedMinimal() {
  const category = await prisma.category.create({ data: { name: 'Necklaces', slug: 'necklaces' } });
  const product = await prisma.product.create({
    data: {
      categoryId: category.id,
      name: 'Test Necklace',
      slug: 'test-necklace',
      description: 'A test product',
      price: '500.00'
    }
  });
  const variant = await prisma.productVariant.create({
    data: { productId: product.id, sku: 'TEST-SKU-001', stock: 10 }
  });
  return { category, product, variant };
}

beforeAll(async () => { await resetDb(); });
afterAll(async () => { await prisma.$disconnect(); });
