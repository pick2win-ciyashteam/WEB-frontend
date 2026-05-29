import { Component, OnInit } from '@angular/core';
import { UserProfile } from 'src/app/core/interfaces/content';
import { ProfileService } from 'src/app/core/services/profile.service';

@Component({
  selector: 'app-my-profile',
  templateUrl: './my-profile.component.html',
  styleUrls: ['./my-profile.component.css']
})
export class MyProfileComponent implements OnInit {
  activeTab: 'profile' | 'teams' | 'feedback' = 'profile';
  profile$ = this.profileService.profile$;
  loading$ = this.profileService.loading$;
  error$ = this.profileService.error$;

  constructor(private profileService: ProfileService) {}

  ngOnInit(): void {
    this.profileService.loadProfile().subscribe();
  }

  setTab(tab: 'profile' | 'teams' | 'feedback') {
    this.activeTab = tab;
  }

  initials(profile: UserProfile | null): string {
    if (!profile?.fullname) {
      return 'U';
    }

    return profile.fullname
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase();
  }

  maskedMobile(profile: UserProfile | null): string {
    if (!profile?.mobile) {
      return '-';
    }

    const mobile = profile.mobile;
    return mobile.length > 4 ? `*** *** ${mobile.slice(-4)}` : mobile;
  }

  memberSince(profile: UserProfile | null): string {
    if (!profile?.created_at) {
      return '-';
    }

    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(profile.created_at));
  }

  verifyLabel(profile: UserProfile | null): string {
    return profile?.email_verify && profile?.mobile_verify ? 'Dual Verified' : 'Verification Pending';
  }
}
