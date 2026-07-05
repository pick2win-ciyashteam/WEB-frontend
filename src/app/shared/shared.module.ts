import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { SidebarComponent } from './sidebar/sidebar.component';
import { FooterComponent } from './footer/footer.component';
import { HeaderComponent } from './header/header.component';
import { PipesComponent } from './pipes/pipes.component';
import { LoadersComponent } from './loaders/loaders.component';
import { CookieConsentComponent } from './cookie-consent/cookie-consent.component';

@NgModule({
  declarations: [
    SidebarComponent,
    FooterComponent,
    HeaderComponent,
    PipesComponent,
    LoadersComponent,
    CookieConsentComponent
  ],
  imports: [
    CommonModule,
    RouterModule
  ],
  exports: [
    SidebarComponent,
    FooterComponent,
    HeaderComponent,
    PipesComponent,
    LoadersComponent,
    CookieConsentComponent
  ]
})
export class SharedModule { }
