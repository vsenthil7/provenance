import { test, expect } from '@playwright/test';

test.describe('Wallet connect', () => {
  test('home renders and Connect CTA is present', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /royalties enforced/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /connect wallet/i })).toBeVisible();
  });

  test('Connect button is clickable (no console errors)', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

    await page.goto('/');
    await page.getByRole('button', { name: /connect wallet/i }).click();
    // We can't drive the InterwovenKit modal without a wallet extension in CI;
    // success is "no JS error and the click handler ran".
    await page.waitForTimeout(500);

    // Filter out known dev-only/source-map errors so this stays signal.
    const real = errors.filter(
      (e) => !/sourcemap|favicon|font|manifest|chrome-extension/i.test(e),
    );
    expect(real, real.join('\n')).toEqual([]);
  });
});
