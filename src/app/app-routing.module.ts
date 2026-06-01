import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () =>
      import('./auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: 'admin',
    loadChildren: () =>
      import('./admin/admin.module').then(m => m.AdminModule)
  },

  {
    path: 'user',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./user/user.module').then(m => m.UserModule)
  },
  {
    path: '',
    loadChildren: () =>
      import('./pages/pages.module').then(m => m.PagesModule)
  },

  {
    path: '**',
    redirectTo: ''
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    scrollPositionRestoration: 'top',
    anchorScrolling: 'enabled'
  })],
  exports: [RouterModule, ]
})
export class AppRoutingModule {}
