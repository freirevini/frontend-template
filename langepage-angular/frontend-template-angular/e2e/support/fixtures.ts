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

/** Home of the template: the empty path redirects here, and so does any unknown route (app.routes.ts). */
export const HOME_PATH = '/dashboard';

/** Pages opened by direct URL: address and the breadcrumb title that proves the page rendered. */
export const PAGES = [
  { path: HOME_PATH, title: 'Dashboard' },
  { path: '/base/accordion', title: 'Accordion' }
] as const;
