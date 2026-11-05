import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ButtonsComponent } from './buttons/buttons.component';
import { ButtonGroupsComponent } from './button-groups/button-groups.component';
import { DropdownsComponent } from './dropdowns/dropdowns.component';

const routes: Routes = [
  {
    path: '',
    data: {
      title: 'Botões'
    },
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'buttons'
      },
      {
        path: 'buttons',
        component: ButtonsComponent,
        data: {
          title: 'Botões'
        }
      },
      {
        path: 'button-groups',
        component: ButtonGroupsComponent,
        data: {
          title: 'Grupos de botões'
        }
      },
      {
        path: 'dropdowns',
        component: DropdownsComponent,
        data: {
          title: 'Menus suspensos'
        }
      },
    ]
  }
];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ButtonsRoutingModule {
}
