import { expect, test } from '../support/fixtures';

test('the theme switch applies dark and light and keeps the choice after a reload', async ({ page }) => {
  await page.goto('/');
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
