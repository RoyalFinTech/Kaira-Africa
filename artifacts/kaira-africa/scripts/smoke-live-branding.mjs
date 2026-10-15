import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const baseUrl = (process.env.KAIRA_BASE_URL || 'https://kaira-africa-frontend.onrender.com').replace(/\/$/, '');
const outputDir = process.env.KAIRA_SMOKE_OUTPUT || '/tmp/kaira-branding-smoke';
const playwrightModule = process.env.PLAYWRIGHT_MODULE || 'playwright';
const { chromium } = await import(playwrightModule);

async function sleep(ms) {
  await new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function waitForDeployedSplashBundle() {
  const deadline = Date.now() + 5 * 60 * 1000;
  let lastProblem = 'The new splash bundle has not been published yet.';

  while (Date.now() < deadline) {
    try {
      const htmlResponse = await fetch(`${baseUrl}/?branding-smoke=${Date.now()}`, { cache: 'no-store' });
      assert.equal(htmlResponse.status, 200, 'Frontend root must return HTTP 200');
      const html = await htmlResponse.text();
      const scriptMatch = html.match(/src=["']([^"']+\.js(?:\?[^"']*)?)["']/);
      assert.ok(scriptMatch, 'Production HTML must contain the built JavaScript entry point');

      const entryUrl = new URL(scriptMatch[1], baseUrl);
      const entryResponse = await fetch(entryUrl, { cache: 'no-store' });
      assert.equal(entryResponse.status, 200, 'Built JavaScript entry point must load');
      const entry = await entryResponse.text();
      const chunkMatch = entry.match(/SplashScreen-[A-Za-z0-9_-]+\.js/);
      assert.ok(chunkMatch, 'Built JavaScript must contain a lazy-loaded splash chunk');

      const chunkUrl = new URL(chunkMatch[0], entryUrl);
      const chunkResponse = await fetch(chunkUrl, { cache: 'no-store' });
      assert.equal(chunkResponse.status, 200, 'New splash chunk must load');
      const chunk = await chunkResponse.text();

      if (
        chunk.includes('Loading your business tools') &&
        chunk.includes('Preparing your workspace') &&
        chunk.includes('Almost ready')
      ) {
        console.log('LIVE BUNDLE: confirmed the newly versioned splash animation is deployed:', chunkUrl.href);
        return;
      }
      lastProblem = 'The frontend is still serving an older splash chunk.';
    } catch (error) {
      lastProblem = error instanceof Error ? error.message : String(error);
    }
    await sleep(10_000);
  }

  throw new Error(`Timed out waiting for the new Render build: ${lastProblem}`);
}

async function verifyLogo(page, label, screenshotPath) {
  const logo = page.locator('img[alt="Kaira Africa"]').first();
  await logo.waitFor({ state: 'visible', timeout: 15_000 });
  await logo.evaluate(async (img) => {
    if (!img.complete || img.naturalWidth === 0) {
      await new Promise((resolvePromise, rejectPromise) => {
        img.addEventListener('load', resolvePromise, { once: true });
        img.addEventListener('error', () => rejectPromise(new Error('Kaira official logo image failed to load')), { once: true });
      });
    }
  });

  const stats = await logo.evaluate((img) => {
    const style = window.getComputedStyle(img);
    const rect = img.getBoundingClientRect();
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas is unavailable for logo-content inspection');
    context.drawImage(img, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let opaquePixels = 0;
    let nonWhitePixels = 0;
    let coloredPixels = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const alpha = pixels[i + 3];
      if (alpha < 16) continue;
      opaquePixels++;
      const red = pixels[i];
      const green = pixels[i + 1];
      const blue = pixels[i + 2];
      if (Math.min(red, green, blue) < 245) nonWhitePixels++;
      if (Math.max(red, green, blue) - Math.min(red, green, blue) > 12) coloredPixels++;
    }
    return {
      src: img.currentSrc,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      visibleWidth: Math.round(rect.width),
      visibleHeight: Math.round(rect.height),
      display: style.display,
      visibility: style.visibility,
      opacity: Number(style.opacity),
      filter: style.filter,
      nonWhiteRatio: opaquePixels ? nonWhitePixels / opaquePixels : 0,
      coloredRatio: opaquePixels ? coloredPixels / opaquePixels : 0,
    };
  });

  assert.ok(stats.src.includes('/kaira-logo.png?rev=20261009-2'), `${label}: logo must use the new public static logo URL; got ${stats.src}`);
  assert.ok(stats.naturalWidth > 0 && stats.naturalHeight > 0, `${label}: image natural dimensions must be non-zero`);
  assert.ok(stats.visibleWidth >= 100 && stats.visibleHeight >= 50, `${label}: logo must occupy visible layout space: ${JSON.stringify(stats)}`);
  assert.equal(stats.display, 'block', `${label}: logo display must be block`);
  assert.equal(stats.visibility, 'visible', `${label}: logo must be visible`);
  assert.ok(stats.opacity > 0.9, `${label}: logo opacity must be at least 0.9`);
  assert.equal(stats.filter, 'none', `${label}: logo must not have destructive CSS filters`);
  assert.ok(stats.nonWhiteRatio > 0.005, `${label}: source image appears blank/white; pixel ratio ${stats.nonWhiteRatio}`);
  assert.ok(stats.coloredRatio > 0.002, `${label}: source image has no meaningful color variation; ratio ${stats.coloredRatio}`);

  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`${label} LOGO VERIFIED:`, JSON.stringify(stats));
}

await mkdir(outputDir, { recursive: true });

// Validate the actual public file first, bypassing the browser cache.
const assetResponse = await fetch(`${baseUrl}/kaira-logo.png?rev=20261009-2&asset-smoke=${Date.now()}`, { cache: 'no-store' });
assert.equal(assetResponse.status, 200, 'Official logo asset must return HTTP 200');
assert.match(assetResponse.headers.get('content-type') || '', /image\/png/i, 'Official logo asset must be served as PNG');
const assetBytes = Buffer.from(await assetResponse.arrayBuffer());
assert.ok(assetBytes.length > 20_000, `Official logo file looks unexpectedly small: ${assetBytes.length} bytes`);
assert.equal(assetBytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'Official logo must be a valid PNG');
const assetWidth = assetBytes.readUInt32BE(16);
const assetHeight = assetBytes.readUInt32BE(20);
assert.ok(assetWidth >= 100 && assetHeight >= 100, `Official logo dimensions are unexpectedly small: ${assetWidth}×${assetHeight}`);
console.log('PUBLIC LOGO ASSET VERIFIED:', JSON.stringify({ status: assetResponse.status, bytes: assetBytes.length, width: assetWidth, height: assetHeight }));

// Wait for Render to publish this specific commit before testing browser rendering.
await waitForDeployedSplashBundle();

