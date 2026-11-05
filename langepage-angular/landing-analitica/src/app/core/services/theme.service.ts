import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type ColorMode = 'light' | 'dark' | 'auto';
export type AppliedTheme = 'light' | 'dark';

export const COLOR_MODE_STORAGE_KEY = 'landing-analitica.color-mode';
const THEME_ATTRIBUTE = 'data-theme';
// CoreUI 5 components switch their own --cui-* values on this attribute; the brand tokens still win (_theme-dark.scss).
const COREUI_THEME_ATTRIBUTE = 'data-coreui-theme';
// Hook already used by the template's own SCSS (e.g. _examples.scss: `@at-root .dark-theme &`).
const DARK_CLASS = 'dark-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * Light/dark/auto color mode, the single source of the theme (CoreUI's own color-mode service is not used).
 * Sets `data-theme`, CoreUI 5's `data-coreui-theme` and the `dark-theme` class on <html>;
 * colors live in src/scss/_theme-dark.scss.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService implements OnDestroy {
  private readonly modeSubject: BehaviorSubject<ColorMode>;
  private readonly appliedSubject: BehaviorSubject<AppliedTheme>;
  private readonly mediaQuery: MediaQueryList | null;
  private readonly onSystemChange = () => {
    if (this.modeSubject.value === 'auto') {
      this.apply();
    }
  };

  readonly mode$: Observable<ColorMode>;
  readonly appliedTheme$: Observable<AppliedTheme>;

  constructor(@Inject(DOCUMENT) private readonly document: Document) {
    const view = this.document.defaultView;
    this.mediaQuery = view && typeof view.matchMedia === 'function' ? view.matchMedia(DARK_QUERY) : null;
    this.mediaQuery?.addEventListener('change', this.onSystemChange);

    this.modeSubject = new BehaviorSubject<ColorMode>(this.readStoredMode());
    this.appliedSubject = new BehaviorSubject<AppliedTheme>('light');
    this.mode$ = this.modeSubject.asObservable();
    this.appliedTheme$ = this.appliedSubject.asObservable();

    this.apply();
  }

  get mode(): ColorMode {
    return this.modeSubject.value;
  }

  setMode(mode: ColorMode): void {
    this.modeSubject.next(mode);
    this.storeMode(mode);
    this.apply();
  }

  ngOnDestroy(): void {
    this.mediaQuery?.removeEventListener('change', this.onSystemChange);
  }

  private apply(): void {
    const mode = this.modeSubject.value;
    const theme: AppliedTheme = mode === 'auto' ? (this.mediaQuery?.matches ? 'dark' : 'light') : mode;

    const root = this.document.documentElement;
    root.setAttribute(THEME_ATTRIBUTE, theme);
    root.setAttribute(COREUI_THEME_ATTRIBUTE, theme);
    root.classList.toggle(DARK_CLASS, theme === 'dark');
    this.applyChartDefaults();
    this.appliedSubject.next(theme);
  }

  /** Chart.js draws on canvas, so it cannot read CSS directly: copy the theme tokens into its defaults. */
  private applyChartDefaults(): void {
    const view = this.document.defaultView;
    if (!view) {
      return;
    }
    const styles = view.getComputedStyle(this.document.documentElement);
    const token = (name: string) => styles.getPropertyValue(name).trim();
    const text = token('--app-chart-color');
    const grid = token('--app-chart-grid-color');
    const fontFamily = token('--app-chart-font-family');
    const tooltipBg = token('--app-chart-tooltip-bg');
    const tooltipColor = token('--app-chart-tooltip-color');
    // Dynamic import keeps chart.js out of the initial bundle (it stays in the lazy chart chunk).
    import('chart.js')
      .then(({ Chart, registerables }) => {
        // Idempotent: guarantees the tooltip plugin (and its defaults scope) exists before we write to it.
        Chart.register(...registerables);
        if (text) {
          Chart.defaults.color = text;
        }
        if (grid) {
          Chart.defaults.borderColor = grid;
        }
        if (fontFamily) {
          Chart.defaults.font.family = fontFamily;
        }
        const tooltip = Chart.defaults.plugins.tooltip;
        if (tooltipBg) {
          tooltip.backgroundColor = tooltipBg;
        }
        if (tooltipColor) {
          tooltip.titleColor = tooltipColor;
          tooltip.bodyColor = tooltipColor;
          tooltip.footerColor = tooltipColor;
        }
        tooltip.padding = 10;
        tooltip.cornerRadius = 8;
        tooltip.titleFont = { weight: 600 };
        Object.values(Chart.instances).forEach((chart) => chart.update('none'));
      })
      .catch(() => undefined);
  }

  private readStoredMode(): ColorMode {
    try {
      const stored = this.document.defaultView?.localStorage.getItem(COLOR_MODE_STORAGE_KEY);
      return stored === 'dark' || stored === 'auto' || stored === 'light' ? stored : 'light';
    } catch {
      return 'light';
    }
  }

  private storeMode(mode: ColorMode): void {
    try {
      this.document.defaultView?.localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode);
    } catch {
      // Storage unavailable (private mode, blocked site data): keep the mode for this session only.
    }
  }
}
