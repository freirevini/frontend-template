import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AccordionsComponent } from './accordion/accordions.component';
import { BreadcrumbsComponent } from './breadcrumbs/breadcrumbs.component';
import { CardsComponent } from './cards/cards.component';
import { CarouselsComponent } from './carousels/carousels.component';
import { CollapsesComponent } from './collapses/collapses.component';
import { ListGroupsComponent } from './list-groups/list-groups.component';
import { NavsComponent } from './navs/navs.component';
import { PaginationsComponent } from './paginations/paginations.component';
import { PopoversComponent } from './popovers/popovers.component';
import { ProgressComponent } from './progress/progress.component';
import { SpinnersComponent } from './spinners/spinners.component';
import { TablesComponent } from './tables/tables.component';
import { TooltipsComponent } from './tooltips/tooltips.component';
import { TabsComponent } from './tabs/tabs.component';
import { PlaceholdersComponent } from './placeholders/placeholders.component';

const routes: Routes = [
  {
    path: '',
    data: {
      title: 'Base',
    },
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'cards',
      },
      {
        path: 'accordion',
        component: AccordionsComponent,
        data: {
          title: 'Acordeão',
        },
      },
      {
        path: 'breadcrumbs',
        component: BreadcrumbsComponent,
        data: {
          title: 'Trilha de navegação',
        },
      },
      {
        path: 'cards',
        component: CardsComponent,
        data: {
          title: 'Cartões',
        },
      },
      {
        path: 'carousel',
        component: CarouselsComponent,
        data: {
          title: 'Carrossel',
        },
      },
      {
        path: 'collapse',
        component: CollapsesComponent,
        data: {
          title: 'Recolher',
        },
      },
      {
        path: 'list-group',
        component: ListGroupsComponent,
        data: {
          title: 'Grupo de listas',
        },
      },
      {
        path: 'navs',
        component: NavsComponent,
        data: {
          title: 'Navegação e abas',
        },
      },
      {
        path: 'pagination',
        component: PaginationsComponent,
        data: {
          title: 'Paginação',
        },
      },
      {
        path: 'placeholder',
        component: PlaceholdersComponent,
        data: {
          title: 'Espaço reservado',
        },
      },
      {
        path: 'popovers',
        component: PopoversComponent,
        data: {
          title: 'Popovers',
        },
      },
      {
        path: 'progress',
        component: ProgressComponent,
        data: {
          title: 'Progresso',
        },
      },
      {
        path: 'spinners',
        component: SpinnersComponent,
        data: {
          title: 'Indicadores de carregamento',
        },
      },
      {
        path: 'tables',
        component: TablesComponent,
        data: {
          title: 'Tabelas',
        },
      },
      {
        path: 'tabs',
        component: TabsComponent,
        data: {
          title: 'Abas',
        },
      },
      {
        path: 'tooltips',
        component: TooltipsComponent,
        data: {
          title: 'Dicas',
        },
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BaseRoutingModule {}

