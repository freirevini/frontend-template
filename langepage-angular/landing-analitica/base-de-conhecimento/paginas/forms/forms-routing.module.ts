import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { FloatingLabelsComponent } from './floating-labels/floating-labels.component';
import { FormControlsComponent } from './form-controls/form-controls.component';
import { InputGroupsComponent } from './input-groups/input-groups.component';
import { RangesComponent } from './ranges/ranges.component';
import { SelectComponent } from './select/select.component';
import { ChecksRadiosComponent } from './checks-radios/checks-radios.component';
import { LayoutComponent } from './layout/layout.component';
import { ValidationComponent } from './validation/validation.component';

const routes: Routes = [
  {
    path: '',
    data: {
      title: 'Formulários'
    },
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'form-control'
      },
      {
        path: 'form-control',
        component: FormControlsComponent,
        data: {
          title: 'Controles de formulário'
        }
      },
      {
        path: 'select',
        component: SelectComponent,
        data: {
          title: 'Seleção'
        }
      },
      {
        path: 'checks-radios',
        component: ChecksRadiosComponent,
        data: {
          title: 'Caixas de seleção e rádios'
        }
      },
      {
        path: 'range',
        component: RangesComponent,
        data: {
          title: 'Intervalo'
        }
      },
      {
        path: 'input-group',
        component: InputGroupsComponent,
        data: {
          title: 'Grupo de entrada'
        }
      },
      {
        path: 'floating-labels',
        component: FloatingLabelsComponent,
        data: {
          title: 'Rótulos flutuantes'
        }
      },
      {
        path: 'layout',
        component: LayoutComponent,
        data: {
          title: 'Layout'
        }
      },
      {
        path: 'validation',
        component: ValidationComponent,
        data: {
          title: 'Validação'
        }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FormsRoutingModule {
}
