// Live-demo helpers. Demo mode is only on when DEMO_MODE=true (e.g. on the hosted demo).
export const isDemoMode = () => process.env.DEMO_MODE === 'true';

const adminUsername = () => process.env.ADMIN_USERNAME || 'admin';

// Which seeded account each "Try as" button signs in as (keep in sync with scripts/seed-demo.js)
export const getDemoAccount = (role: string): string | undefined =>
  new Map([
    ['admin', adminUsername()],
    ['support', 'support01'],
    ['user', 'somchai'],
  ]).get(role);

export const DEMO_ROLES = ['admin', 'support', 'user'];

// Seeded accounts that visitors must not edit or delete
export const isDemoUsername = (username: string) =>
  [adminUsername(), 'support01', 'support02', 'somchai', 'malee'].includes(username);
