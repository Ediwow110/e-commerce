import { prisma } from '../src/prisma.js';
import { hashPassword } from '../src/security.js';

// PRODUCTION SAFETY: refuse to seed demo data in production unless explicitly opted in.
if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_SEED !== '1') {
  console.error('Refusing to run seed script in production. Set ALLOW_PROD_SEED=1 to override.');
  process.exit(1);
}

async function main() {
  const superAdminEmail = process.env.SEED_SUPER_ADMIN_EMAIL || 'owner@luxe.test';
  const superAdminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD;
  const customerEmail = process.env.SEED_CUSTOMER_EMAIL || 'customer@luxe.test';
  const customerPassword = process.env.SEED_CUSTOMER_PASSWORD;

  let superAdminEmailCreated = null;
  if (superAdminPassword) {
    if (superAdminPassword.length < 12) {
      throw new Error('SEED_SUPER_ADMIN_PASSWORD must be at least 12 characters');
    }
    const superAdmin = await prisma.user.upsert({
      where: { email: superAdminEmail },
      update: {},
      create: { name: 'Store Owner', email: superAdminEmail, passwordHash: await hashPassword(superAdminPassword), role: 'SUPER_ADMIN' }
    });
    superAdminEmailCreated = superAdmin.email;
  }

  let customerEmailCreated = null;
  if (customerPassword) {
    if (customerPassword.length < 8) {
      throw new Error('SEED_CUSTOMER_PASSWORD must be at least 8 characters');
    }
    const customer = await prisma.user.upsert({
      where: { email: customerEmail },
      update: {},
      create: { name: 'Demo Customer', email: customerEmail, passwordHash: await hashPassword(customerPassword), role: 'CUSTOMER' }
    });
    customerEmailCreated = customer.email;
  }

  const jewelry = await prisma.category.upsert({ where: { slug: 'jewelry' }, update: {}, create: { name: 'Jewelry', slug: 'jewelry' } });
  const bags = await prisma.category.upsert({ where: { slug: 'bags' }, update: {}, create: { name: 'Bags', slug: 'bags' } });
  await prisma.product.upsert({ where: { slug: 'seraphina-pearl-necklace' }, update: {}, create: { categoryId: jewelry.id, name: 'Seraphina Pearl Necklace', slug: 'seraphina-pearl-necklace', description: 'Premium pearl necklace with gold detail.', material: 'Pearl / Gold Vermeil', price: 8950, isFeatured: true, images: { create: [{ url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=1200&auto=format&fit=crop', alt: 'Pearl necklace' }] }, variants: { create: [{ sku: 'LUX-JWL-001', color: 'Gold', size: '18in', material: 'Pearl', stock: 18 }] } } });
  await prisma.product.upsert({ where: { slug: 'noir-structured-tote' }, update: {}, create: { categoryId: bags.id, name: 'Noir Structured Tote', slug: 'noir-structured-tote', description: 'Luxury structured tote with premium hardware.', material: 'Black Leather', price: 12500, isFeatured: true, images: { create: [{ url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=1200&auto=format&fit=crop', alt: 'Black tote bag' }] }, variants: { create: [{ sku: 'LUX-BAG-001', color: 'Black', size: 'Medium', hardware: 'Gold', stock: 12 }] } } });

  console.log({ superAdmin: superAdminEmailCreated, customer: customerEmailCreated, seededAdmin: Boolean(superAdminEmailCreated) });
}

main().finally(() => prisma.$disconnect());
