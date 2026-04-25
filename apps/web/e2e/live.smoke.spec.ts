import { test, expect } from '@playwright/test';

// Post-deploy smoke: minimum bar to keep the live deployment promoted.
// If any of these fails, post-deploy-smoke.yml triggers Vercel to roll back.

test.describe('Live smoke', () => {
  test('home loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/provenance/i);
    await expect(page.getByRole('heading', { name: /royalties enforced/i })).toBeVisible();
  });

  test('status page reachable', async ({ page }) => {
    await page.goto('/status');
    await expect(page.getByRole('heading', { name: /system status/i })).toBeVisible();
  });

  test('settings/sessions reachable', async ({ page }) => {
    await page.goto('/settings/sessions');
    await expect(page.getByRole('heading', { name: /sessions/i })).toBeVisible();
  });

  test('/api/health responds', async ({ request }) => {
    const r = await request.get('/api/health');
    expect(r.ok()).toBe(true);
    const body = await r.json();
    expect(body).toHaveProperty('chainHealthy');
    expect(body).toHaveProperty('blockHeight');
  });
});
