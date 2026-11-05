import { expect, test } from '../support/fixtures';

// The smoke always talks to the simulated agent: the environment's env.json is served with chatMock forced on, so the
// test does not depend on the BFF or the orchestrator being up (they have their own tests in Phase 9).
test.beforeEach(async ({ page }) => {
  await page.route(/\/assets\/env\.json(\?.*)?$/, async (route) => {
    const response = await route.fetch();
    const config = response.ok() ? await response.json() : {};
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...config, chatMock: true }) });
  });
});

test('the chat opens and the simulated agent answers a question', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Abrir Agente da Agenda' }).click();

  const panel = page.getByRole('dialog', { name: 'Agente da Agenda' });
  await expect(panel).toBeVisible();
  const log = panel.getByRole('log');
  const aiMessages = log.locator('.chat-msg--ai');
  await expect(aiMessages.first()).toBeVisible();

  await panel.getByRole('button', { name: 'Consultar uma norma' }).click();
  const box = panel.getByRole('textbox');
  await expect(box).toBeVisible();
  const before = await aiMessages.count();

  await box.fill('Qual o prazo da resolução?');
  await panel.getByRole('button', { name: 'Enviar' }).click();

  await expect(log.locator('.chat-msg--user').last()).toContainText('Qual o prazo da resolução?');
  await expect.poll(() => aiMessages.count(), { timeout: 20_000 }).toBeGreaterThan(before);
  await expect(aiMessages.last().locator('.chat-msg__text')).not.toBeEmpty();
});
