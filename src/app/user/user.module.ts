import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UserRoutingModule } from './user-routing.module';
import { MyProfileComponent } from './my-profile/my-profile.component';
import { MyTeamsComponent } from './my-teams/my-teams.component';
import { TeamsInfoComponent } from './teams-info/teams-info.component';
import { FeedbackComponent } from './feedback/feedback.component';
import { SharedModule } from '../shared/shared.module';
import { PurchaseHistoryComponent } from './purchase-history/purchase-history.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SupportComponent } from './support/support.component';
import { NotificationsComponent } from './notifications/notifications.component';


@NgModule({
  declarations: [
    MyProfileComponent,
    MyTeamsComponent,
    TeamsInfoComponent,
    FeedbackComponent,
    PurchaseHistoryComponent,
    SupportComponent,
    NotificationsComponent
  ],
  imports: [
    CommonModule,
    UserRoutingModule,
    SharedModule, ReactiveFormsModule, FormsModule
  ]
})
export class UserModule { }
