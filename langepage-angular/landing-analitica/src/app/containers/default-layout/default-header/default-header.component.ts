import { Component, InjectionToken, Input, inject } from '@angular/core';
import { Observable, interval } from 'rxjs';
import { distinctUntilChanged, map, startWith } from 'rxjs/operators';

import { ClassToggleService, HeaderComponent, ContainerComponent, HeaderTogglerDirective, SidebarToggleDirective, HeaderNavComponent, NavItemComponent, HeaderDividerComponent, BreadcrumbRouterComponent, DropdownComponent, ButtonDirective, DropdownToggleDirective, DropdownMenuDirective, DropdownHeaderDirective, DropdownItemDirective } from '@coreui/angular';

import { ColorMode, ThemeService } from '../../../core/services/theme.service';
import { IconDirective } from '@coreui/icons-angular';
import { NgTemplateOutlet, AsyncPipe } from '@angular/common';

interface ColorModeOption {
  value: ColorMode;
  label: string;
  icon: string;
}

export interface HeaderDate {
  /** Local date as yyyy-MM-dd, for the <time datetime> attribute. */
  iso: string;
  /** e.g. "terça-feira, 27 de outubro de 2026" */
  long: string;
  /** e.g. "27/10/2026", used on small screens. */
  short: string;
}

/** Which parts run on fictional data (runtime config `dataMock` / `chatMock`); app.config.ts fills it. */
export interface MockSources {
  data: boolean;
  chat: boolean;
}

export const MOCK_SOURCES = new InjectionToken<MockSources>('MOCK_SOURCES', {
  providedIn: 'root',
  factory: () => ({ data: false, chat: false })
});

/** Explanation of the "Dados simulados" badge (title and screen reader), or '' when everything is real. */
export function mockSourcesText({ data, chat }: MockSources): string {
  if (data && chat) {
    return 'Painéis e chat com dados fictícios, só para demonstração.';
  }
  if (data) {
    return 'Painéis com dados fictícios, só para demonstração.';
  }
  return chat ? 'Chat com agente simulado, só para demonstração.' : '';
}

const LONG_DATE = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const SHORT_DATE = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const DATE_REFRESH_MS = 60_000;

export function toHeaderDate(date: Date): HeaderDate {
  const pad = (value: number) => String(value).padStart(2, '0');
  return {
    iso: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    long: LONG_DATE.format(date),
    short: SHORT_DATE.format(date)
  };
}

@Component({
    selector: 'app-default-header',
    templateUrl: './default-header.component.html',
    styleUrls: ['./default-header.component.scss'],
    imports: [
    ContainerComponent,
    HeaderTogglerDirective,
    SidebarToggleDirective,
    IconDirective,
    HeaderNavComponent,
    NavItemComponent,
    NgTemplateOutlet,
    HeaderDividerComponent,
    BreadcrumbRouterComponent,
    DropdownComponent,
    ButtonDirective,
    DropdownToggleDirective,
    DropdownMenuDirective,
    DropdownHeaderDirective,
    DropdownItemDirective,
    AsyncPipe
],
})
export class DefaultHeaderComponent extends HeaderComponent {

  @Input() sidebarId: string = "sidebar";

  readonly colorModes: ColorModeOption[] = [
    { value: 'light', label: 'Claro', icon: 'cilSun' },
    { value: 'dark', label: 'Escuro', icon: 'cilMoon' },
    { value: 'auto', label: 'Automático', icon: 'cilContrast' }
  ];

  readonly colorMode$ = this.themeService.mode$;

  /** Shown as the "Dados simulados" badge whenever a mock is on, so fictional numbers are never taken for real ones. */
  readonly mockNotice = mockSourcesText(inject(MOCK_SOURCES));

  /** Re-checked every minute so the date rolls over at midnight; the async pipe unsubscribes. */
  readonly today$: Observable<HeaderDate> = interval(DATE_REFRESH_MS).pipe(
    startWith(0),
    map(() => toHeaderDate(new Date())),
    distinctUntilChanged((previous, current) => previous.iso === current.iso)
  );

  constructor(private classToggler: ClassToggleService, private themeService: ThemeService) {
    super();
  }

  setColorMode(mode: ColorMode): void {
    this.themeService.setMode(mode);
  }

  iconFor(mode: ColorMode | null): string {
    return this.colorModes.find((option) => option.value === mode)?.icon ?? 'cilSun';
  }
}
