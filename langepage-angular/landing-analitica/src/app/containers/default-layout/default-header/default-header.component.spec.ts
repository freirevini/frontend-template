import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  AvatarModule,
  BadgeModule,
  BreadcrumbModule,
  ButtonModule,
  DropdownModule,
  GridModule,
  HeaderModule,
  NavModule, SidebarModule
} from '@coreui/angular';
import { IconModule, IconSetService } from '@coreui/icons-angular';
import { iconSubset } from '../../../icons/icon-subset';
import { DefaultHeaderComponent, MOCK_SOURCES, MockSources, mockSourcesText, toHeaderDate } from './default-header.component';
import { RouterTestingModule } from '@angular/router/testing';

describe('DefaultHeaderComponent', () => {
  let component: DefaultHeaderComponent;
  let fixture: ComponentFixture<DefaultHeaderComponent>;
  let iconSetService: IconSetService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [GridModule, HeaderModule, NavModule, BadgeModule, AvatarModule, DropdownModule, BreadcrumbModule, RouterTestingModule, SidebarModule, ButtonModule, IconModule, DefaultHeaderComponent],
    providers: [IconSetService]
})
      .compileComponents();
  });

  beforeEach(() => {
    iconSetService = TestBed.inject(IconSetService);
    iconSetService.icons = { ...iconSubset };

    fixture = TestBed.createComponent(DefaultHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show only the menu toggler, the date and the theme switcher', () => {
    const el: HTMLElement = fixture.nativeElement;
    const time = el.querySelector('time');
    expect(time?.getAttribute('datetime')).toBe(toHeaderDate(new Date()).iso);
    expect(el.querySelector('[aria-label="Alterar tema"]')).toBeTruthy();
    expect(el.querySelector('c-avatar')).toBeNull();
    expect(el.querySelector('a[cNavLink]')).toBeNull();
    expect(el.querySelector('[name="cilBell"], [name="cilEnvelopeOpen"], [name="cilList"]')).toBeNull();
  });

  it('should format the date in pt-BR', () => {
    const date = toHeaderDate(new Date(2026, 9, 27));
    expect(date.iso).toBe('2026-10-27');
    expect(date.short).toBe('27/10/2026');
    expect(date.long).toBe('terça-feira, 27 de outubro de 2026');
  });

  it('should offer light, dark and auto color modes', () => {
    expect(component.colorModes.map((option) => option.value)).toEqual(['light', 'dark', 'auto']);
  });
});

describe('DefaultHeaderComponent "Dados simulados" badge', () => {
  const render = (sources: MockSources | null): HTMLElement => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, DefaultHeaderComponent],
      providers: [IconSetService, ...(sources ? [{ provide: MOCK_SOURCES, useValue: sources }] : [])]
    });
    TestBed.inject(IconSetService).icons = { ...iconSubset };
    const fixture = TestBed.createComponent(DefaultHeaderComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('shows the badge with a readable explanation when the data blocks use mocks', () => {
    const badge = render({ data: true, chat: true }).querySelector('.brand-mock-badge');
    expect(badge?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Dados simulados: Painéis e chat com dados fictícios, só para demonstração.');
    expect(badge?.querySelector('.visually-hidden')).toBeTruthy();
    expect(badge?.getAttribute('title')).toBe('Painéis e chat com dados fictícios, só para demonstração.');
  });

  it('shows the badge when only the chat is simulated', () => {
    expect(render({ data: false, chat: true }).querySelector('.brand-mock-badge')?.getAttribute('title')).toBe('Chat com agente simulado, só para demonstração.');
  });

  it('has no badge when data and chat are real (and by default)', () => {
    expect(render({ data: false, chat: false }).querySelector('.brand-mock-badge')).toBeNull();
    TestBed.resetTestingModule();
    expect(render(null).querySelector('.brand-mock-badge')).toBeNull();
  });

  it('describes each combination in pt-BR', () => {
    expect(mockSourcesText({ data: true, chat: false })).toBe('Painéis com dados fictícios, só para demonstração.');
    expect(mockSourcesText({ data: false, chat: false })).toBe('');
  });
});
