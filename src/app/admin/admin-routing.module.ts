import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { adminAuthGuard } from '../core/guards/admin-auth.guard';
import { AddCountryComponent } from './add-country/add-country.component';
import { AddSubscriptionComponent } from './add-subscription/add-subscription.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { AdminLoginComponent } from './admin-login/admin-login.component';
import { AdminShellComponent } from './admin-shell/admin-shell.component';
import { CreateBannerComponent } from './create-banner/create-banner.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: AdminLoginComponent
  },
  {
    path: '',
    canActivate: [adminAuthGuard],
    component: AdminShellComponent,
    children: [
      {
        path: 'dashboard',
        component: AdminDashboardComponent
      },
      {
        path: 'create-banner',
        component: CreateBannerComponent
      },
      {
        path: 'add-country',
        component: AddCountryComponent
      },
      {
        path: 'add-subscription',
        component: AddSubscriptionComponent
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
