import { mkdir, copyFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const dist = resolve('dist/public');
const routes = [...new Set([
  'onboarding',
  'login',
  'login/pin',
  'login/otp',
  'login/name',
  'admin',
  'admin/forgot-password',
  'admin/reset-password',
  'admin/dashboard',
  'admin/analytics',
  'admin/crm',
  'admin/inventory',
  'admin/daily-ledger',
  'admin/records',
  'business-onboarding',
  'dashboard',
  'team',
  'customers',
  'transactions',
  'crm',
  'inventory',
  'daily-ledger',
  'analytics',
  'reports',
  'activity',
  'notifications',
  'profile',
  'settings',
  'receipt-branding',
  'ai-reports',
  'crm',
  'inventory',
  'ai-reports',
  'legal/terms',
  'legal/privacy',
  'admin/analytics',
  'admin/crm',
  'admin/inventory',
])];

const index = resolve(dist, 'index.html');
for (const route of routes) {
  const target = resolve(dist, route, 'index.html');
  await mkdir(dirname(target), { recursive: true });
  await copyFile(index, target);
}
console.log('SPA route entry files generated:', routes.length);
