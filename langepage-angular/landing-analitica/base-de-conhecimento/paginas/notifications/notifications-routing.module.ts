import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { BadgesComponent } from './badges/badges.component';
import { AlertsComponent } from './alerts/alerts.component';
import { ModalsComponent } from './modals/modals.component';
import { ToastersComponent } from './toasters/toasters.component';

const routes: Routes = [
  {
    path: '',
    data: {
      title: 'Notificações'
    },
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'badges'
      },
      {
        path: 'alerts',
        component: AlertsComponent,
        data: {
          title: 'Alertas'
        }
      },
      {
        path: 'badges',
        component: BadgesComponent,
        data: {
          title: 'Selos'
        }
      },
      {
        path: 'modal',
        component: ModalsComponent,
        data: {
          title: 'Modais'
        }
      },
      {
        path: 'toasts',
        component: ToastersComponent,
        data: {
          title: 'Avisos'
        }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class NotificationsRoutingModule {
}
