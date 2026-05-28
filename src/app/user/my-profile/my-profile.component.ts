import { Component } from '@angular/core';

@Component({
  selector: 'app-my-profile',
  templateUrl: './my-profile.component.html',
  styleUrls: ['./my-profile.component.css']
})
export class MyProfileComponent {
  activeTab: 'profile' | 'teams' | 'feedback' = 'profile';

  setTab(tab: 'profile' | 'teams' | 'feedback') {
    this.activeTab = tab;
  }
}
