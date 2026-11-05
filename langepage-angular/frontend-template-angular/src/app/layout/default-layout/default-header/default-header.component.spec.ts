import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import {
  AvatarModule,
  BadgeModule,
  BreadcrumbModule,
  ButtonGroupModule,
  DropdownModule,
  GridModule,
  HeaderModule,
  NavModule,
  ProgressModule,
  SidebarModule
} from '@coreui/angular';
import { IconModule, IconSetService } from '@coreui/icons-angular';
import { iconSubset } from '../../../icons/icon-subset';
import { DefaultHeaderComponent, MOCK_SOURCES, MockSources, mockSourcesText } from './default-header.component';

describe('DefaultHeaderComponent', () => {
  let component: DefaultHeaderComponent;
  let fixture: ComponentFixture<DefaultHeaderComponent>;
  let iconSetService: IconSetService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [GridModule, HeaderModule, IconModule, NavModule, BadgeModule, AvatarModule, DropdownModule, BreadcrumbModule, SidebarModule, ProgressModule, ButtonGroupModule, ReactiveFormsModule, DefaultHeaderComponent],
    providers: [IconSetService, provideRouter([])]
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

  it('should offer light, dark and auto color modes', () => {
    expect(component.colorModes.map((option) => option.name)).toEqual(['light', 'dark', 'auto']);
  });
});

describe('DefaultHeaderComponent "Dados simulados" badge', () => {
  const render = (sources: MockSources | null): HTMLElement => {
    TestBed.configureTestingModule({
      imports: [DefaultHeaderComponent],
      providers: [IconSetService, provideRouter([]), ...(sources ? [{ provide: MOCK_SOURCES, useValue: sources }] : [])]
    });
    TestBed.inject(IconSetService).icons = { ...iconSubset };
    const fixture = TestBed.createComponent(DefaultHeaderComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('shows the badge with a readable explanation when the data blocks use mocks', () => {
    const badge = render({ data: true }).querySelector('.app-mock-badge');
    expect(badge?.textContent).toContain('Dados simulados');
    expect(badge?.getAttribute('title')).toBe('Painéis com dados fictícios, só para demonstração.');
    expect(badge?.querySelector('.visually-hidden')?.textContent).toContain('dados fictícios');
  });

  it('hides the badge when the data is real', () => {
    expect(render({ data: false }).querySelector('.app-mock-badge')).toBeNull();
  });

  it('defaults to no badge without a MOCK_SOURCES provider', () => {
    expect(render(null).querySelector('.app-mock-badge')).toBeNull();
    expect(mockSourcesText({ data: false })).toBe('');
  });
});
