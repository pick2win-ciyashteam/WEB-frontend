import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { adminAuthGuard } from '../core/guards/admin-auth.guard';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { AdminLoginComponent } from './admin-login/admin-login.component';
import { AdminShellComponent } from './admin-shell/admin-shell.component';
import { CountriesComponent } from './countries/countries.component';
import { CreateBannerComponent } from './create-banner/create-banner.component';
import { PackBuyersComponent } from './pack-buyers/pack-buyers.component';
import { SeriesManagerComponent } from './series-manager/series-manager.component';
import { LeaguesSeriesComponent } from './leagues-series/leagues-series.component';
import { CoinPacksComponent } from './coin-packs/coin-packs.component';
import { AdminsTeamComponent } from './admins-team/admins-team.component';
import { UctActivityComponent } from './uct-activity/uct-activity.component';
import { UserManagementComponent } from './user-management/user-management.component';
import { VotesFeedbackComponent } from './votes-feedback/votes-feedback.component';
import { ActivityLogsComponent } from './activity-logs/activity-logs.component';
import { RevenueComponent } from './revenue/revenue.component';
import { ExpensesComponent } from './expenses/expenses.component';
import { ProfitComponent } from './profit/profit.component';
import { PaymentsComponent } from './payments/payments.component';

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
    canActivateChild: [adminAuthGuard],
    component: AdminShellComponent,
    children: [
      {
        path: 'dashboard',
        component: AdminDashboardComponent
      },
      {
        path: 'users',
        component: UserManagementComponent
      },
      {
        path: 'countries',
        component: CountriesComponent
      },
      {
        path: 'uct-activity',
        component: UctActivityComponent
      },
      {
        path: 'votes-feedback',
        component: VotesFeedbackComponent
      },
      {
        path: 'create-banner',
        component: CreateBannerComponent
      },
    
      {
        path: 'pack-buyers',
        component: PackBuyersComponent
      },
     
      {
        path: 'series-manager',
        component: SeriesManagerComponent
      },
      {
        path: 'leagues-series',
        component: LeaguesSeriesComponent
      },
      {
        path: 'coin-packs',
        component: CoinPacksComponent
      },
      {
        path: 'admins-team',
        component: AdminsTeamComponent
      },
      {
        path: 'activity-logs',
        component: ActivityLogsComponent
      },
      {
        path: 'revenue',
        component: RevenueComponent
      },
      {
        path: 'expenses',
        component: ExpensesComponent
      },
      {
        path: 'profit',
        component: ProfitComponent
      },
      {
        path: 'payments',
        component: PaymentsComponent
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
