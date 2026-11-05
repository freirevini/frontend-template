import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Page404Component } from './page404/page404.component';
import { Page500Component } from './page500/page500.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';

const routes: Routes = [
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
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PagesRoutingModule {
}
