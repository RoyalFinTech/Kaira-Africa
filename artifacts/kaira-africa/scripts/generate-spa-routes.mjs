import { mkdir, copyFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const dist = resolve('dist/public');
const routes = [
  'onboarding',
  'login',
  'login/otp',
  'login/name',
  'admin',
  'admin/forgot-password',
  'admin/reset-password',
  'admin/dashboard',
  'business-onboarding',
  'dashboard',
  'team',
  'customers',
  'transactions',
  'analytics',
  'reports',
  'activity',
  'notifications',
  'profile',
  'settings',
  'crm',
  'inventory',
  'ai-reports',
  'legal/terms',
  'legal/privacy',
  'admin/analytics',
  'admin/crm',
  'admin/inventory',
];

const index = resolve(dist, 'index.html');
for (const route of routes) {
  const target = resolve(dist, route, 'index.html');
  await mkdir(dirname(target), { recursive: true });
  await copyFile(index, target);
}
console.log('SPA route entry files generated:', routes.length);
