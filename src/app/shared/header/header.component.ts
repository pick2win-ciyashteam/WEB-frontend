import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { map, of, switchMap } from 'rxjs';
import { AuthModalService } from 'src/app/core/services/auth-modal.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { ProfileService } from 'src/app/core/services/profile.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class  HeaderComponent {

  isMenuOpen = false;
  hideNotice = localStorage.getItem('p2w_region_dismiss') === '1';

  loggedIn$ = this.authService.loggedIn$;
  profileInitial$ = this.loggedIn$.pipe(
    switchMap(loggedIn => loggedIn ? this.profileService.loadProfile() : of(null)),
    switchMap(() => this.profileService.profile$),
    map(profile => this.firstInitial(profile?.fullname))
  );

  constructor(
    private authModal: AuthModalService,
    private authService: AuthService,
    private profileService: ProfileService,
    private router: Router
  ) {}

     openLogin() {
    this.closeMenu();
    this.authModal.open('login');
  }

  openSignup() {
    this.closeMenu();
    this.authModal.open('signup');
  }

  openMySpace() {
    this.closeMenu();
    this.router.navigate(['/user/profile']);
  }

  signOut() {
    this.closeMenu();
    this.authService.logout();
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu() {
    this.isMenuOpen = false;
  }

  dismissNotice() {
    this.hideNotice = true;
    localStorage.setItem('p2w_region_dismiss', '1');
  }

  private firstInitial(name?: string | null): string {
    return (name || 'U').trim().charAt(0).toUpperCase() || 'U';
  }
}
