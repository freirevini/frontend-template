import { Location, PlatformLocation, ViewportScroller } from '@angular/common';
import { MOCK_PLATFORM_LOCATION_CONFIG, MockPlatformLocation } from '@angular/common/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationInitStatus, ApplicationRef, Component, CUSTOM_ELEMENTS_SCHEMA, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { IconSetService } from '@coreui/icons-angular';
import { filter, firstValueFrom } from 'rxjs';

import { appConfig } from './app.config';
import { ChatWidgetComponent } from './chat/chat-widget/chat-widget.component';
import { DefaultHeaderComponent } from './containers/default-layout/default-header/default-header.component';
import { DefaultLayoutComponent } from './containers/default-layout/default-layout.component';
import { RUNTIME_CONFIG_URL } from './core/config/runtime-config.service';
import { iconSubset } from './icons/icon-subset';

/** Root with an outlet: pages and the layout render. */
@Component({ selector: 'app-routing-test-root', template: '<router-outlet />', imports: [RouterOutlet] })
class OutletRoot {}

/** Root without an outlet: the router resolves and scrolls, but no page renders (keeps chart pages out of the test). */
@Component({ selector: 'app-routing-test-root', template: '' })
class BareRoot {}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Boots the real appConfig (router, runtime config initializer, scrolling) as if the browser had opened `startUrl`
 * directly: the address comes from a mock platform location, so a clean URL and a hash URL give different results.
 */
async function bootAt(startUrl: string, root: Type<unknown>) {
  TestBed.configureTestingModule({
    providers: [
      ...appConfig.providers,
      provideHttpClientTesting(),
      { provide: MOCK_PLATFORM_LOCATION_CONFIG, useValue: { startUrl: `http://localhost${startUrl}`, appBaseHref: '/' } },
      { provide: PlatformLocation, useClass: MockPlatformLocation }
    ]
  }).overrideComponent(DefaultLayoutComponent, {
    remove: { imports: [ChatWidgetComponent, DefaultHeaderComponent] },
    add: { schemas: [CUSTOM_ELEMENTS_SCHEMA] }
  });
  // AppComponent registers the icons at bootstrap; these test roots do the same.
  TestBed.inject(IconSetService).icons = { ...iconSubset };
  const anchorScroll = spyOn(TestBed.inject(ViewportScroller), 'scrollToAnchor');
  const router = TestBed.inject(Router);
  const navigated = firstValueFrom(router.events.pipe(filter((event) => event instanceof NavigationEnd)));
  // The runtime config initializer waits for assets/env.json; the page data requests stay pending (not under test).
  TestBed.inject(HttpTestingController).expectOne(RUNTIME_CONFIG_URL).flush({ apiBase: '/api' });
  await TestBed.inject(ApplicationInitStatus).donePromise;
  const host = document.createElement('app-routing-test-root');
  document.body.appendChild(host);
  TestBed.inject(ApplicationRef).bootstrap(root, host);
  await navigated;
  await wait(0);
  return { router, location: TestBed.inject(Location), anchorScroll, host };
}

describe('Routing with clean URLs (no hash)', () => {
  let host: HTMLElement | undefined;

  afterEach(() => host?.remove());

  it('opens a page from its clean URL typed in the address bar', async () => {
    const boot = await bootAt('/analitico', OutletRoot);
    host = boot.host;
    expect(boot.router.url).toBe('/analitico');
    expect(boot.location.path()).toBe('/analitico');
    expect(host.querySelector('h1')?.textContent?.trim()).toBe('Analítico');
  });

  it('scrolls to the section named by the fragment of a clean URL', async () => {
    const boot = await bootAt('/triagent#tabela-analitica', BareRoot);
    host = boot.host;
    expect(boot.router.url).toBe('/triagent#tabela-analitica');
    expect(boot.anchorScroll).toHaveBeenCalledWith('tabela-analitica');
  });

  it('sends an unknown address back to Início', async () => {
    const boot = await bootAt('/pagina-que-nao-existe', BareRoot);
    host = boot.host;
    expect(boot.router.url).toBe('/');
  });

  it('keeps the old /dashboard address working', async () => {
    const boot = await bootAt('/dashboard', BareRoot);
    host = boot.host;
    expect(boot.router.url).toBe('/triagent');
  });

  it('renders sidebar sub-items as path URLs with a fragment, never "#/"', async () => {
    const boot = await bootAt('/analitico', OutletRoot);
    host = boot.host;
    const hrefs = Array.from(host.querySelectorAll<HTMLAnchorElement>('c-sidebar-nav a[href]')).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/triagent#tabela-analitica');
    expect(hrefs).toContain('/scalation#cascata');
    expect(hrefs).toContain('/analitico');
    expect(hrefs.filter((href) => href?.includes('#/'))).toEqual([]);
  });

  it('opens the sidebar group of a section link opened directly (E-006)', async () => {
    const boot = await bootAt('/scalation#cascata', OutletRoot);
    host = boot.host;
    await wait(400);
    const active = host.querySelector<HTMLAnchorElement>('c-sidebar-nav .nav-group-items a.active');
    expect(active?.getAttribute('href')).toBe('/scalation#cascata');
    const group = active?.closest<HTMLElement>('.nav-group');
    const items = group?.querySelector<HTMLElement>(':scope > .nav-group-items');
    expect(group?.classList.contains('show') || (items?.offsetHeight ?? 0) > 0).withContext('Scalation group open').toBeTrue();
  });
});
