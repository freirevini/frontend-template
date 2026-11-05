import { registerLocaleData, ViewportScroller } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import {
  ApplicationConfig,
  DEFAULT_CURRENCY_CODE,
  LOCALE_ID,
  importProvidersFrom,
  inject,
  provideAppInitializer
} from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, withEnabledBlockingInitialNavigation, withInMemoryScrolling } from '@angular/router';
import { DropdownModule, SidebarModule } from '@coreui/angular';
import { IconSetService } from '@coreui/icons-angular';

import { routes } from './app.routes';
import { FOOTER_ENTITIES } from './containers/default-layout/default-footer/default-footer.component';
import { MOCK_SOURCES } from './containers/default-layout/default-header/default-header.component';
import { RuntimeConfigService } from './core/config/runtime-config.service';
import { provideAppHttpClient } from './core/http/api-error.interceptor';
import { stickyHeaderOffset } from './core/navigation/section-scroll';

// pt-BR is the official project language (rule R12): date, number and currency pipes use it.
registerLocaleData(localePt, 'pt-BR');

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      // Clean path URLs (PathLocationStrategy, the default): hash routing is not accepted by the corporate standard
      // (ADR-023). The web server answers every unknown path with index.html (nginx/default.conf: try_files).
      // The URL fragment is only an anchor: /triagent#tabela-analitica opens the page and scrolls to the section.
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
      withEnabledBlockingInitialNavigation()
    ),
    // Per-environment settings (assets/env.json) are read before bootstrap; on failure the safe defaults apply.
    provideAppInitializer(() => inject(RuntimeConfigService).load()),
    // Sections opened from the sidebar (#fragment) stop below the sticky header.
    provideAppInitializer(() => inject(ViewportScroller).setOffset(() => [0, stickyHeaderOffset()])),
    // BFF failures become ApiProblem (pt-BR text by status, never the server message); 401 sends the user to
    // loginUrl once; CSRF cookie XSRF-TOKEN → header X-XSRF-TOKEN on POST/PUT/PATCH/DELETE (contratos-de-dados §8).
    provideAppHttpClient(),
    provideAnimations(),
    // Services of the CoreUI sidebar and dropdowns (SidebarService, DropdownService).
    importProvidersFrom(SidebarModule, DropdownModule),
    IconSetService,
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' },
    // Footer legal entities: never versioned; each environment fills footerEntities in assets/env.json.
    { provide: FOOTER_ENTITIES, useFactory: () => inject(RuntimeConfigService).config.footerEntities },
    // "Dados simulados" badge in the header whenever dataMock or chatMock is on.
    {
      provide: MOCK_SOURCES,
      useFactory: () => {
        const { dataMock, chatMock } = inject(RuntimeConfigService).config;
        return { data: dataMock, chat: chatMock };
      }
    }
  ]
};
