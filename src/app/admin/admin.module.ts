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
import { ActivityDormancyComponent } from './activity-dormancy/activity-dormancy.component';
import { PackBuyersComponent } from './pack-buyers/pack-buyers.component';
import { SeriesManagerComponent } from './series-manager/series-manager.component';

@NgModule({
  declarations: [
    AdminLoginComponent,
    AdminDashboardComponent,
    AdminShellComponent,
    CreateBannerComponent,
    AddCountryComponent,
    AddSubscriptionComponent,
    ActivityDormancyComponent,
    PackBuyersComponent,
    SeriesManagerComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AdminRoutingModule
  ]
})
export class AdminModule { }
