import { expect, test } from '../support/fixtures';

test('a sidebar sub-item opens its section and keeps the group open', async ({ page }) => {
  await page.goto('/');
  const sidebar = page.locator('#sidebar');

  await sidebar.locator('.nav-group-toggle', { hasText: 'Triagent' }).click();
  const item = sidebar.getByRole('link', { name: 'Tabela Analítica' });
  await item.click();

  await expect(page).toHaveURL(/\/triagent#tabela-analitica$/);
  await expect(page.locator('#tabela-analitica')).toBeInViewport();
  // Regression of .rules/erros.md E-006: the CoreUI 5 group must not close when a sub-item is clicked.
  await expect(item).toBeVisible();
});
