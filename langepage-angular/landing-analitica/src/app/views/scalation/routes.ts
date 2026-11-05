import { Routes } from '@angular/router';

import { ScalationComponent } from './scalation.component';

export const routes: Routes = [
  {
    path: '',
    component: ScalationComponent,
    data: {
      title: 'Scalation'
    }
  }
];
