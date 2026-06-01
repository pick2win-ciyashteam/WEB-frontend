import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { AdminRoutingModule } from './admin-routing.module';
import { AdminLoginComponent } from './admin-login/admin-login.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { AdminShellComponent } from './admin-shell/admin-shell.component';
import { CreateBannerComponent } from './create-banner/create-banner.component';
import { AddCountryComponent } from './add-country/add-country.component';
import { AddSubscriptionComponent } from './add-subscription/add-subscription.component';

@NgModule({
  declarations: [
    AdminLoginComponent,
    AdminDashboardComponent,
    AdminShellComponent,
    CreateBannerComponent,
    AddCountryComponent,
    AddSubscriptionComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AdminRoutingModule
  ]
})
export class AdminModule { }
