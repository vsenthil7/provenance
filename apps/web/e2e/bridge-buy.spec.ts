import { test, expect } from '@playwright/test';

test.describe('Bridge-to-buy journey (5D)', () => {
  test('Add funds button visible on home (when md viewport)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await expect(page.getByTestId('add-funds')).toBeVisible();
  });

  test('Add funds is hidden on small viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.getByTestId('add-funds')).toBeHidden();
  });
});
