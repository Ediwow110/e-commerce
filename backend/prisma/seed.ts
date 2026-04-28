import { prisma } from '../src/prisma.js';
import { hashPassword } from '../src/security.js';

async function main() {
  const superAdminEmail = process.env.SEED_SUPER_ADMIN_EMAIL || 'owner@luxe.test';
  const superAdminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD;
  let superAdminEmailCreated = null;
  if (superAdminPassword) {
    const superAdmin = await prisma.user.upsert({ where: { email: superAdminEmail }, update: {}, create: { name: 'Store Owner', email: superAdminEmail, passwordHash: await hashPassword(superAdminPassword), role: 'SUPER_ADMIN' } });
    superAdminEmailCreated = superAdmin.email;
  }
  const customer = await prisma.user.upsert({ where: { email: 'customer@luxe.test' }, update: {}, create: { name: 'Demo Customer', email: 'customer@luxe.test', passwordHash: await hashPassword(process.env.SEED_CUSTOMER_PASSWORD || 'password123'), role: 'CUSTOMER' } });
  const jewelry = await prisma.category.upsert({ where: { slug: 'jewelry' }, update: {}, create: { name: 'Jewelry', slug: 'jewelry' } });
  const bags = await prisma.category.upsert({ where: { slug: 'bags' }, update: {}, create: { name: 'Bags', slug: 'bags' } });
  await prisma.product.upsert({ where: { slug: 'seraphina-pearl-necklace' }, update: {}, create: { categoryId: jewelry.id, name: 'Seraphina Pearl Necklace', slug: 'seraphina-pearl-necklace', description: 'Premium pearl necklace with gold detail.', material: 'Pearl / Gold Vermeil', price: 8950, isFeatured: true, images: { create: [{ url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=1200&auto=format&fit=crop', alt: 'Pearl necklace' }] }, variants: { create: [{ sku: 'LUX-JWL-001', color: 'Gold', size: '18in', material: 'Pearl', stock: 18 }] } } });
  await prisma.product.upsert({ where: { slug: 'noir-structured-tote' }, update: {}, create: { categoryId: bags.id, name: 'Noir Structured Tote', slug: 'noir-structured-tote', description: 'Luxury structured tote with premium hardware.', material: 'Black Leather', price: 12500, isFeatured: true, images: { create: [{ url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=1200&auto=format&fit=crop', alt: 'Black tote bag' }] }, variants: { create: [{ sku: 'LUX-BAG-001', color: 'Black', size: 'Medium', hardware: 'Gold', stock: 12 }] } } });
  console.log({ superAdmin: superAdminEmailCreated, customer: customer.email, seededAdmin: Boolean(superAdminEmailCreated) });
}
main().finally(() => prisma.$disconnect());
