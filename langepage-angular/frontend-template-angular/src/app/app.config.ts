import { ApplicationConfig, importProvidersFrom, inject, provideAppInitializer } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {
  provideRouter,
  withEnabledBlockingInitialNavigation,
  withInMemoryScrolling,
  withRouterConfig,
  withViewTransitions
} from '@angular/router';

import { DropdownModule, SidebarModule } from '@coreui/angular';
import { IconSetService } from '@coreui/icons-angular';
import { routes } from './app.routes';
import { RuntimeConfigService } from './core/config/runtime-config.service';
import { provideAppHttpClient } from './core/http/api-error.interceptor';
import { MOCK_SOURCES } from './layout/default-layout/default-header/default-header.component';

export const appConfig: ApplicationConfig = {
  providers: [
    // Clean path URLs (PathLocationStrategy, the default): hash routing is not accepted by the corporate standard
    // (ADR-005). The web server answers every unknown path with index.html (nginx/default.conf: try_files).
    // The URL fragment is only an anchor: /base/accordion#secao opens the page and scrolls to the element.
    provideRouter(routes,
      withRouterConfig({
        onSameUrlNavigation: 'reload'
      }),
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled'
      }),
      withEnabledBlockingInitialNavigation(),
      withViewTransitions()
    ),
    // Per-environment settings (assets/env.json) are read before bootstrap; on failure the safe defaults apply.
    provideAppInitializer(() => inject(RuntimeConfigService).load()),
    // BFF failures become ApiProblem (pt-BR text by status, never the server message); 401 sends the user to
    // loginUrl once; CSRF cookie XSRF-TOKEN → header X-XSRF-TOKEN on POST/PUT/PATCH/DELETE (docs/contratos-de-dados.md).
    provideAppHttpClient(),
    importProvidersFrom(SidebarModule, DropdownModule),
    IconSetService,
    provideAnimationsAsync(),
    // "Dados simulados" badge in the header whenever dataMock is on.
    { provide: MOCK_SOURCES, useFactory: () => ({ data: inject(RuntimeConfigService).config.dataMock }) }
  ]
};
