import { expect, test as base } from '@playwright/test';

/**
 * Smoke fixture: every test fails if the page throws an uncaught error (a broken bundle or a missing runtime key
 * shows up here before any assertion about content).
 */
export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await use(errors);
      expect(errors, 'uncaught errors in the page').toEqual([]);
    },
    { auto: true }
  ]
});

export { expect };

/** The four routed pages: address, visible title (h1 or breadcrumb) and one block that proves the page rendered. */
export const PAGES = [
  { path: '/', title: 'Início', block: 'h1' },
  { path: '/triagent', title: 'Triagent', block: '#tabela-analitica' },
  { path: '/scalation', title: 'Scalation', block: '#cascata' },
  { path: '/analitico', title: 'Analítico', block: 'h1' }
] as const;
