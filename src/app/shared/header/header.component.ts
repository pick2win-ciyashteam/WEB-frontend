import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, filter, takeUntil } from 'rxjs';
import { AuthModalService } from 'src/app/core/services/auth-modal.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { AppNotification, FirebaseNotificationService } from 'src/app/core/services/firebase-notification.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class  HeaderComponent implements OnInit, OnDestroy {

  isMenuOpen = false;
  isNotificationsOpen = false;
  hideNotice = localStorage.getItem('p2w_region_dismiss') === '1';
  private destroy$ = new Subject<void>();

  loggedIn$ = this.authService.loggedIn$;
  notifications$ = this.notificationService.notifications$;
  unreadCount$ = this.notificationService.unreadCount$;

  constructor(
    private authModal: AuthModalService,
    private authService: AuthService,
    private notificationService: FirebaseNotificationService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loggedIn$
      .pipe(
        filter(Boolean),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.notificationService.loadNotifications(1, 20).subscribe();
      });
  }

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
    this.notificationService.loadNotifications(1, 20).subscribe();
  }

  closeNotifications() {
    this.isNotificationsOpen = false;
  }

  viewAllNotifications() {
    this.closeNotifications();
    this.router.navigate(['/user/notifications']);
  }

  getHeaderNotifications(notifications: AppNotification[]): AppNotification[] {
    const todayOrUnread = notifications.filter(notification => !notification.read || this.isToday(notification.createdAt));
    return (todayOrUnread.length ? todayOrUnread : notifications).slice(0, 5);
  }

  markRead(notification: AppNotification) {
    if (notification.read) return;
    this.notificationService.markNotificationRead(notification.id).subscribe();
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

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private isToday(dateValue: string): boolean {
    const date = new Date(dateValue);
    const today = new Date();

    return date.getFullYear() === today.getFullYear()
      && date.getMonth() === today.getMonth()
      && date.getDate() === today.getDate();
  }
}
