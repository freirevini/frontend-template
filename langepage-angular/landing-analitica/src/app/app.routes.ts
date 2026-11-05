import { Routes } from '@angular/router';

import { DefaultLayoutComponent } from './containers';

export const routes: Routes = [
  {
    path: '',
    component: DefaultLayoutComponent,
    data: {
      title: 'Início'
    },
    children: [
      // Início: home page at the root URL.
      {
        path: '',
        pathMatch: 'full',
        // Empty title: without it this route inherits 'Início' and the breadcrumb repeats it.
        data: { title: '' },
        loadChildren: () => import('./views/home/routes').then((m) => m.routes)
      },
      // Triagent: the current dashboard (code folder: views/dashboard).
      {
        path: 'triagent',
        loadChildren: () => import('./views/dashboard/routes').then((m) => m.routes)
      },
      {
        path: 'scalation',
        loadChildren: () => import('./views/scalation/routes').then((m) => m.routes)
      },
      {
        path: 'analitico',
        loadChildren: () => import('./views/analytics/routes').then((m) => m.routes)
      },
      // Old dashboard address kept working for bookmarks and links.
      {
        path: 'dashboard',
        pathMatch: 'full',
        redirectTo: 'triagent'
      }
    ]
  },
  // Template demo pages (Tema, Componentes, Extras) live in base-de-conhecimento/, outside the build.
  { path: '**', redirectTo: '' }
];
