import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UserRoutingModule } from './user-routing.module';
import { MyProfileComponent } from './my-profile/my-profile.component';
import { MyTeamsComponent } from './my-teams/my-teams.component';
import { TeamsInfoComponent } from './teams-info/teams-info.component';
import { FeedbackComponent } from './feedback/feedback.component';


@NgModule({
  declarations: [
    MyProfileComponent,
    MyTeamsComponent,
    TeamsInfoComponent,
    FeedbackComponent
  ],
  imports: [
    CommonModule,
    UserRoutingModule
  ]
})
export class UserModule { }
