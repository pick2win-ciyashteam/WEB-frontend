import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LineoutsRoutingModule } from './lineouts-routing.module';
import { LineupsComponent } from './lineups/lineups.component';
import { CreateUctComponent } from './create-uct/create-uct.component';
import { SharedModule } from '../shared/shared.module';
import { PlayingTeamComponent } from './playing-team/playing-team.component';


@NgModule({
  declarations: [
    LineupsComponent,
    CreateUctComponent,
    PlayingTeamComponent
  ],
  imports: [
    CommonModule,
    LineoutsRoutingModule,
    SharedModule
  ],
  exports: [
    LineupsComponent,
    PlayingTeamComponent,
    CreateUctComponent
  ]
})
export class LineoutsModule { }
