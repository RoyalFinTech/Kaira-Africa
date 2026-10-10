import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
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
    (response) => response.url().includes('images.unsplash.com/photo-1497366754035-f200968a6e72') && response.status() === 200,
    { timeout: 20_000 },
  );
  await page.goto(`${baseUrl}/login?hero-smoke=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.getByRole('heading', { name: 'Enter your phone number' }).waitFor({ state: 'visible', timeout: 15_000 });
  const heroResponse = await heroResponsePromise;
  assert.equal(heroResponse.status(), 200, 'Business-office hero image must load successfully');
  const heroPanel = page.locator('div[style*="images.unsplash.com/photo-1497366754035-f200968a6e72"]').first();
  const heroStats = await heroPanel.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return { backgroundImage: style.backgroundImage, backgroundSize: style.backgroundSize, backgroundPosition: style.backgroundPosition };
  });
  assert.ok(heroStats.backgroundImage.includes('images.unsplash.com'), `Login hero must use the business background image: ${JSON.stringify(heroStats)}`);
  assert.equal(heroStats.backgroundSize, 'cover', 'Login hero background must cover the whole panel');
  const flag = page.getByRole('img', { name: 'Flag of The Gambia' });
  await flag.waitFor({ state: 'visible', timeout: 10_000 });
  assert.equal(await flag.locator('span').count(), 5, 'Gambia flag must show all five horizontal color bands');
  await page.screenshot({ path: resolve(outputDir, 'login-phone-screen.png'), fullPage: true });
  console.log('LOGIN HERO AND FLAG VERIFIED:', JSON.stringify({ heroStatus: heroResponse.status(), heroStats, flagBands: await flag.locator('span').count() }));

  // A direct open/refresh on /onboarding must return to splash first.
  await page.evaluate(() => sessionStorage.removeItem('kaira_splash_complete'));
  await page.goto(`${baseUrl}/onboarding?direct-entry-smoke=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForURL((url) => url.pathname === '/', { timeout: 10_000 });
  const secondSplash = page.locator('[role="progressbar"][data-splash-started-at]');
  await secondSplash.waitFor({ state: 'visible', timeout: 10_000 });
  await page.waitForURL((url) => url.pathname === '/onboarding', { timeout: 12_000 });
  console.log('DIRECT ONBOARDING ENTRY VERIFIED: direct /onboarding passed through splash before onboarding.');

  assert.deepEqual(pageErrors, [], `Browser runtime reported errors: ${pageErrors.join(' | ')}`);
  console.log('LIVE BRANDING SMOKE TEST PASSED: splash logo, splash timing, onboarding logo, login hero photo, Gambia flag, and direct-entry splash gate.');
  await context.close();
} finally {
  await browser.close();
}
