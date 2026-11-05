import { Component, InjectionToken, inject } from '@angular/core';
import { FooterComponent } from '@coreui/angular';

import { FooterEntity } from '../../../core/config/runtime-config.service';

// The type lives with the runtime config that carries it; re-exported so the footer keeps its public API.
export type { FooterEntity } from '../../../core/config/runtime-config.service';

/**
 * Legal entities listed in the footer. Legal data never lives in versioned files: app.config.ts provides
 * `footerEntities` from the runtime configuration (assets/env.json, filled per environment). Empty list: no legal block.
 */
export const FOOTER_ENTITIES = new InjectionToken<readonly FooterEntity[]>('FOOTER_ENTITIES', {
  providedIn: 'root',
  factory: () => []
});

@Component({
    selector: 'app-default-footer',
    templateUrl: './default-footer.component.html',
    styleUrls: ['./default-footer.component.scss'],
    imports: [],
})
export class DefaultFooterComponent extends FooterComponent {
  readonly currentYear = new Date().getFullYear();
  readonly companies = inject(FOOTER_ENTITIES);

  constructor() {
    super();
  }
}
