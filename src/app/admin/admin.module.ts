import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AdminRoutingModule } from './admin-routing.module';
import { AdminLoginComponent } from './admin-login/admin-login.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { AdminHeaderComponent } from './admin-header/admin-header.component';
import { AdminShellComponent } from './admin-shell/admin-shell.component';
import { AdminSidebarComponent } from './admin-sidebar/admin-sidebar.component';
import { CountriesComponent } from './countries/countries.component';
import { CreateBannerComponent } from './create-banner/create-banner.component';
import { PackBuyersComponent } from './pack-buyers/pack-buyers.component';
import { SeriesManagerComponent } from './series-manager/series-manager.component';
import { UctActivityComponent } from './uct-activity/uct-activity.component';
import { UserManagementComponent } from './user-management/user-management.component';
import { VotesFeedbackComponent } from './votes-feedback/votes-feedback.component';
import { LeaguesSeriesComponent } from './leagues-series/leagues-series.component';
import { CoinPacksComponent } from './coin-packs/coin-packs.component';
import { AdminsTeamComponent } from './admins-team/admins-team.component';
import { ActivityLogsComponent } from './activity-logs/activity-logs.component';
import { RevenueComponent } from './revenue/revenue.component';
import { ExpensesComponent } from './expenses/expenses.component';
import { ProfitComponent } from './profit/profit.component';
import { PaymentsComponent } from './payments/payments.component';

@NgModule({
  declarations: [
    AdminLoginComponent,
    AdminDashboardComponent,
    AdminHeaderComponent,
    AdminShellComponent,
    AdminSidebarComponent,
    CountriesComponent,
    CreateBannerComponent,
    PackBuyersComponent,
    SeriesManagerComponent,
    UctActivityComponent,
    UserManagementComponent,
    VotesFeedbackComponent,
    LeaguesSeriesComponent,
    CoinPacksComponent,
    AdminsTeamComponent,
    ActivityLogsComponent,
    RevenueComponent,
    ExpensesComponent
    , ProfitComponent
    , PaymentsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AdminRoutingModule
  ]
})
export class AdminModule { }
