import { INavData } from '@coreui/angular';

/** Sub-items open a section of the page: same path, exact fragment (so only the chosen section is highlighted). */
const section = (name: string, url: string, fragment: string): INavData => ({
  name,
  url,
  linkProps: {
    fragment,
    routerLinkActiveOptions: { paths: 'exact', fragment: 'exact', queryParams: 'ignored', matrixParams: 'ignored' }
  }
});

export const navItems: INavData[] = [
  {
    name: 'Início',
    url: '/',
    // Exact match: '/' would otherwise mark this item active on every page.
    linkProps: { routerLinkActiveOptions: { exact: true } },
    iconComponent: { name: 'cil-home' }
  },
  {
    title: true,
    name: 'Painéis'
  },
  {
    name: 'Triagent',
    url: '/triagent',
    iconComponent: { name: 'cil-speedometer' },
    children: [
      section('Normas por segmento', '/triagent', 'segmentos'),
      section('Normativos Recebidos', '/triagent', 'normativos-recebidos'),
      section('Normas Aplicáveis', '/triagent', 'normas-aplicaveis'),
      section('Assunto das Normas Aplicáveis', '/triagent', 'assunto-das-normas'),
      section('Fluxo de e-mail - Triagem', '/triagent', 'fluxo-de-email'),
      section('Tabela Analítica', '/triagent', 'tabela-analitica')
    ]
  },
  {
    name: 'Scalation',
    url: '/scalation',
    iconComponent: { name: 'cil-layers' },
    children: [
      section('Normas por segmento', '/scalation', 'segmentos'),
      section('Cascata do resultado', '/scalation', 'cascata'),
      section('Tráfego e vendas', '/scalation', 'trafego-e-vendas')
    ]
  },
  {
    name: 'Analítico',
    url: '/analitico',
    iconComponent: { name: 'cil-chart-line' }
  }
];
