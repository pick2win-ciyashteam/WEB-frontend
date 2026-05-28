import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LineoutsRoutingModule } from './lineouts-routing.module';
import { LineupsComponent } from './lineups/lineups.component';
import { CreateUctComponent } from './create-uct/create-uct.component';


@NgModule({
  declarations: [
    LineupsComponent,
    CreateUctComponent
  ],
  imports: [
    CommonModule,
    LineoutsRoutingModule
  ]
})
export class LineoutsModule { }
