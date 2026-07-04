import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthModalService } from 'src/app/core/services/auth-modal.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { FirebaseNotificationService } from 'src/app/core/services/firebase-notification.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class  HeaderComponent {

  isMenuOpen = false;
  isNotificationsOpen = false;
  hideNotice = localStorage.getItem('p2w_region_dismiss') === '1';

  loggedIn$ = this.authService.loggedIn$;
  notifications$ = this.notificationService.notifications$;
  unreadCount$ = this.notificationService.unreadCount$;

  constructor(
    private authModal: AuthModalService,
    private authService: AuthService,
    private notificationService: FirebaseNotificationService,
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

  openNotifications(event?: Event) {
    event?.stopPropagation();
    this.closeMenu();
    this.isNotificationsOpen = true;
  }

  closeNotifications() {
    this.isNotificationsOpen = false;
    this.notificationService.markAllRead();
  }

  viewAllNotifications() {
    this.closeNotifications();
    this.router.navigate(['/user/notifications']);
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
}
