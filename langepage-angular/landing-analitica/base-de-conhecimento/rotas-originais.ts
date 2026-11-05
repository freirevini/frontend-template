import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DefaultLayoutComponent } from './containers';
import { Page404Component } from './views/pages/page404/page404.component';
import { Page500Component } from './views/pages/page500/page500.component';
import { LoginComponent } from './views/pages/login/login.component';
import { RegisterComponent } from './views/pages/register/register.component';

const routes: Routes = [
  {
    path: '',
    component: DefaultLayoutComponent,
    data: {
      title: 'Início'
    },
    children: [
      // Início: home page at the root URL (empty until its content is defined).
      {
        path: '',
        pathMatch: 'full',
        // Empty title: without it this route inherits 'Início' and the breadcrumb repeats it.
        data: { title: '' },
        loadChildren: () =>
          import('./views/home/home.module').then((m) => m.HomeModule)
      },
      // Triagent: the current dashboard (code folder: views/dashboard).
      {
        path: 'triagent',
        loadChildren: () =>
          import('./views/dashboard/dashboard.module').then((m) => m.DashboardModule)
      },
      {
        path: 'scalation',
        loadChildren: () =>
          import('./views/scalation/scalation.module').then((m) => m.ScalationModule)
      },
      {
        path: 'analitico',
        loadChildren: () =>
          import('./views/analytics/analytics.module').then((m) => m.AnalyticsModule)
      },
      // Old dashboard address kept working for bookmarks and links.
      {
        path: 'dashboard',
        pathMatch: 'full',
        redirectTo: 'triagent'
      },
      {
        path: 'theme',
        loadChildren: () =>
          import('./views/theme/theme.module').then((m) => m.ThemeModule)
      },
      {
        path: 'base',
        loadChildren: () =>
          import('./views/base/base.module').then((m) => m.BaseModule)
      },
      {
        path: 'buttons',
        loadChildren: () =>
          import('./views/buttons/buttons.module').then((m) => m.ButtonsModule)
      },
      {
        path: 'forms',
        loadChildren: () =>
          import('./views/forms/forms.module').then((m) => m.FormsViewsModule)
      },
      {
        path: 'charts',
        loadChildren: () =>
          import('./views/charts/charts.module').then((m) => m.ChartsModule)
      },
      {
        path: 'icons',
        loadChildren: () =>
          import('./views/icons/icons.module').then((m) => m.IconsModule)
      },
      {
        path: 'notifications',
        loadChildren: () =>
          import('./views/notifications/notifications.module').then((m) => m.NotificationsModule)
      },
      {
        path: 'widgets',
        loadChildren: () =>
          import('./views/widgets/widgets.module').then((m) => m.WidgetsModule)
      },
      {
        path: 'pages',
        loadChildren: () =>
          import('./views/pages/pages.module').then((m) => m.PagesModule)
      },
    ]
  },
  {
    path: '404',
    component: Page404Component,
    data: {
      title: 'Erro 404'
    }
  },
  {
    path: '500',
    component: Page500Component,
    data: {
      title: 'Erro 500'
    }
  },
  {
    path: 'login',
    component: LoginComponent,
    data: {
      title: 'Entrar'
    }
  },
  {
    path: 'register',
    component: RegisterComponent,
    data: {
      title: 'Cadastro'
    }
  },
  {path: '**', redirectTo: ''}
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      scrollPositionRestoration: 'top',
      anchorScrolling: 'enabled',
      initialNavigation: 'enabledBlocking'
      // relativeLinkResolution: 'legacy'
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