// Verify the newly generated local hero assets are published with the app build.
for (const heroPath of ['kaira-dashboard-hero.webp', 'kaira-pin-login-hero.webp']) {
  const response = await fetch(baseUrl + '/' + heroPath + '?asset-smoke=' + Date.now(), { cache: 'no-store' });
  assert.equal(response.status, 200, heroPath + ' must return HTTP 200');
  assert.match(response.headers.get('content-type') || '', /image\/webp/i, heroPath + ' must be served as WebP');
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.ok(bytes.length > 4_000, heroPath + ' must contain real generated image data');
  console.log('GENERATED HERO ASSET VERIFIED:', JSON.stringify({ heroPath, bytes: bytes.length }));
}

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 1,
  });
  await context.addInitScript(() => {
    localStorage.removeItem('kaira_onboarding_done');
    localStorage.removeItem('kaira_token');
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto(`${baseUrl}/?splash-smoke=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await verifyLogo(page, 'SPLASH SCREEN', resolve(outputDir, 'splash-screen.png'));

  const progressBar = page.locator('[role="progressbar"][data-splash-started-at]');
  const startedAtText = await progressBar.getAttribute('data-splash-started-at');
  assert.ok(startedAtText, 'Splash should expose its real start time for timing verification');
  const timingStartedAt = Number(startedAtText);
  assert.ok(Number.isFinite(timingStartedAt) && timingStartedAt > 0, 'Splash start timestamp must be valid');

  // At 7 seconds after the splash actually mounted, it should still be active.
  await page.waitForFunction((startedAt) => Date.now() - Number(startedAt) >= 7_000, startedAtText, { timeout: 8_000 });
  assert.equal(new URL(page.url()).pathname, '/', 'Splash must remain visible at 7 seconds');
  await page.waitForURL((url) => url.pathname === '/onboarding', { timeout: 6_000 });
  const totalSplashMs = Date.now() - timingStartedAt;
  assert.ok(totalSplashMs >= 8_500 && totalSplashMs <= 13_000, `Splash timing must be around 9–10 seconds; observed ${totalSplashMs}ms`);
  console.log('SPLASH TIMING VERIFIED:', `${totalSplashMs}ms before onboarding`);

  await verifyLogo(page, 'FIRST ONBOARDING SCREEN', resolve(outputDir, 'onboarding-screen.png'));

  // Verify the actual login hero photo and the explicit Gambian flag rendering.
  const heroResponsePromise = page.waitForResponse(
    (response) => response.url().includes('images.unsplash.com/photo-1521737711867-e3b97375f902') && response.status() === 200,
    { timeout: 20_000 },
  );
  await page.goto(`${baseUrl}/login?hero-smoke=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.getByRole('heading', { name: 'Enter your phone number' }).waitFor({ state: 'visible', timeout: 15_000 });
  const heroResponse = await heroResponsePromise;
  assert.equal(heroResponse.status(), 200, 'Business-office hero image must load successfully');
  const heroPanel = page.locator('div[style*="images.unsplash.com/photo-1521737711867-e3b97375f902"]').first();
  const heroStats = await heroPanel.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return { backgroundImage: style.backgroundImage, backgroundSize: style.backgroundSize, backgroundPosition: style.backgroundPosition };
  });
  assert.ok(heroStats.backgroundImage.includes('images.unsplash.com'), `Login hero must use the business background image: ${JSON.stringify(heroStats)}`);
  assert.ok(heroStats.backgroundSize.split(',').every((layer) => layer.trim() === 'cover'), `Every login hero background layer must cover the whole panel: ${JSON.stringify(heroStats)}`);
  const flag = page.locator('form').getByRole('img', { name: 'Flag of The Gambia' });
  await flag.waitFor({ state: 'visible', timeout: 10_000 });
  assert.equal(await flag.locator('rect').count(), 5, 'Gambia SVG flag must show all five horizontal color bands');
  await page.screenshot({ path: resolve(outputDir, 'login-phone-screen.png'), fullPage: true });
  console.log('LOGIN HERO AND FLAG VERIFIED:', JSON.stringify({ heroStatus: heroResponse.status(), heroStats, flagBands: await flag.locator('rect').count() }));

  // A direct open/refresh on /onboarding must return to splash first.
  await page.evaluate(() => sessionStorage.removeItem('kaira_splash_complete'));
  await page.goto(`${baseUrl}/onboarding?direct-entry-smoke=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForURL((url) => url.pathname === '/', { timeout: 10_000 });
  const secondSplash = page.locator('[role="progressbar"][data-splash-started-at]');
  await secondSplash.waitFor({ state: 'visible', timeout: 10_000 });
  await page.waitForURL((url) => url.pathname === '/onboarding', { timeout: 12_000 });
  console.log('DIRECT ONBOARDING ENTRY VERIFIED: direct /onboarding passed through splash before onboarding.');

  // Verify the real mobile breakpoint at a common Android viewport.
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileContext.newPage();
  const mobileErrors = [];
  mobilePage.on('pageerror', (error) => mobileErrors.push(error.message));
  await mobilePage.goto(`${baseUrl}/login?mobile-branding-smoke=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await mobilePage.getByRole('heading', { name: 'Enter your phone number' }).waitFor({ state: 'visible', timeout: 15_000 });
  const mobileBanner = mobilePage.locator('section[aria-label="Kaira Africa business platform"]');
  await mobileBanner.waitFor({ state: 'visible', timeout: 10_000 });
  const mobileLogo = mobileBanner.locator('img[alt="Kaira Africa"]');
  await mobileLogo.waitFor({ state: 'visible', timeout: 10_000 });
  const mobileLogoStats = await mobileLogo.evaluate((img) => {
    const rect = img.getBoundingClientRect();
    return { width: rect.width, height: rect.height, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight };
  });
  assert.ok(mobileLogoStats.width >= 60 && mobileLogoStats.height >= 60, `Mobile banner logo should remain clearly visible: ${JSON.stringify(mobileLogoStats)}`);
  assert.ok(mobileLogoStats.naturalWidth > 0 && mobileLogoStats.naturalHeight > 0, 'Mobile banner logo asset must load');
  for (const feature of ['CRM', 'Inventory', 'Analytics', 'AI Reports']) {
    await mobileBanner.getByText(feature, { exact: true }).waitFor({ state: 'visible', timeout: 5_000 });
  }
  const mobileLayout = await mobilePage.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    viewportHeight: window.innerHeight,
    bodyHeight: document.documentElement.scrollHeight,
  }));
  assert.ok(mobileLayout.documentWidth <= mobileLayout.viewportWidth, `Mobile login must not overflow horizontally: ${JSON.stringify(mobileLayout)}`);
  assert.deepEqual(mobileErrors, [], `Mobile browser runtime errors: ${mobileErrors.join(' | ')}`);
  await mobilePage.screenshot({ path: resolve(outputDir, 'login-mobile-screen.png'), fullPage: true });
  console.log('MOBILE LOGIN RESPONSIVE UI VERIFIED:', JSON.stringify({ mobileLogoStats, mobileLayout, features: ['CRM', 'Inventory', 'Analytics', 'AI Reports'] }));

  // Returning-user PIN, registration setup, profile recovery, navigation and mobile smoke tests.
  // All auth/data API calls in this block are intercepted, so no production
  // users, PINs, ledger entries or business records are created or modified.
  const pinContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  await pinContext.addInitScript(() => {
    localStorage.setItem('kaira_onboarding_done', 'true');
  });
  const pinPage = await pinContext.newPage();
  const pinErrors = [];
  const pinConsoleErrors = [];
  const unhandledApiRequests = [];
  pinPage.on('pageerror', (error) => pinErrors.push(error.message));
  pinPage.on('console', (message) => {
    if (message.type() === 'error') pinConsoleErrors.push(message.text());
  });

  const pinLoginRequests = [];
  const pinSetRequests = [];
  const inventoryCreateRequests = [];
  const inventoryImageRequests = [];
  const inventoryAdjustmentRequests = [];
  const inventoryFixtureProducts = [];
  const crmCustomerRequests = [];
  const crmPhotoRequests = [];
  const crmPhotoDeleteRequests = [];
  const crmInteractionRequests = [];
  const crmFixtureCustomers = [];
  const profileAvatarRequests = [];
  let profileAvatarDeleteCount = 0;
  let pinEnabled = false;
  const nowIso = new Date().toISOString();
  const visualBusiness = {
    id: 'business_visual_smoke',
    name: 'Visual Smoke Shop',
    type: 'retail',
    industry: 'retail',
    country: 'The Gambia',
    city: 'Banjul',
    phone: '+220871234567',
    email: 'fatou@example.gm',
    website: null,
    description: 'Visual browser-test fixture',
    logoUrl: null,
    address: 'Banjul',
    teamSize: '1-5',
    status: 'active',
    createdAt: nowIso,
  };
  const visualUser = {
    id: 'user_visual_smoke',
    email: 'fatou@example.gm',
    firstName: 'Fatou',
    lastName: 'Jallow',
    phone: '+220871234567',
    avatarUrl: null,
    role: 'owner',
    businessId: visualBusiness.id,
    createdAt: nowIso,
    lastLoginAt: null,
  };
  let receiptBrandingFixture = {
    companyName: visualBusiness.name,
    address: visualBusiness.address,
    phone: visualBusiness.phone,
    email: visualBusiness.email,
    website: "",
    footerNote: "Thank you for your business.",
    showReceiptNumber: true,
    showCustomerDetails: true,
    logoUrl: null,
    hasLogo: false,
  };
  const premiumTransactionFixture = {
    id: "transaction-visual-smoke",
    reference: "TXN-SMOKE-001",
    amount: 1250,
    currency: "GMD",
    type: "payment",
    status: "completed",
    customerId: null,
    customerName: "Smoke Customer",
    description: "Smoke-test customer payment",
    paymentMethod: "bank_transfer",
    notes: "Fixture transaction only",
    attachmentUrl: null,
    createdAt: nowIso,
    completedAt: nowIso,
    updatedAt: nowIso,
  };
  const dailyEntryFixture = {
    id: "ledger-visual-smoke",
    entryType: "sale",
    description: "Smoke-test sale",
    category: "Sales",
    amount: 1250,
    balance: null,
    currency: "GMD",
    customerName: "Smoke Customer",
    productId: null,
    quantity: 1,
    dueDate: null,
    status: "recorded",
    recordedDate: nowIso.slice(0, 10),
    recordedTime: "10:30",
    paymentMethod: "bank_transfer",
    remarks: "Browser smoke fixture only",
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  const corsHeaders = {
    'access-control-allow-origin': baseUrl,
    'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    'access-control-allow-headers': 'authorization,content-type',
    'access-control-allow-credentials': 'true',
    vary: 'Origin',
    'content-type': 'application/json; charset=utf-8',
  };

  await pinPage.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const pathname = url.pathname;
    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }

    if (pathname.endsWith('/api/auth/login-pin') && method === 'POST') {
      pinLoginRequests.push(JSON.parse(request.postData() || '{}'));
      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({ token: 'usr_visual_smoke_token', isNewUser: false, user: visualUser }),
      });
      return;
    }

    if (pathname.endsWith('/api/auth/pin-status') && method === 'GET') {
      await route.fulfill({ status: 200, headers: corsHeaders, body: JSON.stringify({ enabled: pinEnabled }) });
      return;
    }

    if (pathname.endsWith('/api/auth/set-pin') && method === 'POST') {
      pinSetRequests.push(JSON.parse(request.postData() || '{}'));
      pinEnabled = true;
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }

    if (pathname.endsWith('/api/auth/me') && method === 'GET') {
      await route.fulfill({ status: 200, headers: corsHeaders, body: JSON.stringify(visualUser) });
      return;
    }

    if (pathname.endsWith('/api/businesses/me') && method === 'GET') {
      await route.fulfill({ status: 200, headers: corsHeaders, body: JSON.stringify(visualBusiness) });
      return;
    }
    if (pathname.endsWith('/api/businesses/me/stats') && method === 'GET') {
      await route.fulfill({ status: 200, headers: corsHeaders, body: JSON.stringify({
        totalRevenue: 1250, revenueChange: 0, totalTransactions: 1, transactionsChange: 0,
        totalCustomers: crmFixtureCustomers.length, customersChange: 0, teamMembers: 1, teamChange: 0,
        recentTransactions: [premiumTransactionFixture], recentActivity: [],
      }) });
      return;
    }
    if (pathname.endsWith('/api/businesses/me/receipt-settings') && method === 'GET') {
      await route.fulfill({ status: 200, headers: corsHeaders, body: JSON.stringify(receiptBrandingFixture) });
      return;
    }
    if (pathname.endsWith('/api/businesses/me/receipt-settings') && method === 'PATCH') {
      receiptBrandingFixture = { ...receiptBrandingFixture, ...JSON.parse(request.postData() || '{}') };
      await route.fulfill({ status: 200, headers: corsHeaders, body: JSON.stringify(receiptBrandingFixture) });
      return;
    }
    if (pathname.endsWith('/api/businesses/me/receipt-logo') && method === 'POST') {
      const input = JSON.parse(request.postData() || '{}');
      receiptBrandingFixture = { ...receiptBrandingFixture, logoUrl: input.dataUrl || null, hasLogo: Boolean(input.dataUrl) };
      await route.fulfill({ status: 201, headers: corsHeaders, body: JSON.stringify(receiptBrandingFixture) });
      return;
    }
    if (pathname.endsWith('/api/businesses/me/receipt-logo') && method === 'DELETE') {
      receiptBrandingFixture = { ...receiptBrandingFixture, logoUrl: null, hasLogo: false };
      await route.fulfill({ status: 200, headers: corsHeaders, body: JSON.stringify(receiptBrandingFixture) });
      return;
    }
    if (pathname.endsWith('/api/notifications') && method === 'GET') {
      await route.fulfill({ status: 200, headers: corsHeaders, body: JSON.stringify([]) });
      return;
    }
    if (pathname.endsWith('/api/analytics/revenue') && method === 'GET') {
      await route.fulfill({ status: 200, headers: corsHeaders, body: JSON.stringify({
        total: 1250, change: 0, changePercent: 0, data: [{ label: 'Today', value: 1250, previousValue: 0 }], topCustomers: [],
      }) });
      return;
    }
    if (pathname.endsWith('/api/analytics/customers') && method === 'GET') {
      await route.fulfill({ status: 200, headers: corsHeaders, body: JSON.stringify({ total: crmFixtureCustomers.length, change: 0, changePercent: 0, data: [], byCountry: [] }) });
      return;
    }
    if (pathname.endsWith('/api/analytics/transactions') && method === 'GET') {
      await route.fulfill({ status: 200, headers: corsHeaders, body: JSON.stringify({ total: 1, volume: 1250, change: 0, changePercent: 0, data: [{ label: 'Today', value: 1, previousValue: 0 }], byStatus: [{ label: 'Completed', value: 1, previousValue: 0 }], byType: [{ label: 'Payment', value: 1, previousValue: 0 }] }) });
      return;
    }
    if (pathname.endsWith('/api/customers') && method === 'GET') {
      const searchTerm = (url.searchParams.get('search') || '').toLowerCase();
      const all = crmFixtureCustomers.map((customer) => ({ ...customer, totalSpend: 0, transactionCount: 0 }));
      const matches = all.filter((customer) => JSON.stringify(customer).toLowerCase().includes(searchTerm));
      const page = Number(url.searchParams.get('page') || 1);
      const limit = Number(url.searchParams.get('limit') || 20);
      await route.fulfill({ status: 200, headers: corsHeaders, body: JSON.stringify({ customers: matches, total: matches.length, page, limit }) });
      return;
    }
    if (pathname.endsWith('/api/daily-ledger') && method === 'GET') {
      const startDate = url.searchParams.get('startDate') || nowIso.slice(0, 10);
      const endDate = url.searchParams.get('endDate') || startDate;
      const page = Number(url.searchParams.get('page') || 1);
      const pageSize = Number(url.searchParams.get('pageSize') || 50);
      const entry = { ...dailyEntryFixture, recordedDate: startDate };
      await route.fulfill({ status: 200, headers: corsHeaders, body: JSON.stringify({
        startDate, endDate, entries: [entry],
        pagination: { page, pageSize, total: 1, totalPages: 1 },
        summary: { sales: 1250, expenses: 0, outstandingDebt: 0, debtPayments: 0, otherIncome: 0, salesLessExpenses: 1250, totalRecords: 1 },
        dailyTrend: [{ date: startDate, sales: 1250, expenses: 0 }], expensesByCategory: [],
      }) });
      return;
    }
    if (pathname.endsWith('/api/daily-ledger') && method === 'POST') {
      const input = JSON.parse(request.postData() || '{}');
      await route.fulfill({ status: 201, headers: corsHeaders, body: JSON.stringify({ ...dailyEntryFixture, ...input, id: 'ledger-created-smoke' }) });
      return;
    }
    const dailyStatusRoute = pathname.match(/\/api\/daily-ledger\/([^/]+)\/status$/);
    if (dailyStatusRoute && method === 'PATCH') {
      await route.fulfill({ status: 200, headers: corsHeaders, body: JSON.stringify({ ...dailyEntryFixture, id: dailyStatusRoute[1], status: (JSON.parse(request.postData() || '{}')).status || 'paid' }) });
      return;
    }
    if (pathname.endsWith('/api/transactions') && method === 'GET') {
      const searchTerm = (url.searchParams.get('search') || '').toLowerCase();
      const status = url.searchParams.get('status');
      const type = url.searchParams.get('type');
      const matches = [premiumTransactionFixture].filter((tx) =>
        (!searchTerm || JSON.stringify(tx).toLowerCase().includes(searchTerm)) &&
        (!status || tx.status === status) && (!type || tx.type === type)
      );
      await route.fulfill({ status: 200, headers: corsHeaders, body: JSON.stringify({
        transactions: matches, total: matches.length,
        page: Number(url.searchParams.get('page') || 1), limit: Number(url.searchParams.get('limit') || 20),
      }) });
      return;
    }
    if (pathname.endsWith('/api/transactions') && method === 'POST') {
      const input = JSON.parse(request.postData() || '{}');
      Object.assign(premiumTransactionFixture, input, { id: 'transaction-created-smoke', reference: 'TXN-CREATED-SMOKE', status: 'pending', createdAt: nowIso, updatedAt: nowIso, completedAt: null });
      await route.fulfill({ status: 201, headers: corsHeaders, body: JSON.stringify(premiumTransactionFixture) });
      return;
    }
    const txAttachmentRoute = pathname.match(/\/api\/transactions\/([^/]+)\/attachment$/);
    if (txAttachmentRoute && method === 'POST') {
      const input = JSON.parse(request.postData() || '{}');
      Object.assign(premiumTransactionFixture, { attachmentUrl: input.dataUrl || null, updatedAt: new Date().toISOString() });
      await route.fulfill({ status: 200, headers: corsHeaders, body: JSON.stringify(premiumTransactionFixture) });
      return;
    }
    if (txAttachmentRoute && method === 'DELETE') {
      Object.assign(premiumTransactionFixture, { attachmentUrl: null, updatedAt: new Date().toISOString() });
      await route.fulfill({ status: 200, headers: corsHeaders, body: JSON.stringify(premiumTransactionFixture) });
      return;
    }
    const txRoute = pathname.match(/\/api\/transactions\/([^/]+)$/);
    if (txRoute && method === 'GET') {
      await route.fulfill({ status: 200, headers: corsHeaders, body: JSON.stringify(premiumTransactionFixture) });
      return;
    }
    if (txRoute && method === 'PATCH') {
      Object.assign(premiumTransactionFixture, JSON.parse(request.postData() || '{}'), { updatedAt: new Date().toISOString() });
      if (premiumTransactionFixture.status === 'completed' && !premiumTransactionFixture.completedAt) premiumTransactionFixture.completedAt = nowIso;
      await route.fulfill({ status: 200, headers: corsHeaders, body: JSON.stringify(premiumTransactionFixture) });
      return;
    }


    if (method === 'PATCH' && pathname.includes('/api/auth/')) {
      const input = JSON.parse(request.postData() || '{}');
      const updated = {
        ...visualUser,
        firstName: input.firstName || 'Awa',
        lastName: input.lastName || 'Jallow',
        businessId: null,
      };
      await route.fulfill({ status: 200, headers: corsHeaders, body: JSON.stringify(updated) });
      return;
    }

    if (pathname.endsWith('/api/auth/logout') && method === 'POST') {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }

    if (pathname.endsWith('/api/auth/profile/avatar') && method === 'POST') {
      const input = JSON.parse(request.postData() || '{}');
      const dataUrl = typeof input.dataUrl === 'string' ? input.dataUrl : '';
      profileAvatarRequests.push({ dataUrlPrefix: dataUrl.slice(0, 30), bytes: dataUrl.includes(',') ? Buffer.from(dataUrl.split(',')[1], 'base64').byteLength : 0 });
      visualUser.avatarUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC';
      await route.fulfill({ status: 200, headers: corsHeaders, body: JSON.stringify(visualUser) });
      return;
    }
    if (pathname.endsWith('/api/auth/profile/avatar') && method === 'DELETE') {
      profileAvatarDeleteCount++;
      visualUser.avatarUrl = null;
      await route.fulfill({ status: 200, headers: corsHeaders, body: JSON.stringify(visualUser) });
      return;
    }

    if (pathname.endsWith('/api/crm/overview') && method === 'GET') {
      await route.fulfill({ status: 200, headers: corsHeaders, body: JSON.stringify({
        customers: crmFixtureCustomers.map((customer) => ({ ...customer, totalSpend: 0, transactionCount: 0 })),
        interactions: crmInteractionRequests.map((item, index) => ({ id: 'crm-interaction-' + index, customerId: item.customerId, customerName: (crmFixtureCustomers.find((customer) => customer.id === item.customerId)?.firstName || 'Test') + ' ' + (crmFixtureCustomers.find((customer) => customer.id === item.customerId)?.lastName || 'Customer'), userName: 'Smoke Test', type: item.type, title: item.title, note: item.note, nextActionAt: item.nextActionAt || null, completedAt: null, createdAt: nowIso })),
        metrics: { totalCustomers: crmFixtureCustomers.length, activeCustomers: crmFixtureCustomers.filter((customer) => customer.status === 'active').length, openFollowUps: crmInteractionRequests.filter((item) => item.nextActionAt).length },
      }) });
      return;
    }
    if (pathname.endsWith('/api/crm/customers') && method === 'GET') {
      const searchTerm = (url.searchParams.get('search') || '').toLowerCase();
      const matches = crmFixtureCustomers.filter((customer) => JSON.stringify(customer).toLowerCase().includes(searchTerm));
      await route.fulfill({ status: 200, headers: corsHeaders, body: JSON.stringify({ customers: matches, total: matches.length }) });
      return;
    }
    if (pathname.endsWith('/api/crm/customers') && method === 'POST') {
      const input = JSON.parse(request.postData() || '{}');
      crmCustomerRequests.push({ method: 'POST', input });
      const created = { id: 'crm-customer-smoke', ...input, email: input.email || null, phone: input.phone || null, company: input.company || null, country: input.country || null, city: input.city || null, avatarUrl: null, profileData: input.profileData || {}, status: input.status || 'active', totalSpend: 0, transactionCount: 0, createdAt: nowIso, updatedAt: nowIso };
      crmFixtureCustomers.push(created);
      await route.fulfill({ status: 201, headers: corsHeaders, body: JSON.stringify(created) });
      return;
    }
    const crmCustomerRoute = pathname.match(/\/api\/crm\/customers\/([^/]+)$/);
    if (crmCustomerRoute && method === 'PUT') {
      const input = JSON.parse(request.postData() || '{}');
      crmCustomerRequests.push({ method: 'PUT', id: crmCustomerRoute[1], input });
      const customer = crmFixtureCustomers.find((item) => item.id === crmCustomerRoute[1]);
      if (!customer) { await route.fulfill({ status: 404, headers: corsHeaders, body: JSON.stringify({ message: 'CRM fixture customer not found' }) }); return; }
      Object.assign(customer, input, { profileData: { ...(customer.profileData || {}), ...(input.profileData || {}) }, updatedAt: new Date().toISOString() });
      await route.fulfill({ status: 200, headers: corsHeaders, body: JSON.stringify(customer) });
      return;
    }
    const crmPhotoRoute = pathname.match(/\/api\/crm\/customers\/([^/]+)\/photo$/);
    if (crmPhotoRoute && method === 'POST') {
      const input = JSON.parse(request.postData() || '{}');
      const dataUrl = typeof input.dataUrl === 'string' ? input.dataUrl : '';
      crmPhotoRequests.push({ id: crmPhotoRoute[1], isImageDataUrl: /^data:image\/(jpeg|png|webp);base64,/.test(dataUrl), bytes: dataUrl.includes(',') ? Buffer.from(dataUrl.split(',')[1], 'base64').byteLength : 0 });
      const customer = crmFixtureCustomers.find((item) => item.id === crmPhotoRoute[1]);
      if (!customer) { await route.fulfill({ status: 404, headers: corsHeaders, body: JSON.stringify({ message: 'CRM fixture customer not found' }) }); return; }
      customer.avatarUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC';
      await route.fulfill({ status: 200, headers: corsHeaders, body: JSON.stringify(customer) });
      return;
    }
    if (crmPhotoRoute && method === 'DELETE') {
      crmPhotoDeleteRequests.push(crmPhotoRoute[1]);
      const customer = crmFixtureCustomers.find((item) => item.id === crmPhotoRoute[1]);
      if (customer) customer.avatarUrl = null;
      await route.fulfill({ status: 200, headers: corsHeaders, body: JSON.stringify(customer || {}) });
      return;
    }
    if (pathname.endsWith('/api/crm/interactions') && method === 'POST') {
      const input = JSON.parse(request.postData() || '{}');
      crmInteractionRequests.push(input);
      await route.fulfill({ status: 201, headers: corsHeaders, body: JSON.stringify({ id: 'crm-interaction-' + crmInteractionRequests.length, ...input, customerName: 'Test Customer', userName: 'Smoke Test', nextActionAt: input.nextActionAt || null, completedAt: null, createdAt: nowIso }) });
      return;
    }
    const crmCompleteRoute = pathname.match(/\/api\/crm\/interactions\/([^/]+)\/complete$/);
    if (crmCompleteRoute && method === 'PATCH') {
      await route.fulfill({ status: 200, headers: corsHeaders, body: JSON.stringify({ id: crmCompleteRoute[1], completedAt: nowIso }) });
      return;
    }

    if (pathname.endsWith('/api/inventory/products') && method === 'GET') {
      await route.fulfill({ status: 200, headers: corsHeaders, body: JSON.stringify(inventoryFixtureProducts) });
      return;
    }

    if (pathname.endsWith('/api/inventory/products') && method === 'POST') {
      const input = JSON.parse(request.postData() || '{}');
      inventoryCreateRequests.push(input);
      const created = {
        id: 'product_visual_smoke',
        name: input.name,
        sku: input.sku,
        category: input.category || null,
        unit: input.unit || 'piece',
        quantity: input.quantity ?? 0,
        reorderLevel: input.reorderLevel ?? 5,
        unitCost: input.unitCost ?? 0,
        salePrice: input.salePrice ?? 0,
        currency: input.currency || 'GMD',
        active: true,
        imageUrl: null,
      };
      inventoryFixtureProducts.push(created);
      await route.fulfill({ status: 201, headers: corsHeaders, body: JSON.stringify(created) });
      return;
    }

    const imageRoute = pathname.match(/\/api\/inventory\/products\/([^/]+)\/image$/);
    if (imageRoute && method === 'POST') {
      const input = JSON.parse(request.postData() || '{}');
      const dataUrl = typeof input.dataUrl === 'string' ? input.dataUrl : '';
      const encoded = dataUrl.startsWith('data:image/jpeg;base64,') ? dataUrl.slice('data:image/jpeg;base64,'.length) : '';
      inventoryImageRequests.push({ productId: imageRoute[1], jpegDataUrl: dataUrl.startsWith('data:image/jpeg;base64,'), base64Length: encoded.length, imageBytes: Buffer.from(encoded, 'base64').byteLength });
      const product = inventoryFixtureProducts.find((item) => item.id === imageRoute[1]);
      if (!product) {
        await route.fulfill({ status: 404, headers: corsHeaders, body: JSON.stringify({ message: 'Fixture product not found' }) });
        return;
      }
      const updated = { ...product, imageUrl: null };
      inventoryFixtureProducts.splice(inventoryFixtureProducts.indexOf(product), 1, updated);
      await route.fulfill({ status: 200, headers: corsHeaders, body: JSON.stringify(updated) });
      return;
    }

    const adjustRoute = pathname.match(/\/api\/inventory\/products\/([^/]+)\/adjust$/);
    if (adjustRoute && method === 'POST') {
      const input = JSON.parse(request.postData() || '{}');
      inventoryAdjustmentRequests.push({ productId: adjustRoute[1], ...input });
      const product = inventoryFixtureProducts.find((item) => item.id === adjustRoute[1]);
      if (!product) {
        await route.fulfill({ status: 404, headers: corsHeaders, body: JSON.stringify({ message: 'Fixture product not found' }) });
        return;
      }
      const updated = { ...product, quantity: product.quantity + Number(input.quantityDelta || 0) };
      inventoryFixtureProducts.splice(inventoryFixtureProducts.indexOf(product), 1, updated);
      await route.fulfill({ status: 200, headers: corsHeaders, body: JSON.stringify(updated) });
      return;
    }

    unhandledApiRequests.push({ method, pathname });
    await route.fulfill({
      status: 503,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'smoke_fixture_unimplemented', message: 'This read-only smoke fixture is not configured for that endpoint.' }),
    });
  });

  const heroImageFailures = [];
  pinPage.on('requestfailed', (request) => {
    if (request.url().includes('kaira-pin-login-hero.webp') || request.url().includes('kaira-dashboard-hero.webp')) {
      heroImageFailures.push({ url: request.url(), error: request.failure()?.errorText || 'request failed' });
    }
  });
  await pinPage.goto(baseUrl + '/login/pin?pin-smoke=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await pinPage.getByRole('heading', { name: 'Welcome back', exact: true }).waitFor({ state: 'visible', timeout: 15_000 });
  await pinPage.screenshot({ path: resolve(outputDir, 'pin-login-screen.png'), fullPage: true });
  const pinHero = pinPage.locator('img[src="/kaira-pin-login-hero.webp"]');
  await pinHero.waitFor({ state: 'visible', timeout: 10_000 });
  const pinHeroStats = await pinHero.evaluate(async (img) => {
    const waitForImage = () => new Promise((resolve) => {
      const finish = () => resolve({
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        currentSrc: img.currentSrc,
      });
      img.addEventListener('load', finish, { once: true });
      img.addEventListener('error', finish, { once: true });
      window.setTimeout(finish, 5_000);
    });
    if (!img.complete) return await waitForImage();
    return {
      complete: img.complete,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      currentSrc: img.currentSrc,
    };
  });
  assert.ok(pinHeroStats.complete && pinHeroStats.naturalWidth > 0, 'PIN sign-in hero image must render in the browser: ' + JSON.stringify({ pinHeroStats, heroImageFailures }));
  console.log('PIN LOGIN HERO RENDER VERIFIED:', JSON.stringify(pinHeroStats));
  const networkSelector = pinPage.getByRole('combobox', { name: 'Mobile network' });
  await networkSelector.click();
  await pinPage.getByRole('option', { name: /Africell/ }).click();
  const phoneInput = pinPage.getByLabel('Seven digit phone number');
  await phoneInput.fill('1234567');
  await pinPage.getByLabel('Six-digit sign-in PIN').fill('482951');

  await pinPage.getByRole('button', { name: 'Continue to dashboard' }).waitFor({ state: 'visible', timeout: 10_000 });
  await pinPage.getByRole('button', { name: 'Continue to dashboard' }).waitFor({ state: 'attached', timeout: 10_000 });
  assert.equal(await pinPage.getByRole('button', { name: 'Continue to dashboard' }).isDisabled(), false, 'PIN sign-in should enable after a 7-digit number and six-digit PIN are entered');
  await pinPage.getByRole('button', { name: 'Continue to dashboard' }).click();
  await pinPage.waitForURL((url) => url.pathname === '/dashboard', { timeout: 15_000 });
  assert.equal(pinLoginRequests.length, 1, 'PIN sign-in must call the login endpoint once');
  assert.equal(pinLoginRequests[0].pin, '482951', 'PIN sign-in must submit exactly the six-digit PIN');
  assert.equal(pinLoginRequests[0].phoneNumber, '+220871234567', 'PIN sign-in must submit the normalized country code, network prefix and seven subscriber digits');
  const dashboardHero = pinPage.locator('img[src="/kaira-dashboard-hero.webp"]');
  await dashboardHero.waitFor({ state: 'visible', timeout: 10_000 });
  const dashboardHeroStats = await dashboardHero.evaluate(async (img) => {
    const waitForImage = () => new Promise((resolve) => {
      const finish = () => resolve({
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        currentSrc: img.currentSrc,
      });
      img.addEventListener('load', finish, { once: true });
      img.addEventListener('error', finish, { once: true });
      window.setTimeout(finish, 5_000);
    });
    if (!img.complete) return await waitForImage();
    return {
      complete: img.complete,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      currentSrc: img.currentSrc,
    };
  });
  assert.ok(dashboardHeroStats.complete && dashboardHeroStats.naturalWidth > 0, 'Dashboard hero must render real image pixels: ' + JSON.stringify({ dashboardHeroStats, heroImageFailures }));
  await pinPage.screenshot({ path: resolve(outputDir, 'dashboard-hero-desktop.png'), fullPage: true });
  console.log('PIN LOGIN AND DASHBOARD HERO VERIFIED:', JSON.stringify({ loginRequests: pinLoginRequests.length, dashboardHeroStats }));

  const sidebarProfileLink = pinPage.locator('a[href="/profile"]').first();
  await sidebarProfileLink.waitFor({ state: 'visible', timeout: 10_000 });
  await sidebarProfileLink.click();
  await pinPage.waitForURL((url) => url.pathname === '/profile', { timeout: 10_000 });
  await sleep(1_000);
  const profileRouteDiagnostics = await pinPage.evaluate(() => ({
    pathname: window.location.pathname,
    headings: Array.from(document.querySelectorAll('h1,h2,h3')).map((node) => node.textContent?.trim()).filter(Boolean),
    mainText: document.querySelector('main.min-w-0.flex-1')?.innerText?.slice(0, 1800) || '',
    alerts: Array.from(document.querySelectorAll('[role="alert"]')).map((node) => node.textContent?.trim()).filter(Boolean),
  }));
  await pinPage.screenshot({ path: resolve(outputDir, 'profile-route-diagnostics.png'), fullPage: true });
  console.log('PROFILE ROUTE DIAGNOSTICS:', JSON.stringify({ ...profileRouteDiagnostics, pinErrors, pinConsoleErrors, unhandledApiRequests }));
  assert.ok(
    profileRouteDiagnostics.headings.some((heading) => /profile/i.test(heading)),
    'Profile route must render a visible profile heading. Diagnostics: ' +
      JSON.stringify({ ...profileRouteDiagnostics, pinErrors, pinConsoleErrors }),
  );
  await pinPage.getByText('PIN sign-in', { exact: true }).waitFor({ state: 'visible', timeout: 10_000 });
  assert.ok((await pinPage.locator('main.min-w-0.flex-1').innerText()).trim().length > 40, 'Profile must show useful content rather than a blank white page');
  await pinPage.getByLabel('New six-digit PIN').fill('482951');
  await pinPage.getByLabel('Confirm six-digit PIN').fill('482951');
  await pinPage.getByRole('button', { name: 'Set my PIN' }).click();
  await pinPage.getByText('Your PIN was saved successfully.').waitFor({ state: 'visible', timeout: 10_000 });
  await pinPage.getByText('PIN sign-in is enabled').waitFor({ state: 'visible', timeout: 10_000 });
  assert.equal(pinSetRequests.length, 1, 'Profile PIN setup should make one intercepted save request');
  assert.equal(pinSetRequests[0].pin, '482951', 'Initial profile PIN setup should submit the new PIN');

  // Updating a PIN must ask for the current PIN and submit the replacement.
  await pinPage.getByLabel('Current six-digit PIN').fill('482951');
  await pinPage.getByLabel('New six-digit PIN').fill('573824');
  await pinPage.getByLabel('Confirm six-digit PIN').fill('573824');
  await pinPage.getByRole('button', { name: 'Update PIN' }).click();
  await pinPage.getByText('Your PIN was saved successfully.').waitFor({ state: 'visible', timeout: 10_000 });
  assert.equal(pinSetRequests.length, 2, 'PIN update should make one additional intercepted save request');
  assert.equal(pinSetRequests[1].currentPin, '482951', 'PIN update must include the current PIN for server verification');
  assert.equal(pinSetRequests[1].pin, '573824', 'PIN update must include the replacement PIN');
  await pinPage.screenshot({ path: resolve(outputDir, 'profile-pin-settings.png'), fullPage: true });
  console.log('PROFILE NON-BLANK STATE, PIN CREATION AND PIN UPDATE VERIFIED');

  // Exercise every primary desktop navigation destination through its actual link.
  await pinPage.evaluate(() => {
    window.__kairaPrintCalls = 0;
    window.print = () => {
      window.__kairaPrintCalls += 1;
      window.dispatchEvent(new Event('afterprint'));
    };
  });
  const navigationTargets = [
    ['/dashboard', 'Dashboard'],
    ['/team', 'Team'],
    ['/customers', 'Customers'],
    ['/transactions', 'Transactions'],
    ['/daily-ledger', 'Daily Ledger'],
    ['/crm', 'CRM'],
    ['/inventory', 'Inventory'],
    ['/analytics', 'Analytics'],
    ['/reports', 'Reports'],
    ['/activity', 'Activity'],
    ['/ai-reports', 'AI Reports'],
    ['/profile', 'Profile'],
    ['/receipt-branding', 'Receipt Branding'],
    ['/settings', 'Settings'],
  ];
  for (const [routePath, label] of navigationTargets) {
    const link = pinPage.locator('a[href="' + routePath + '"]').first();
    await link.waitFor({ state: 'visible', timeout: 10_000 });
    await link.click();
    await pinPage.waitForURL((url) => url.pathname === routePath, { timeout: 10_000 });
    await pinPage.locator('main.min-w-0.flex-1').waitFor({ state: 'visible', timeout: 10_000 });
    try {
      await pinPage.waitForFunction(() => {
        const main = document.querySelector('main.min-w-0.flex-1');
        return Boolean(main && main.innerText.trim().length > 20);
      }, null, { timeout: 10_000 });
    } catch (error) {
      const diagnostic = {
        routePath, url: pinPage.url(),
        headings: await pinPage.locator('h1,h2').allTextContents().catch(() => []),
        mainText: (await pinPage.locator('main.min-w-0.flex-1').innerText().catch(() => '')).trim().slice(0, 1800),
        alerts: await pinPage.locator('[role="alert"]').allTextContents().catch(() => []),
        unhandledApiRequests,
      };
      console.log('NAVIGATION RENDER DIAGNOSTICS:', JSON.stringify(diagnostic));
      throw new Error('Navigation to ' + label + ' did not render a non-empty main area: ' + String(error));
    }
    const expectedPageMarkers = {
      '/crm': () => pinPage.getByRole('heading', { name: 'Customer CRM' }),
      '/transactions': () => pinPage.getByRole('heading', { name: 'Transactions', exact: true }),
      '/daily-ledger': () => pinPage.getByText('Your business book', { exact: true }),
      '/receipt-branding': () => pinPage.getByRole('heading', { name: 'Receipt & Print Branding' }),
    };
    if (expectedPageMarkers[routePath]) {
      await expectedPageMarkers[routePath]().waitFor({ state: 'visible', timeout: 10_000 });
    }
    const mainText = (await pinPage.locator('main.min-w-0.flex-1').innerText().catch(() => '')).trim();
    assert.ok(mainText.length > 20, 'Navigation to ' + label + ' must render a non-empty page');

    if (routePath === '/crm') {
      await pinPage.getByRole('button', { name: 'Add customer' }).click();
      await pinPage.getByRole('button', { name: 'Upload from device' }).waitFor({ state: 'visible', timeout: 10_000 });
      await pinPage.getByRole('button', { name: 'Take photo' }).waitFor({ state: 'visible', timeout: 10_000 });
      await pinPage.getByRole('button', { name: 'Take photo' }).click();
      await pinPage.getByRole('heading', { name: 'Take customer photo' }).waitFor({ state: 'visible', timeout: 10_000 });
      await pinPage.getByRole('button', { name: 'Cancel' }).last().click();
      await pinPage.getByLabel('First name *').fill('Aminata');
      await pinPage.getByLabel('Last name *').fill('SmokeCustomer');
      await pinPage.getByLabel('Date of birth').fill('1990-05-12');
      await pinPage.getByLabel('Marital status (optional)').selectOption({ label: 'Married' });
      const onePixelPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64');
      await pinPage.locator('input[type="file"]').first().setInputFiles({ name: 'customer-photo.png', mimeType: 'image/png', buffer: onePixelPng });
      await pinPage.getByRole('button', { name: 'Save customer' }).click();
      await pinPage.getByText('Aminata SmokeCustomer', { exact: true }).first().waitFor({ state: 'visible', timeout: 10_000 });
      const crmPrintBefore = await pinPage.evaluate(() => window.__kairaPrintCalls);
      await pinPage.getByRole('button', { name: 'Print / PDF' }).click();
      await pinPage.waitForFunction((before) => window.__kairaPrintCalls > before, crmPrintBefore, { timeout: 5_000 });
      const customerPrintBefore = await pinPage.evaluate(() => window.__kairaPrintCalls);
      await pinPage.getByRole('button', { name: 'Print customer card' }).click();
      await pinPage.waitForFunction((before) => window.__kairaPrintCalls > before, customerPrintBefore, { timeout: 5_000 });
      assert.equal(crmCustomerRequests.filter((item) => item.method === 'POST').length, 1, 'CRM add customer should make one intercepted create request');
      assert.equal(crmCustomerRequests[0].input.profileData.dateOfBirth, '1990-05-12', 'CRM should persist optional date of birth');
      assert.equal(crmCustomerRequests[0].input.profileData.maritalStatus, 'Married', 'CRM should persist optional marital status');
      assert.equal(crmPhotoRequests.length, 1, 'CRM should upload an optional customer photo');
      assert.equal(crmPhotoRequests[0].isImageDataUrl, true, 'CRM customer photo should be submitted as an image data URL');

      await pinPage.getByPlaceholder('Search any saved customer detail…').fill('1990-05-12');
      await pinPage.getByText('Aminata SmokeCustomer', { exact: true }).first().waitFor({ state: 'visible', timeout: 10_000 });
      await pinPage.getByRole('button', { name: 'Edit', exact: true }).click();
      await pinPage.getByLabel('Marital status (optional)').selectOption({ label: 'Divorced' });
      await pinPage.getByRole('button', { name: 'Save customer' }).click();
      await pinPage.locator('main.min-w-0.flex-1').getByText('Marital status:', { exact: true }).waitFor({ state: 'visible', timeout: 10_000 });
      assert.equal(crmCustomerRequests.filter((item) => item.method === 'PUT').length, 1, 'CRM edit should make one intercepted update request');
      assert.equal(crmCustomerRequests.find((item) => item.method === 'PUT').input.profileData.maritalStatus, 'Divorced', 'CRM should persist edited optional details');

      await pinPage.getByRole('button', { name: 'Remove photo' }).click();
      await pinPage.getByRole('button', { name: 'Remove photo' }).waitFor({ state: 'detached', timeout: 10_000 });
      assert.equal(crmPhotoDeleteRequests.length, 1, 'CRM photo removal should call the delete endpoint');
      await pinPage.locator('main.min-w-0.flex-1 select:has(option[value="crm-customer-smoke"])').selectOption('crm-customer-smoke');
      await pinPage.getByPlaceholder('Activity title (e.g. Delivery feedback)').fill('Smoke test feedback');
      await pinPage.getByPlaceholder('What happened? What did the customer say? What should happen next?').fill('Customer confirmed the service was helpful.');
      await pinPage.getByRole('button', { name: 'Save activity' }).click();
      assert.equal(crmInteractionRequests.length, 1, 'CRM activity should be persisted through the activity endpoint');
      assert.equal(crmInteractionRequests[0].title, 'Smoke test feedback', 'CRM activity should include its title');
      const [crmDownload] = await Promise.all([
        pinPage.waitForEvent('download'),
        pinPage.getByRole('button', { name: 'Export CSV' }).click(),
      ]);
      assert.equal(crmDownload.suggestedFilename(), 'kaira-crm-customers.csv', 'CRM should export customer records as CSV');
      console.log('CRM OPTIONAL PROFILE, SEARCH, EDIT, PHOTO, ACTIVITY AND CSV FLOWS VERIFIED:', JSON.stringify({
        creates: crmCustomerRequests.filter((item) => item.method === 'POST').length,
        updates: crmCustomerRequests.filter((item) => item.method === 'PUT').length,
        photoUploads: crmPhotoRequests.length,
        photoRemovals: crmPhotoDeleteRequests.length,
        activities: crmInteractionRequests.length,
        csv: crmDownload.suggestedFilename(),
      }));
    }

    if (routePath === '/transactions') {
      await pinPage.getByRole('button', { name: 'New transaction' }).click();
      await pinPage.getByLabel('Transaction currency').waitFor({ state: 'visible', timeout: 10_000 });
      await pinPage.getByRole('combobox', { name: 'Transaction type', exact: true }).waitFor({ state: 'visible', timeout: 10_000 });
      await pinPage.getByLabel('Payment method').waitFor({ state: 'visible', timeout: 10_000 });
      await pinPage.getByRole('button', { name: 'Cancel' }).last().click();
      await pinPage.getByRole('button', { name: 'Details' }).first().click();
      const transactionPrintBefore = await pinPage.evaluate(() => window.__kairaPrintCalls);
      await pinPage.getByRole('button', { name: 'Print receipt / record' }).click();
      await pinPage.waitForFunction((before) => window.__kairaPrintCalls > before, transactionPrintBefore, { timeout: 5_000 });
      assert.ok(premiumTransactionFixture.reference === 'TXN-SMOKE-001', 'Transaction receipt uses the intercepted transaction fixture');
      await pinPage.getByRole('button', { name: 'Close' }).first().click();
    }

    if (routePath === '/daily-ledger') {
      const ledgerPrintBefore = await pinPage.evaluate(() => window.__kairaPrintCalls);
      await pinPage.getByRole('button', { name: 'Print / PDF' }).click();
      await pinPage.waitForFunction((before) => window.__kairaPrintCalls > before, ledgerPrintBefore, { timeout: 5_000 });
    }

    if (routePath === '/receipt-branding') {
      await pinPage.getByLabel('Printed company name').fill('Smoke Receipt Studio');
      await pinPage.getByRole('button', { name: 'Save branding settings' }).click();
      await pinPage.getByText('Receipt branding saved. Your next print will use these details.').waitFor({ state: 'visible', timeout: 10_000 });
      const logoFile = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64');
      await pinPage.locator('input[type="file"]').last().setInputFiles({ name: 'smoke-receipt-logo.png', mimeType: 'image/png', buffer: logoFile });
      await pinPage.getByText('Logo uploaded to private storage and saved for future printouts.').waitFor({ state: 'visible', timeout: 10_000 });
      const samplePrintBefore = await pinPage.evaluate(() => window.__kairaPrintCalls);
      await pinPage.getByRole('button', { name: 'Print sample / Save PDF' }).click();
      await pinPage.waitForFunction((before) => window.__kairaPrintCalls > before, samplePrintBefore, { timeout: 5_000 });
      assert.equal(receiptBrandingFixture.companyName, 'Smoke Receipt Studio', 'Receipt branding form should persist the company name via the intercepted save API');
      assert.equal(receiptBrandingFixture.hasLogo, true, 'Receipt logo should be sent to the authenticated upload endpoint');
    }

    if (routePath === '/profile') {
      await pinPage.getByRole('img', { name: 'Default 3D profile avatar' }).waitFor({ state: 'visible', timeout: 10_000 });
      await pinPage.getByRole('button', { name: 'Upload profile photo' }).waitFor({ state: 'visible', timeout: 10_000 });
      await pinPage.getByRole('button', { name: 'Take profile photo' }).waitFor({ state: 'visible', timeout: 10_000 });
      await pinPage.getByRole('button', { name: 'Take profile photo' }).click();
      await pinPage.getByRole('heading', { name: 'Take profile photo' }).waitFor({ state: 'visible', timeout: 10_000 });
      await pinPage.getByRole('button', { name: 'Cancel' }).last().click();
      await pinPage.getByRole('button', { name: 'Upload profile photo' }).click();
      const onePixelPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64');
      await pinPage.locator('input[type="file"]').first().setInputFiles({ name: 'profile-avatar.png', mimeType: 'image/png', buffer: onePixelPng });
      await pinPage.getByText('Profile photo updated.').waitFor({ state: 'visible', timeout: 10_000 });
      await pinPage.locator('header img[alt="Fatou Jallow profile photo"]').first().waitFor({ state: 'visible', timeout: 10_000 });
      assert.equal(profileAvatarRequests.length, 1, 'Profile avatar upload should call the authenticated avatar endpoint');
      assert.ok(profileAvatarRequests[0].bytes > 0, 'Profile avatar should submit non-empty image data');
      await pinPage.getByRole('button', { name: 'Remove photo' }).click();
      await pinPage.getByText('Photo removed. Your default avatar is now shown.').waitFor({ state: 'visible', timeout: 10_000 });
      assert.equal(profileAvatarDeleteCount, 1, 'Profile avatar removal should call the authenticated delete endpoint');
      console.log('PROFILE AVATAR UPLOAD AND REMOVAL VERIFIED:', JSON.stringify({ uploads: profileAvatarRequests.length, removals: profileAvatarDeleteCount }));
    }

    if (routePath === '/inventory') {
      await pinPage.getByRole('heading', { name: 'Inventory & stock book' }).waitFor({ state: 'visible', timeout: 10_000 });
      await pinPage.getByText(/SKU means.*Stock Keeping Unit/i).waitFor({ state: 'visible', timeout: 10_000 });
      await pinPage.getByRole('button', { name: 'Go back' }).waitFor({ state: 'visible', timeout: 10_000 });
      await pinPage.getByRole('button', { name: 'Add product' }).click();
      await pinPage.getByText(/maximum of 200 KB/i).waitFor({ state: 'visible', timeout: 10_000 });

      await pinPage.getByPlaceholder('e.g. 25 kg bag of rice').fill('Rice 25 kg bag');
      await pinPage.getByPlaceholder('e.g. RICE-25KG').fill('RICE-SMOKE-25KG');
      await pinPage.getByPlaceholder('e.g. Food, clothing, supplies').fill('Food');
      await pinPage.getByPlaceholder('piece, bag, bottle, box').fill('bag');
      const inventoryNumbers = pinPage.locator('input[type="number"]');
      await inventoryNumbers.nth(0).fill('12');
      await inventoryNumbers.nth(1).fill('3');
      await pinPage.locator('select').selectOption('NGN');
      await inventoryNumbers.nth(2).fill('7.5');
      await inventoryNumbers.nth(3).fill('10');

      // Small synthetic image: browser compression and API handling are tested,
      // while the intercepted route ensures no real product/photo is created.
      const onePixelPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64');
      await pinPage.locator('input[type="file"]').setInputFiles({
        name: 'rice-product.png',
        mimeType: 'image/png',
        buffer: onePixelPng,
      });
      await pinPage.getByText(/Photo prepared for upload: rice-product.png/i).waitFor({ state: 'visible', timeout: 10_000 });
      await pinPage.getByRole('button', { name: 'Save product' }).click();
      await pinPage.getByRole('status').filter({ hasText: 'Product saved.' }).waitFor({ state: 'visible', timeout: 10_000 });
      assert.equal(inventoryCreateRequests.length, 1, 'Inventory form should make one intercepted product-create request');
      assert.equal(inventoryCreateRequests[0].name, 'Rice 25 kg bag', 'Inventory form should submit the product name');
      assert.equal(inventoryCreateRequests[0].sku, 'RICE-SMOKE-25KG', 'Inventory form should submit the item code');
      assert.equal(inventoryCreateRequests[0].currency, 'NGN', 'Inventory form should submit the selected currency');
      assert.equal(inventoryImageRequests.length, 1, 'Optional product photo should upload once after product creation');
      assert.equal(inventoryImageRequests[0].jpegDataUrl, true, 'Product photo should be converted to JPEG before upload');
      assert.ok(inventoryImageRequests[0].imageBytes > 0 && inventoryImageRequests[0].imageBytes <= 200 * 1024, 'Compressed JPEG upload must be 200 KB or smaller after base64 decoding');
      await pinPage.getByRole('button', { name: 'Receive one bag of Rice 25 kg bag' }).click();
      await pinPage.getByText('13 bag', { exact: true }).last().waitFor({ state: 'visible', timeout: 10_000 });
      assert.equal(inventoryAdjustmentRequests.length, 1, 'Stock receive button should send one intercepted stock-movement request');
      assert.equal(inventoryAdjustmentRequests[0].quantityDelta, 1, 'Stock receive button should add one unit');
      console.log('INVENTORY STOCK BOOK, CURRENCY, COMPRESSED PHOTO AND MOVEMENT VERIFIED:', JSON.stringify({
        createCount: inventoryCreateRequests.length,
        photoCount: inventoryImageRequests.length,
        jpegDataUrl: inventoryImageRequests[0].jpegDataUrl,
        currency: inventoryCreateRequests[0].currency,
        adjustmentCount: inventoryAdjustmentRequests.length,
      }));
    }
  }

  // Header shortcuts that used to be dead ends now open their respective routes.
  await pinPage.getByRole('button', { name: 'Find customers' }).click();
  await pinPage.waitForURL((url) => url.pathname === '/customers', { timeout: 10_000 });
  await pinPage.getByRole('link', { name: 'Notifications' }).click();
  await pinPage.waitForURL((url) => url.pathname === '/notifications', { timeout: 10_000 });

  // Check the dedicated PIN screen and authenticated dashboard on a 390px phone.
  await pinPage.setViewportSize({ width: 390, height: 844 });
  await pinPage.goto(baseUrl + '/login/pin?mobile-pin-smoke=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await pinPage.getByRole('heading', { name: 'Welcome back', exact: true }).waitFor({ state: 'visible', timeout: 10_000 });
  const pinMobileLayout = await pinPage.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  assert.ok(pinMobileLayout.documentWidth <= pinMobileLayout.viewportWidth, 'PIN sign-in must not overflow on mobile: ' + JSON.stringify(pinMobileLayout));

  await pinPage.goto(baseUrl + '/dashboard?mobile-dashboard-smoke=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await pinPage.locator('nav[aria-label="Primary mobile navigation"]').waitFor({ state: 'visible', timeout: 10_000 });
  const dashboardMobileLayout = await pinPage.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  assert.ok(dashboardMobileLayout.documentWidth <= dashboardMobileLayout.viewportWidth, 'Dashboard must not overflow on mobile: ' + JSON.stringify(dashboardMobileLayout));
  await pinPage.locator('nav[aria-label="Primary mobile navigation"] a[href="/daily-ledger"]').click();
  await pinPage.waitForURL((url) => url.pathname === '/daily-ledger', { timeout: 10_000 });
  await pinPage.screenshot({ path: resolve(outputDir, 'dashboard-mobile-screen.png'), fullPage: true });

  // Registration PIN setup is tested with a fake user and fully intercepted API writes.
  await pinPage.setViewportSize({ width: 1440, height: 900 });
  await pinPage.goto(baseUrl + '/login/name?registration-pin-smoke=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await pinPage.getByLabel('Full Name').fill('Awa Jallow');
  await pinPage.getByLabel('Six-digit PIN').fill('482951');
  await pinPage.getByLabel('Confirm PIN').fill('482951');
  await pinPage.locator('form button[type="submit"]').click();
  await pinPage.waitForURL((url) => url.pathname === '/business-onboarding' || url.pathname === '/dashboard', { timeout: 15_000 });
  assert.equal(pinSetRequests.length, 3, 'Registration must save the PIN after SMS-verified profile completion');
  assert.equal(pinSetRequests[2].pin, '482951', 'Registration must send only the PIN value to the protected API endpoint');
  await pinPage.screenshot({ path: resolve(outputDir, 'registration-pin-setup.png'), fullPage: true });
  assert.deepEqual(pinErrors, [], 'PIN/profile/navigation runtime errors: ' + pinErrors.join(' | '));
  console.log('PIN REGISTRATION, PROFILE, NAVIGATION AND MOBILE SMOKE TESTS PASSED:', JSON.stringify({
    pinLoginRequests: pinLoginRequests.length,
    pinSetRequests: pinSetRequests.length,
    navigationTargets: navigationTargets.length,
    mobilePin: pinMobileLayout,
    mobileDashboard: dashboardMobileLayout,
  }));
  await pinContext.close();

  // Explicit regression case for the reported white /profile screen:
  // the current-user API fails, so the page must show a useful recovery state.
  const profileFailureContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });
  await profileFailureContext.addInitScript(() => {
    localStorage.setItem('kaira_token', 'usr_profile_failure_smoke');
    localStorage.setItem('kaira_onboarding_done', 'true');
  });
  const profileFailurePage = await profileFailureContext.newPage();
  const profileFailureErrors = [];
  profileFailurePage.on('pageerror', (error) => profileFailureErrors.push(error.message));
  await profileFailurePage.route('**/api/**', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': baseUrl,
          'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
          'access-control-allow-headers': 'authorization,content-type',
          'access-control-allow-credentials': 'true',
          vary: 'Origin',
        },
      });
      return;
    }
    await route.fulfill({
      status: 503,
      headers: {
        'access-control-allow-origin': baseUrl,
        'access-control-allow-credentials': 'true',
        'content-type': 'application/json; charset=utf-8',
        vary: 'Origin',
      },
      body: JSON.stringify({ error: 'test_service_unavailable', message: 'The profile test API is deliberately unavailable.' }),
    });
  });
  await profileFailurePage.goto(baseUrl + '/profile?profile-error-smoke=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await profileFailurePage.getByRole('heading', { name: "We couldn't load your profile" }).waitFor({ state: 'visible', timeout: 15_000 });
  assert.ok((await profileFailurePage.locator('main').innerText()).includes('Try again'), 'Failed profile loads must show an actionable retry state');
  assert.deepEqual(profileFailureErrors, [], 'Profile API failure must not crash the page: ' + profileFailureErrors.join(' | '));
  await profileFailurePage.screenshot({ path: resolve(outputDir, 'profile-recovery-state.png'), fullPage: true });
  await profileFailureContext.close();
  console.log('PROFILE API FAILURE RECOVERY VERIFIED: no blank page or browser runtime error.');

  // Render the authenticated app shell with all API requests safely intercepted.
  // The fake token is never sent to the production API; requests receive a stub
  // response so this verifies navigation/layout without reading or mutating data.
  const analyticsRequests = [];
  const transactionFixture = {
    transactions: [{
      id: 'visual-test-transaction-1',
      reference: 'KAI-CSV-001',
      amount: 123.45,
      currency: 'GMD',
      type: 'payment',
      status: 'completed',
      customerId: 'visual-test-customer-1',
      customerName: 'Test "CSV", Customer',
      description: 'Visual-only CSV escaping test',
      createdAt: '2026-10-12T12:34:56.000Z',
      completedAt: '2026-10-12T12:34:56.000Z',
    }],
    total: 1,
    page: 1,
    limit: 20,
  };
  await mobilePage.route('**/api/**', async (route) => {
    const requestUrl = new URL(route.request().url());
    const corsHeaders = {
      'access-control-allow-origin': baseUrl,
      'access-control-allow-headers': 'authorization,content-type',
      'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS',
      'access-control-allow-credentials': 'true',
    };
    if (requestUrl.pathname.endsWith('/api/analytics/revenue')) {
      analyticsRequests.push(requestUrl.href);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({
          total: 123.45,
          change: 12.5,
          changePercent: 10,
          data: [{ label: '2026-10-12', value: 123.45, previousValue: 111 }],
          topCustomers: [],
        }),
      });
      return;
    }
    if (requestUrl.pathname.endsWith('/api/transactions')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify(transactionFixture),
      });
      return;
    }
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Visual smoke test: non-target API responses are intentionally stubbed.' }),
    });
  });
  await mobilePage.addInitScript(() => {
    localStorage.setItem('kaira_token', 'usr_mobile_nav_visual_test');
    localStorage.setItem('kaira_onboarding_done', 'true');
  });
  await mobilePage.goto(`${baseUrl}/dashboard?mobile-nav-smoke=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  const bottomNav = mobilePage.locator('div[class*="lg:hidden"] nav').first();
  await bottomNav.waitFor({ state: 'visible', timeout: 15_000 });
  const dailyLedgerLink = bottomNav.getByRole('link', { name: 'Daily Ledger' });
  await dailyLedgerLink.waitFor({ state: 'visible', timeout: 10_000 });
  const bottomNavMetrics = await bottomNav.evaluate((nav) => ({
    navWidth: Math.round(nav.getBoundingClientRect().width),
    contentWidth: nav.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    links: Array.from(nav.querySelectorAll('a')).map((link) => ({
      label: link.textContent?.trim(),
      width: Math.round(link.getBoundingClientRect().width),
      right: Math.round(link.getBoundingClientRect().right),
    })),
  }));
  assert.ok(bottomNavMetrics.contentWidth <= bottomNavMetrics.navWidth + 1, `Mobile bottom nav must not overflow its own container: ${JSON.stringify(bottomNavMetrics)}`);
  assert.ok(bottomNavMetrics.links.every((link) => link.right <= bottomNavMetrics.viewportWidth + 1), `Every bottom-nav link must remain within the viewport: ${JSON.stringify(bottomNavMetrics)}`);

  // Verify the dashboard period control changes its selected state and refetches
  // the matching analytics period, using only a deterministic stub response.
  const quarterButton = mobilePage.getByRole('button', { name: 'Quarter', exact: true });
  await quarterButton.waitFor({ state: 'visible', timeout: 10_000 });
  await quarterButton.click();
  await quarterButton.waitFor({ state: 'visible', timeout: 5_000 });
  await quarterButton.evaluate((button) => {
    if (button.getAttribute('aria-pressed') !== 'true') throw new Error('Quarter control did not become selected');
  });
  const revenueDeadline = Date.now() + 5_000;
  while (!analyticsRequests.some((url) => new URL(url).searchParams.get('period') === 'quarter') && Date.now() < revenueDeadline) {
    await sleep(100);
  }
  assert.ok(analyticsRequests.some((url) => new URL(url).searchParams.get('period') === 'quarter'), `Selecting Quarter must request quarter analytics: ${JSON.stringify(analyticsRequests)}`);
  console.log('DASHBOARD PERIOD CONTROL VERIFIED:', JSON.stringify({ selected: 'quarter', requests: analyticsRequests }));

  await dailyLedgerLink.click();
  await mobilePage.waitForURL((url) => url.pathname === '/daily-ledger', { timeout: 10_000 });
  await mobilePage.getByRole('heading', { name: 'Daily Sales & Expense Book' }).waitFor({ state: 'visible', timeout: 10_000 });
  await mobilePage.screenshot({ path: resolve(outputDir, 'daily-ledger-mobile-screen.png'), fullPage: true });
  const ledgerMobileWidth = await mobilePage.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  assert.ok(ledgerMobileWidth.documentWidth <= ledgerMobileWidth.viewportWidth, `Mobile daily ledger must not overflow horizontally: ${JSON.stringify(ledgerMobileWidth)}`);
  console.log('MOBILE DAILY LEDGER NAV VERIFIED:', JSON.stringify({ bottomNavMetrics, ledgerMobileWidth }));

  // Verify the CSV download through the visible UI. The one-row fixture includes
  // commas and a quote in the customer name to exercise proper escaping.
  await mobilePage.goto(`${baseUrl}/transactions?csv-smoke=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await mobilePage.getByRole('heading', { name: 'Transactions' }).waitFor({ state: 'visible', timeout: 10_000 });
  await mobilePage.getByText('KAI-CSV-001', { exact: true }).waitFor({ state: 'visible', timeout: 10_000 });
  const exportButton = mobilePage.getByRole('button', { name: 'Export CSV' });
  await exportButton.waitFor({ state: 'visible', timeout: 10_000 });
  assert.equal(await exportButton.isEnabled(), true, 'CSV export should be enabled when transaction rows are available');
  const downloadPromise = mobilePage.waitForEvent('download', { timeout: 10_000 });
  await exportButton.click();
  const csvDownload = await downloadPromise;
  assert.match(csvDownload.suggestedFilename(), /^kaira-transactions-\d{4}-\d{2}-\d{2}\.csv$/, 'CSV download should have a dated filename');
  const csvPath = await csvDownload.path();
  assert.ok(csvPath, 'CSV download should have a readable temporary file');
  const csv = await readFile(csvPath, 'utf8');
  assert.ok(csv.startsWith('\uFEFF"Reference","Type","Status","Customer","Amount (GMD)","Date"'), 'CSV should include its UTF-8 BOM and properly quoted column headers');
  assert.ok(csv.includes('KAI-CSV-001'), 'CSV should contain the transaction reference');
  assert.ok(csv.includes('"Test ""CSV"", Customer"'), 'CSV should escape quotes and commas inside customer values');
  assert.ok(csv.includes('123.45'), 'CSV should contain the transaction amount');
  console.log('TRANSACTION CSV EXPORT VERIFIED:', JSON.stringify({ filename: csvDownload.suggestedFilename(), bytes: Buffer.byteLength(csv), referenceIncluded: csv.includes('KAI-CSV-001'), escapedCustomer: csv.includes('"Test ""CSV"", Customer"') }));

  assert.deepEqual(mobileErrors, [], `Authenticated mobile app generated runtime errors: ${mobileErrors.join(' | ')}`);
  await mobileContext.close();

  assert.deepEqual(pageErrors, [], `Browser runtime reported errors: ${pageErrors.join(' | ')}`);
  console.log('LIVE BRANDING SMOKE TEST PASSED: splash logo, splash timing, onboarding logo, desktop login hero, flag, mobile branded banner, and direct-entry splash gate.');
  await context.close();
} finally {
  await browser.close();
}
