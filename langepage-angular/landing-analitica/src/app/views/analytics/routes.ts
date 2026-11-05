import { Routes } from '@angular/router';

import { AnalyticsComponent } from './analytics.component';

export const routes: Routes = [
  {
    path: '',
    component: AnalyticsComponent,
    data: {
      title: 'Analítico'
    }
  }
];
