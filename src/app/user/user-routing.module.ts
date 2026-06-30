import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MyProfileComponent } from './my-profile/my-profile.component';
import { MyTeamsComponent } from './my-teams/my-teams.component';
import { TeamsInfoComponent } from './teams-info/teams-info.component';
import { FeedbackComponent } from './feedback/feedback.component';
import { SupportComponent } from './support/support.component';

const routes: Routes = [
    {
      path: 'profile',
      component: MyProfileComponent
    },
    {
      path: 'myteams',
      component: MyTeamsComponent
    },
    {
      path: 'teamsinfo:/id',
      component: TeamsInfoComponent
    },
    {
      path: 'feedback',
      component: FeedbackComponent
    },
    {
      path: 'support',
      component: SupportComponent
    },
    {
      path: 'support/:id',
      component: SupportComponent
    },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UserRoutingModule { }
