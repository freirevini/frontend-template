import { expect, PAGES, test } from '../support/fixtures';

test.describe('pages by direct URL', () => {
  for (const target of PAGES) {
    test(`opens ${target.path} directly and after a reload`, async ({ page }) => {
      // Direct load proves the web server falls back to index.html (clean URLs, ADR-023): never a server 404.
      const response = await page.goto(target.path);
      expect(response?.status(), 'HTTP status of the direct load').toBeLessThan(400);
      await expect(page).toHaveURL(new RegExp(`${target.path === '/' ? '/' : target.path}$`));
      await expect(page.locator(target.block).first()).toBeAttached();
      await expect(page.locator('#sidebar')).toBeVisible();
      await expect(page.locator('c-breadcrumb-router')).toContainText(target.title);

      const reload = await page.reload();
      expect(reload?.status(), 'HTTP status after F5').toBeLessThan(400);
      await expect(page.locator(target.block).first()).toBeAttached();
    });
  }

  test('an unknown route goes back to Início', async ({ page }) => {
    const response = await page.goto('/rota-que-nao-existe');
    expect(response?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Início' })).toBeAttached();
  });
});
