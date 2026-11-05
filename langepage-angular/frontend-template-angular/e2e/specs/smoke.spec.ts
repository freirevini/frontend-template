import { expect, HOME_PATH, PAGES, test } from '../support/fixtures';

test.describe('clean URLs (no hash routing)', () => {
  for (const target of PAGES) {
    test(`opens ${target.path} directly and after a reload`, async ({ page }) => {
      // Direct load proves the web server falls back to index.html: never a server 404.
      const response = await page.goto(target.path);
      expect(response?.status(), 'HTTP status of the direct load').toBeLessThan(400);
      await expect(page).toHaveURL(new RegExp(`${target.path}$`));
      await expect(page.locator('#sidebar1')).toBeVisible();
      await expect(page.locator('c-breadcrumb-router')).toContainText(target.title);

      const reload = await page.reload();
      expect(reload?.status(), 'HTTP status after F5').toBeLessThan(400);
      await expect(page.locator('c-breadcrumb-router')).toContainText(target.title);
    });
  }

  test('an unknown route goes back to the home page', async ({ page }) => {
    const response = await page.goto('/rota-que-nao-existe');
    expect(response?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(new RegExp(`${HOME_PATH}$`));
    await expect(page.locator('c-breadcrumb-router')).toContainText('Dashboard');
  });
});

test('the theme switch applies dark and light and keeps the choice after a reload', async ({ page }) => {
  await page.goto(HOME_PATH);
  const html = page.locator('html');

  const choose = async (label: string) => {
    await page.getByRole('button', { name: 'Alterar tema' }).click();
    await page.getByRole('button', { name: label, exact: true }).click();
  };

  await choose('Escuro');
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await expect(html).toHaveAttribute('data-coreui-theme', 'dark');

  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'dark');

  await choose('Claro');
  await expect(html).toHaveAttribute('data-theme', 'light');
  await expect(html).toHaveAttribute('data-coreui-theme', 'light');
});
