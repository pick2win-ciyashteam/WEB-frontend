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
import { CookiePolicyComponent } from './cookie-policy/cookie-policy.component';
import { CreateUctComponent } from '../lineouts/create-uct/create-uct.component';
import { AllSeriesCoverComponent } from '../lineouts/all-series-cover/all-series-cover.component';
import { createUctGuard, preventPendingUctGenerationGuard } from '../core/guards/create-uct.guard';

const seo = {
  home: {
    title: 'PICK2WIN UCT – Classic DFS Football Team & Lineup Configuration Platform',
    description: 'Build smarter Classic DFS football team and lineup configurations with PICK2WIN UCT. Create My Squad, generate multiple salary-cap compliant teams, and export for compatible DFS platforms.',
    hashtags: '#PICK2WIN #UCT #ClassicDFS #TeamConfiguration #LineupConfiguration #WhereSkillMattersMore',
    url: 'https://pick2win.io/'
  },
  uctGuide: {
    title: 'UCT Guide – User Configuration Teams | PICK2WIN',
    description: 'Learn how User Configuration Teams (UCT) work. Build My Squad, configure player rules, optimize player coverage, and generate multiple football team configurations.',
    hashtags: '#PICK2WIN #UCTGuide #MySquad #TeamConfiguration #FootballStrategy',
    url: 'https://pick2win.io/uctguide'
  },
  lineouts: {
    title: 'Official Football Lineouts & My Squad | PICK2WIN',
    description: 'View official starting XI and substitutes, build your My Squad, select eligible players, and prepare team configurations before generating multiple lineups.',
    hashtags: '#PICK2WIN #FootballLineouts #MySquad #PlayerSelection #UCT',
    url: 'https://pick2win.io/lineouts'
  },
  pricing: {
    title: 'PICK2WIN Pricing – Plans & Features',
    description: 'Choose the PICK2WIN plan that fits your workflow. Unlock advanced UCT features, faster team generation, player coverage controls, and export options.',
    hashtags: '#PICK2WIN #Pricing #UCT #Plans #Features',
    url: 'https://pick2win.io/pricing'
  },
  trust: {
    title: 'Trust, Security & Transparency | PICK2WIN',
    description: 'Learn how PICK2WIN protects your account with secure payments, encrypted data, transparent pricing, privacy protection, and responsible platform practices.',
    hashtags: '#PICK2WIN #Trust #Security #Privacy #Transparency',
    url: 'https://pick2win.io/trust'
  },
  faq: {
    title: 'Frequently Asked Questions | PICK2WIN',
    description: 'Find answers about User Configuration Teams, My Squad, subscriptions, exports, supported platforms, account management, and common questions.',
    hashtags: '#PICK2WIN #FAQ #Support #UCT #HelpCenter',
    url: 'https://pick2win.io/faq'
  },
  terms: {
    title: 'Terms & Conditions | PICK2WIN',
    description: 'Read the official Terms & Conditions governing your use of PICK2WIN, subscriptions, website services, user responsibilities, and platform policies.',
    hashtags: '#PICK2WIN #Terms #Legal #PlatformPolicies',
    url: 'https://pick2win.io/terms'
  },
  policy: {
    title: 'Privacy Policy | PICK2WIN',
    description: 'Learn how PICK2WIN collects, stores, processes, and protects your personal information while providing secure online services.',
    hashtags: '#PICK2WIN #Privacy #DataProtection #Security',
    url: 'https://pick2win.io/policy'
  },
  refund: {
    title: 'Refund Policy | PICK2WIN',
    description: 'Review refund eligibility, subscription cancellations, processing timelines, and refund procedures for eligible PICK2WIN purchases and services.',
    hashtags: '#PICK2WIN #Refund #CustomerSupport #Billing',
    url: 'https://pick2win.io/refund'
  },
  cookiePolicy: {
    title: 'Cookie Policy | PICK2WIN',
    description: 'Learn how PICK2WIN uses cookies to improve website performance, remember your preferences, enhance your experience, and analyze website traffic.',
    hashtags: '#PICK2WIN #Cookies #Privacy #WebsiteSecurity',
    url: 'https://pick2win.io/cookie-policy'
  }
};

const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    data: { seo: seo.home }
  },
  {
    path: 'uctguide',
    component: UctinfoComponent,
    data: { seo: seo.uctGuide }
  },
    {
    path: 'lineouts',
    component: LineupsComponent,
    data: { seo: seo.lineouts }
  },
  {
    path: 'lineouts/matches/:id',
    redirectTo: 'lineouts',
    pathMatch: 'full'
  },
{
  path: 'lineouts/create-uct/:id',
  component: CreateUctComponent,
  canActivate: [createUctGuard],
  canDeactivate: [preventPendingUctGenerationGuard]
},
  {
    path: 'lineouts/all-series-cover',
    component: AllSeriesCoverComponent
  },
    {
    path: 'pricing',
    component: PricingComponent,
    data: { seo: seo.pricing }
  },
  //  {
  //   path: 'about',
  //   component: AboutComponent
  // },
   {
    path: 'trust',
    component: TrustComponent,
    data: { seo: seo.trust }
  },
   {
    path: 'faq',
    component: FaqComponent,
    data: { seo: seo.faq }
  },

   {
    path: 'terms',
    component: TermsComponent,
    data: { seo: seo.terms }
  },

   {
    path: 'policy',
    component: PolicyComponent,
    data: { seo: seo.policy }
  },

  {
    path: 'refund',
    component: RefundComponent,
    data: { seo: seo.refund }
  },
  {
    path: 'cookie-policy',
    component: CookiePolicyComponent,
    data: { seo: seo.cookiePolicy }
  },

  
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PagesRoutingModule { }
