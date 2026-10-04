// Live demo only (DEMO_MODE=true): wipes the database and loads demo accounts + sample issues on every
// start, so the public demo comes back clean each time the free instance wakes up.
const crypto = require('crypto');
const { loadEnvConfig } = require('@next/env');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

loadEnvConfig(process.cwd());

// Keep in sync with src/lib/demo.ts
const ADMIN = process.env.ADMIN_USERNAME || 'admin';
const USERS = [
  [ADMIN, 'admin'],
  ['support01', 'support'],
  ['support02', 'support'],
  ['somchai', 'user'],
  ['malee', 'user'],
];

// reporter, title, description, category, priority, assignee, status, hours ago
const ISSUES = [
  ['somchai', 'VPN disconnects every few minutes', 'Working from home, the VPN drops roughly every 5 minutes.', 'Network', 'High', 'support01', 'In Progress', 30],
  ['malee', 'Printer on 3rd floor is offline', 'The shared printer near the meeting room shows offline for everyone.', 'Hardware', 'Medium', 'support02', 'New', 20],
  ['somchai', 'Outlook not syncing on mobile', 'New emails do not show up on my phone since yesterday.', 'Software', 'Critical', 'support01', 'Resolved', 52],
  ['malee', 'Laptop request for new hire', 'New team member starts on Monday and needs a laptop set up.', 'Request', 'Low', null, 'New', 6],
  ['somchai', 'Cannot access shared drive', 'Getting "access denied" on the Finance shared folder.', 'Access', 'High', 'support02', 'In Progress', 3],
];

async function main() {
  if (process.env.DEMO_MODE !== 'true') {
    console.log('Demo seed: DEMO_MODE is not "true" - skipping');
    return;
  }

  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "issue", "users" RESTART IDENTITY');

    for (const [username, role] of USERS) {
      // Visitors use the "Try as" buttons; the owner can still sign in as admin with ADMIN_PASSWORD
      const password = username === ADMIN && process.env.ADMIN_PASSWORD
        ? process.env.ADMIN_PASSWORD
        : crypto.randomBytes(16).toString('hex');
      await prisma.user.create({ data: { username, role, password: await bcrypt.hash(password, 10) } });
    }

    for (const [createdBy, title, description, category, priority, assignedTo, status, hoursAgo] of ISSUES) {
      await prisma.issue.create({
        data: {
          title, description, category, priority, status, createdBy, assignedTo,
          createdAt: new Date(Date.now() - hoursAgo * 60 * 60 * 1000),
        },
      });
    }

    console.log(`Demo seed: reset database with ${USERS.length} users and ${ISSUES.length} issues`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Demo seed failed:', error);
  process.exit(1);
});
