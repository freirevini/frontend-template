import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DefaultFooterComponent, FOOTER_ENTITIES, FooterEntity } from './default-footer.component';

describe('DefaultFooterComponent', () => {
  let component: DefaultFooterComponent;
  let fixture: ComponentFixture<DefaultFooterComponent>;
  const root = () => fixture.nativeElement as HTMLElement;
  const text = () => (root().textContent ?? '').replace(/\s+/g, ' ').trim();

  const setup = async (entities?: readonly FooterEntity[]) => {
    await TestBed.configureTestingModule({
      imports: [DefaultFooterComponent],
      providers: entities ? [{ provide: FOOTER_ENTITIES, useValue: entities }] : []
    }).compileComponents();
    fixture = TestBed.createComponent(DefaultFooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  describe('with the default (empty) entity list', () => {
    beforeEach(() => setup());

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('shows the institution logo with an accessible name', () => {
      const logo = root().querySelector('img.footer-logo') as HTMLImageElement;
      expect(logo.getAttribute('alt')).toBe('Logotipo da instituição');
      expect(logo.getAttribute('src')).toBe('assets/img/brand/brand-logo-white.svg');
    });

    it('shows the copyright with the current year and no legal block', () => {
      expect(text()).toContain(`Copyright © ${new Date().getFullYear()} todos os direitos reservados`);
      expect(text()).not.toContain('CNPJ');
      expect(root().querySelectorAll('.footer-legal p').length).toBe(1);
    });

    it('has no security seals or extra links (minimal footer)', () => {
      expect(text()).not.toContain('Segurança');
      expect(root().querySelectorAll('a').length).toBe(0);
    });
  });

  describe('with entities from configuration', () => {
    const entities: FooterEntity[] = [
      { name: 'Empresa Exemplo S.A.', cnpj: '00.000.000/0001-00', address: 'Rua Fictícia, 100, São Paulo - SP' },
      { name: 'Outra Empresa S.A.', cnpj: '11.111.111/0001-11', address: 'Avenida Fictícia, 200, São Paulo - SP' }
    ];
    beforeEach(() => setup(entities));

    it('shows the copyright and each legal entity with CNPJ and address', () => {
      expect(text()).toContain(`Copyright © ${new Date().getFullYear()} todos os direitos reservados`);
      expect(text()).toContain('Empresa Exemplo S.A. - CNPJ: 00.000.000/0001-00');
      expect(text()).toContain('Outra Empresa S.A. - CNPJ: 11.111.111/0001-11');
      expect(text()).toContain('Rua Fictícia, 100, São Paulo - SP');
      expect(text()).toContain('Avenida Fictícia, 200, São Paulo - SP');
      expect(root().querySelectorAll('a').length).toBe(0);
    });
  });
});
