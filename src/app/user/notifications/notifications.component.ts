import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { AppNotification, FirebaseNotificationService } from 'src/app/core/services/firebase-notification.service';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent implements OnInit {
  notifications$ = this.notificationService.notifications$;
  loading$ = this.notificationService.loading$;
  error$ = this.notificationService.error$;
  deletingAll = false;

  constructor(private notificationService: FirebaseNotificationService) {}

  ngOnInit() {
    this.loadNotifications();
  }

  loadNotifications() {
    this.notificationService.loadNotifications(1, 20).subscribe();
  }

  markRead(notification: AppNotification) {
    if (notification.read) return;
    this.notificationService.markNotificationRead(notification.id).subscribe();
  }

  deleteNotification(event: Event, notification: AppNotification) {
    event.stopPropagation();
    this.notificationService.deleteNotification(notification.id).subscribe();
  }

  deleteAllNotifications() {
    if (this.deletingAll) return;

    this.deletingAll = true;
    this.notificationService.deleteAllNotifications()
      .pipe(finalize(() => this.deletingAll = false))
      .subscribe();
  }
}
