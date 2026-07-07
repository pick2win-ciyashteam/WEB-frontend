import { Component, OnDestroy, OnInit } from '@angular/core';
import { AuthModalService } from './core/services/auth-modal.service';
import { Subject, filter, takeUntil } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { FirebaseNotificationService } from './core/services/firebase-notification.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'pick2winWeb';
  private destroy$ = new Subject<void>();

  constructor(
    public authModal: AuthModalService,
    private authService: AuthService,
    private notificationService: FirebaseNotificationService
  ) {}

  ngOnInit() {
    this.notificationService.requestPermissionOnAppOpen();

    this.authService.loggedIn$
      .pipe(
        filter(Boolean),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.notificationService.initializeAfterLogin();
        this.notificationService.loadNotifications(1, 20).subscribe();
      });
  }

  closeAuthModal() {
    this.authModal.close();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
