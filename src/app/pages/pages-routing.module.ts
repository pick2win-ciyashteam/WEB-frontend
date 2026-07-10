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
    title: 'PICK2WIN – Football, Played With Skill | User Configuration Teams',
    description: 'Build your ultimate UCT squad on PICK2WIN. Configure your team, sharpen your football strategy, and compete to win. Put your sports skills to the test!',
    hashtags: '#PICK2WIN #UCT #ClassicDFS #TeamConfiguration #LineupConfiguration #WhereSkillMattersMore',
    url: 'https://pick2win.io/'
  },
  uctGuide: {
    title: 'UCT Guide – How User Configuration Teams Work | PICK2WIN',
    description: 'Learn how User Configuration Teams (UCT) work on PICK2WIN. Our step-by-step guide covers setup, rules, and tips to configure a winning football squad.',
    hashtags: '#PICK2WIN #UCTGuide #MySquad #TeamConfiguration #FootballStrategy',
    url: 'https://pick2win.io/uctguide'
  },
  lineouts: {
    title: 'Lineouts – Set Your Winning Football Lineup | PICK2WIN',
    description: 'Build and manage your football lineouts on PICK2WIN. Set formations, choose your players, and craft the perfect lineup for your User Configuration Team.',
    hashtags: '#PICK2WIN #FootballLineouts #MySquad #PlayerSelection #UCT',
    url: 'https://pick2win.io/lineouts'
  },
  pricing: {
    title: 'Pricing Plans – Choose Your PICK2WIN Package | PICK2WIN',
    description: 'Explore affordable PICK2WIN plans with no hidden fees. Choose your package, unlock advanced UCT building tools, and start managing your football team.',
    hashtags: '#PICK2WIN #Pricing #UCT #Plans #Features',
    url: 'https://pick2win.io/pricing'
  },
  trust: {
    title: 'Trust & Safety – Fair Play Guaranteed | PICK2WIN',
    description: 'See how PICK2WIN ensures trust, fairness, and transparency for every player. Learn about our safety measures, fair-play standards, and commitment to integrity.',
    hashtags: '#PICK2WIN #Trust #Security #Privacy #Transparency',
    url: 'https://pick2win.io/trust'
  },
  faq: {
    title: 'Frequently Asked Questions | PICK2WIN',
    description: 'Got questions about PICK2WIN? Find quick answers about User Configuration Teams, gameplay, pricing, accounts, and more in our FAQ section.',
    hashtags: '#PICK2WIN #FAQ #Support #UCT #HelpCenter',
    url: 'https://pick2win.io/faq'
  },
  terms: {
    title: 'Terms & Conditions | PICK2WIN',
    description: 'Read the official Terms & Conditions for using PICK2WIN, covering user responsibilities, platform rules, and the legal terms governing your account.',
    hashtags: '#PICK2WIN #Terms #Legal #PlatformPolicies',
    url: 'https://pick2win.io/terms'
  },
  policy: {
    title: 'Privacy Policy | PICK2WIN',
    description: 'Understand how PICK2WIN collects, uses, and protects your personal data. Review our full privacy policy to learn about your data rights and our commitments.',
    hashtags: '#PICK2WIN #Privacy #DataProtection #Security',
    url: 'https://pick2win.io/policy'
  },
  refund: {
    title: 'Refund Policy | PICK2WIN',
    description: 'Review PICK2WINs refund policy to understand eligibility, timelines, and the process for requesting a refund on your purchase or subscription.',
    hashtags: '#PICK2WIN #Refund #CustomerSupport #Billing',
    url: 'https://pick2win.io/refund'
  },
  cookiePolicy: {
    title: 'Cookie Policy | PICK2WIN',
    description: 'Learn how PICK2WIN uses cookies to improve your browsing experience, personalize content, and analyze site traffic. Manage your cookie preferences here.',
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
