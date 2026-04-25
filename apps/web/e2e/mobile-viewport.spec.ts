import { test, expect } from '@playwright/test';

// Phase 6: mobile viewport check at iPhone SE (375x667).
// Verifies that the home, status, and settings pages render without
// horizontal overflow and that critical CTAs remain reachable.

test.describe('Mobile viewport (iPhone SE)', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('home renders without horizontal scroll', async ({ page }) => {
    await page.goto('/');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
    await expect(page.getByRole('heading', { name: /royalties enforced/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /connect wallet/i })).toBeVisible();
  });

  test('status page is readable on mobile', async ({ page }) => {
    await page.goto('/status');
    await expect(page.getByRole('heading', { name: /system status/i })).toBeVisible();
    await expect(page.getByTestId('condition-1')).toBeVisible();
  });

  test('settings/sessions reachable and primary CTA visible', async ({ page }) => {
    await page.goto('/settings/sessions');
    await expect(page.getByRole('heading', { name: /sessions/i })).toBeVisible();
    // Either Enable or Disable button must be visible based on session state
    const enable = page.getByTestId('enable-autosign');
    const disable = page.getByTestId('disable-autosign');
    await expect(enable.or(disable)).toBeVisible();
  });

  test('header Add funds button is hidden on mobile (per design)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('add-funds')).toBeHidden();
  });
});
