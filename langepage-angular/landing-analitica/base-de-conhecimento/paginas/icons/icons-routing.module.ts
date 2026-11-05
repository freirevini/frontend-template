import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { IconsComponent } from './icons.component';

const routes: Routes = [
  {
    path: '',
    data: {
      title: 'Ícones'
    },
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'general'
      },
      {
        path: 'general',
        component: IconsComponent,
        data: {
          title: 'Gerais'
        }
      },
      {
        path: 'brands',
        component: IconsComponent,
        data: {
          title: 'Marcas'
        }
      },
      {
        path: 'flags',
        component: IconsComponent,
        data: {
          title: 'Bandeiras'
        }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class IconsRoutingModule {
}
