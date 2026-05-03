import { app } from './app.js';
import { env } from './env.js';
import { prisma } from './prisma.js';
import { assertProductionReady } from './preflight.js';
import { logger } from './logger.js';

assertProductionReady();

const server = app.listen(env.PORT, () =>
  logger.info({ port: env.PORT, launchMode: env.LAUNCH_MODE, nodeEnv: env.NODE_ENV }, 'LUXE API listening')
);

async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down');
  await prisma.$disconnect();
  server.close(() => process.exit(0));
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
