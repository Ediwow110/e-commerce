import { app } from './app.js';
import { env } from './env.js';
import { prisma } from './prisma.js';

const server = app.listen(env.PORT, () => console.log(`LUXE API running on http://localhost:${env.PORT}`));

async function shutdown() {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
