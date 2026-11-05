import { INavData } from '@coreui/angular';

export const navItems: INavData[] = [
  {
    name: 'Início',
    url: '/',
    // Exact match: '/' would otherwise mark this item active on every page.
    linkProps: { routerLinkActiveOptions: { exact: true } },
    iconComponent: { name: 'cil-home' }
  },
  {
    name: 'Triagent',
    url: '/triagent',
    iconComponent: { name: 'cil-speedometer' }
  },
  {
    name: 'Scalation',
    url: '/scalation',
    iconComponent: { name: 'cil-layers' }
  },
  {
    name: 'Analítico',
    url: '/analitico',
    iconComponent: { name: 'cil-chart-line' }
  },
  {
    title: true,
    name: 'Tema'
  },
  {
    name: 'Cores',
    url: '/theme/colors',
    iconComponent: { name: 'cil-drop' }
  },
  {
    name: 'Tipografia',
    url: '/theme/typography',
    linkProps: { fragment: 'someAnchor' },
    iconComponent: { name: 'cil-pencil' }
  },
  {
    name: 'Componentes',
    title: true
  },
  {
    name: 'Base',
    url: '/base',
    iconComponent: { name: 'cil-puzzle' },
    children: [
      {
        name: 'Acordeão',
        url: '/base/accordion'
      },
      {
        name: 'Trilha de navegação',
        url: '/base/breadcrumbs'
      },
      {
        name: 'Cartões',
        url: '/base/cards'
      },
      {
        name: 'Carrossel',
        url: '/base/carousel'
      },
      {
        name: 'Recolher',
        url: '/base/collapse'
      },
      {
        name: 'Grupo de listas',
        url: '/base/list-group'
      },
      {
        name: 'Navegação e abas',
        url: '/base/navs'
      },
      {
        name: 'Paginação',
        url: '/base/pagination'
      },
      {
        name: 'Espaço reservado',
        url: '/base/placeholder'
      },
      {
        name: 'Popovers',
        url: '/base/popovers'
      },
      {
        name: 'Progresso',
        url: '/base/progress'
      },
      {
        name: 'Indicadores de carregamento',
        url: '/base/spinners'
      },
      {
        name: 'Tabelas',
        url: '/base/tables'
      },
      {
        name: 'Abas',
        url: '/base/tabs'
      },
      {
        name: 'Dicas',
        url: '/base/tooltips'
      }
    ]
  },
  {
    name: 'Botões',
    url: '/buttons',
    iconComponent: { name: 'cil-cursor' },
    children: [
      {
        name: 'Botões',
        url: '/buttons/buttons'
      },
      {
        name: 'Grupos de botões',
        url: '/buttons/button-groups'
      },
      {
        name: 'Menus suspensos',
        url: '/buttons/dropdowns'
      },
    ]
  },
  {
    name: 'Formulários',
    url: '/forms',
    iconComponent: { name: 'cil-notes' },
    children: [
      {
        name: 'Controles de formulário',
        url: '/forms/form-control'
      },
      {
        name: 'Seleção',
        url: '/forms/select'
      },
      {
        name: 'Caixas de seleção e rádios',
        url: '/forms/checks-radios'
      },
      {
        name: 'Intervalo',
        url: '/forms/range'
      },
      {
        name: 'Grupo de entrada',
        url: '/forms/input-group'
      },
      {
        name: 'Rótulos flutuantes',
        url: '/forms/floating-labels'
      },
      {
        name: 'Layout',
        url: '/forms/layout'
      },
      {
        name: 'Validação',
        url: '/forms/validation'
      }
    ]
  },
  {
    name: 'Gráficos',
    url: '/charts',
    iconComponent: { name: 'cil-chart-pie' }
  },
  {
    name: 'Ícones',
    iconComponent: { name: 'cil-star' },
    url: '/icons',
    children: [
      {
        name: 'Gerais',
        url: '/icons/general'
      },
      {
        name: 'Bandeiras',
        url: '/icons/flags'
      },
      {
        name: 'Marcas',
        url: '/icons/brands'
      }
    ]
  },
  {
    name: 'Notificações',
    url: '/notifications',
    iconComponent: { name: 'cil-bell' },
    children: [
      {
        name: 'Alertas',
        url: '/notifications/alerts'
      },
      {
        name: 'Selos',
        url: '/notifications/badges'
      },
      {
        name: 'Modais',
        url: '/notifications/modal'
      },
      {
        name: 'Avisos',
        url: '/notifications/toasts'
      }
    ]
  },
  {
    name: 'Widgets',
    url: '/widgets',
    iconComponent: { name: 'cil-calculator' }
  },
  {
    title: true,
    name: 'Extras'
  },
  {
    name: 'Páginas',
    url: '/login',
    iconComponent: { name: 'cil-star' },
    children: [
      {
        name: 'Entrar',
        url: '/login'
      },
      {
        name: 'Cadastro',
        url: '/register'
      },
      {
        name: 'Erro 404',
        url: '/404'
      },
      {
        name: 'Erro 500',
        url: '/500'
      }
    ]
  },
];
