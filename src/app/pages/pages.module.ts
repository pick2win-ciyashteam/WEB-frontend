import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PagesRoutingModule } from './pages-routing.module';
import { HomeComponent } from './home/home.component';
import { UctinfoComponent } from './uctinfo/uctinfo.component';
import { PricingComponent } from './pricing/pricing.component';
import { AboutComponent } from './about/about.component';
import { TrustComponent } from './trust/trust.component';
import { FaqComponent } from './faq/faq.component';
import { SeriesComponent } from './series/series.component';
import { TermsComponent } from './terms/terms.component';
import { PolicyComponent } from './policy/policy.component';
import { RefundComponent } from './refund/refund.component';
import { SharedModule } from '../shared/shared.module';
import { LineoutsModule } from '../lineouts/lineouts.module';


@NgModule({
  declarations: [
    HomeComponent,
    UctinfoComponent,
    PricingComponent,
    AboutComponent,
    TrustComponent,
    FaqComponent,
    SeriesComponent,
    TermsComponent,
    PolicyComponent,
    RefundComponent
  ],
  imports: [
    CommonModule,
    PagesRoutingModule,
    SharedModule,
    LineoutsModule
  ]
})
export class PagesModule { }
