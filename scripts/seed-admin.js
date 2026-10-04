// Creates the initial admin account on first start (safe to run on every start).
// Credentials come from ADMIN_USERNAME / ADMIN_PASSWORD - never hardcoded.
const { loadEnvConfig } = require('@next/env');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Read .env when run outside Docker (inside Docker the values come from docker-compose)
loadEnvConfig(process.cwd());

async function main() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    console.log('Admin seed: ADMIN_PASSWORD is not set - skipping');
    return;
  }

  const prisma = new PrismaClient();
  try {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      if (existing.role !== 'admin') {
        console.warn(`Admin seed: "${username}" exists but has role "${existing.role}" - not changing it`);
      } else {
        console.log(`Admin seed: "${username}" already exists - leaving it unchanged`);
      }
      return;
    }

    await prisma.user.create({
      data: {
        username,
        password: await bcrypt.hash(password, 10),
        role: 'admin',
      },
    });
    console.log(`Admin seed: created admin user "${username}"`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Admin seed failed:', error);
  process.exit(1);
});
