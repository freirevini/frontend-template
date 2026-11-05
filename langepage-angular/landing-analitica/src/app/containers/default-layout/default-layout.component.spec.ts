import { CUSTOM_ELEMENTS_SCHEMA, importProvidersFrom } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { DropdownModule, SidebarModule } from '@coreui/angular';
import { IconSetService } from '@coreui/icons-angular';

import { ChatWidgetComponent } from '../../chat/chat-widget/chat-widget.component';
import { DefaultHeaderComponent } from './default-header/default-header.component';
import { DefaultLayoutComponent, openActiveGroup } from './default-layout.component';

// brand chrome uses conventional names (brand-*) and the footer shows no versioned legal data.
describe('DefaultLayoutComponent brand and footer', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DefaultLayoutComponent],
      providers: [
        provideRouter([]), provideHttpClient(), provideNoopAnimations(), IconSetService,
        // Same CoreUI services as app.config.ts (sidebar navigation helper, dropdowns).
        importProvidersFrom(SidebarModule, DropdownModule)
      ]
    })
      .overrideComponent(DefaultLayoutComponent, {
        remove: { imports: [ChatWidgetComponent, DefaultHeaderComponent] },
        add: { schemas: [CUSTOM_ELEMENTS_SCHEMA] }
      })
      .compileComponents();
  });

  it('renders the sidebar brand lockup with the neutral mark file and the product name', () => {
    const fixture = TestBed.createComponent(DefaultLayoutComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const lockup = root.querySelector('c-sidebar-brand a.brand-lockup') as HTMLAnchorElement;
    expect(lockup).withContext('a.brand-lockup').not.toBeNull();
    expect(lockup.getAttribute('aria-label')).toBe('Agenda Normativa, ir para o início');
    expect(lockup.querySelector('img.brand-mark')?.getAttribute('src')).toBe('assets/img/brand/brand-mark-white.svg');
    expect((lockup.querySelector('.brand-name')?.textContent ?? '').replace(/\s+/g, ' ').trim()).toBe('Agenda Normativa');
  });

  it('renders the footer with logo and copyright, without legal data by default', () => {
    const fixture = TestBed.createComponent(DefaultLayoutComponent);
    fixture.detectChanges();
    const footer = (fixture.nativeElement as HTMLElement).querySelector('app-default-footer') as HTMLElement;
    expect(footer).withContext('app-default-footer').not.toBeNull();
    expect(footer.querySelector('img.footer-logo')?.getAttribute('alt')).toBe('Logotipo da instituição');
    expect(footer.textContent).toContain('todos os direitos reservados');
    expect(footer.textContent).not.toContain('CNPJ');
  });
});

describe('openActiveGroup', () => {
  function group(open: boolean, active: boolean) {
    const element = document.createElement('div');
    element.className = open ? 'nav-group show' : 'nav-group';
    element.innerHTML = `<a class="nav-group-toggle" href="#"></a><div class="nav-group-items"><a class="${active ? 'active' : ''}"></a></div>`;
    const toggle = element.querySelector('.nav-group-toggle') as HTMLElement;
    const click = spyOn(toggle, 'click');
    return { element, click };
  }

  it('opens only the closed group that holds the active link', () => {
    const root = document.createElement('div');
    const closedActive = group(false, true);
    const closedIdle = group(false, false);
    const openActive = group(true, true);
    root.append(closedActive.element, closedIdle.element, openActive.element);
    openActiveGroup(root);
    expect(closedActive.click).toHaveBeenCalledTimes(1);
    expect(closedIdle.click).not.toHaveBeenCalled();
    expect(openActive.click).not.toHaveBeenCalled();
  });

  // CoreUI 5: routerLinkActive on c-sidebar-nav-group strips the "show" class, so an open group may lack it (E-006).
  it('does not toggle a group whose items are visible even without the "show" class', () => {
    const root = document.createElement('div');
    document.body.append(root);
    const openWithoutClass = group(false, true);
    (openWithoutClass.element.querySelector('.nav-group-items') as HTMLElement).style.height = '40px';
    root.append(openWithoutClass.element);
    openActiveGroup(root);
    expect(openWithoutClass.click).not.toHaveBeenCalled();
    root.remove();
  });
});
