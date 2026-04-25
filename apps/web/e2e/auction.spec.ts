import { test, expect } from '@playwright/test';

test.describe('Auction journey (5B)', () => {
  test('settings page exposes 1-tap bidding scope and durations', async ({ page }) => {
    await page.goto('/settings/sessions');
    await expect(page.getByRole('heading', { name: /sessions/i })).toBeVisible();
    await expect(page.getByText('::auction::place_bid')).toBeVisible();
    await expect(page.getByTestId('duration-3600')).toBeVisible();
    await expect(page.getByTestId('duration-14400')).toBeVisible();
    await expect(page.getByTestId('duration-86400')).toBeVisible();
  });

  test('default duration starts at 1 hour', async ({ page }) => {
    await page.goto('/settings/sessions');
    const oneHour = page.getByTestId('duration-3600');
    await expect(oneHour).toHaveClass(/bg-ink/);
  });

  test('changing duration updates selection', async ({ page }) => {
    await page.goto('/settings/sessions');
    await page.getByTestId('duration-86400').click();
    await expect(page.getByTestId('duration-86400')).toHaveClass(/bg-ink/);
    await expect(page.getByTestId('duration-3600')).not.toHaveClass(/bg-ink/);
  });

  test('disabled status shown when no session', async ({ page }) => {
    await page.goto('/settings/sessions');
    await expect(page.getByTestId('autosign-status')).toContainText(/disabled/i);
  });
});
