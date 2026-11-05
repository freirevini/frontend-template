import { navItems } from './_nav';

describe('navItems (menu lateral)', () => {
  it('lists the product pages only, with the dashboards grouped under "Painéis"', () => {
    expect(navItems.map((item) => item.name)).toEqual(['Início', 'Painéis', 'Triagent', 'Scalation', 'Analítico']);
    expect(navItems[1].title).toBeTrue();
  });

  it('links every sub-item to a section of its page by fragment, highlighted only on that exact fragment', () => {
    const triagent = navItems.find((item) => item.name === 'Triagent');
    const scalation = navItems.find((item) => item.name === 'Scalation');
    expect(triagent?.children?.map((item) => item.linkProps?.fragment)).toEqual([
      'segmentos',
      'normativos-recebidos',
      'normas-aplicaveis',
      'assunto-das-normas',
      'fluxo-de-email',
      'tabela-analitica'
    ]);
    expect(scalation?.children?.map((item) => item.name)).toEqual(['Normas por segmento', 'Cascata do resultado', 'Tráfego e vendas']);
    for (const child of [...(triagent?.children ?? []), ...(scalation?.children ?? [])]) {
      expect(child.url).toBe(triagent?.children?.includes(child) ? '/triagent' : '/scalation');
      expect(child.linkProps?.routerLinkActiveOptions).toEqual(jasmine.objectContaining({ paths: 'exact', fragment: 'exact' }));
    }
  });
});
