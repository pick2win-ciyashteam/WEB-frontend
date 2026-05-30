import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { UctinfoComponent } from './uctinfo/uctinfo.component';
import { LineupsComponent } from '../lineouts/lineups/lineups.component';
import { PricingComponent } from './pricing/pricing.component';
import { AboutComponent } from './about/about.component';
import { TrustComponent } from './trust/trust.component';
import { FaqComponent } from './faq/faq.component';
import { TermsComponent } from './terms/terms.component';
import { PolicyComponent } from './policy/policy.component';
import { RefundComponent } from './refund/refund.component';
import { PlayingTeamComponent } from '../lineouts/playing-team/playing-team.component';
import { CreateUctComponent } from '../lineouts/create-uct/create-uct.component';
import { AllSeriesCoverComponent } from '../lineouts/all-series-cover/all-series-cover.component';

const routes: Routes = [
  {
    path: '',
    component: HomeComponent
  },
  {
    path: 'uctinfo',
    component: UctinfoComponent
  },
    {
    path: 'lineouts',
    component: LineupsComponent
  },
  {
    path: 'lineouts/matches/:id',
    component: PlayingTeamComponent
  },
  {
    path: 'lineouts/create-uct/:id',
    component: CreateUctComponent
  },
  {
    path: 'lineouts/all-series-cover',
    component: AllSeriesCoverComponent
  },
    {
    path: 'pricing',
    component: PricingComponent
  },
   {
    path: 'about',
    component: AboutComponent
  },
   {
    path: 'trust',
    component: TrustComponent
  },
   {
    path: 'faq',
    component: FaqComponent
  },

   {
    path: 'terms',
    component: TermsComponent
  },

   {
    path: 'policy',
    component: PolicyComponent
  },

   {
    path: 'refund',
    component: RefundComponent
  },

  
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PagesRoutingModule { }
