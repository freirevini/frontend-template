import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';

import { COLOR_MODE_STORAGE_KEY, ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let html: HTMLElement;

  beforeEach(() => {
    localStorage.removeItem(COLOR_MODE_STORAGE_KEY);
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
    html = TestBed.inject(DOCUMENT).documentElement;
  });

  afterEach(() => {
    localStorage.removeItem(COLOR_MODE_STORAGE_KEY);
    html.removeAttribute('data-theme');
    html.removeAttribute('data-coreui-theme');
    html.classList.remove('dark-theme');
  });

  it('defaults to light mode', () => {
    expect(service.mode).toBe('light');
    expect(html.getAttribute('data-theme')).toBe('light');
    expect(html.classList.contains('dark-theme')).toBeFalse();
  });

  it('applies and persists dark mode', () => {
    service.setMode('dark');
    expect(html.getAttribute('data-theme')).toBe('dark');
    expect(html.classList.contains('dark-theme')).toBeTrue();
    expect(localStorage.getItem(COLOR_MODE_STORAGE_KEY)).toBe('dark');
  });

  it('follows the system preference in auto mode', () => {
    service.setMode('auto');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    expect(html.getAttribute('data-theme')).toBe(systemDark ? 'dark' : 'light');
  });

  it('mirrors the applied theme on data-coreui-theme for CoreUI 5 components', () => {
    expect(html.getAttribute('data-coreui-theme')).toBe('light');
    service.setMode('dark');
    expect(html.getAttribute('data-coreui-theme')).toBe('dark');
    service.setMode('light');
    expect(html.getAttribute('data-coreui-theme')).toBe('light');
  });

  it('emits the applied theme', () => {
    const applied: string[] = [];
    const sub = service.appliedTheme$.subscribe((theme) => applied.push(theme));
    service.setMode('dark');
    service.setMode('light');
    sub.unsubscribe();
    expect(applied).toEqual(['light', 'dark', 'light']);
  });
});
