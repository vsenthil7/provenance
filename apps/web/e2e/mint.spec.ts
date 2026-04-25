import { test, expect } from '@playwright/test';

test.describe('Mint journey (5A)', () => {
  test('create-collection page renders form', async ({ page }) => {
    await page.goto('/create/collection');
    await expect(page.getByRole('heading', { name: /new collection/i })).toBeVisible();
    await expect(page.getByTestId('col-name')).toBeVisible();
    await expect(page.getByTestId('col-symbol')).toBeVisible();
    await expect(page.getByTestId('col-royalty')).toBeVisible();
    await expect(page.getByTestId('col-submit')).toBeDisabled();
  });

  test('submit button enables once required fields are filled', async ({ page }) => {
    await page.goto('/create/collection');
    await page.getByTestId('col-name').fill('Quiet Series');
    await page.getByTestId('col-symbol').fill('QUIET');
    await page.getByTestId('col-uri').fill('ipfs://bafy.../manifest.json');
    await expect(page.getByTestId('col-submit')).toBeEnabled();
  });

  test('royalty cap is enforced at 1000 bps', async ({ page }) => {
    await page.goto('/create/collection');
    await page.getByTestId('col-royalty').fill('1500');
    await page.getByTestId('col-name').fill('X');
    await page.getByTestId('col-symbol').fill('X');
    await page.getByTestId('col-uri').fill('ipfs://x');
    await page.getByTestId('col-submit').click();
    await expect(page.getByText(/cannot exceed 10%/i)).toBeVisible();
  });

  test('create-artwork page renders form', async ({ page }) => {
    await page.goto('/create/artwork');
    await expect(page.getByRole('heading', { name: /new artwork/i })).toBeVisible();
    await expect(page.getByTestId('art-col-addr')).toBeVisible();
    await expect(page.getByTestId('art-title')).toBeVisible();
    await expect(page.getByTestId('art-file')).toBeVisible();
  });
});
