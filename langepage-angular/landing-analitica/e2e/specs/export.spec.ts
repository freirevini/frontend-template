import { expect, test } from '../support/fixtures';

test('Exportar Excel in Tabela Analítica downloads an .xlsx file', async ({ page }) => {
  await page.goto('/triagent#tabela-analitica');
  const section = page.locator('#tabela-analitica');
  const button = section.getByRole('button', { name: /Exportar Excel/ });
  await expect(button).toBeEnabled();

  const [download] = await Promise.all([page.waitForEvent('download'), button.click()]);

  expect(download.suggestedFilename()).toMatch(/^tabela-analitica-.*\.xlsx$/);
  const path = await download.path();
  expect(path, 'downloaded file saved by the browser').toBeTruthy();
});
