import { Component, OnInit } from '@angular/core';
import { AppNotification, FirebaseNotificationService } from 'src/app/core/services/firebase-notification.service';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent implements OnInit {
  notifications$ = this.notificationService.notifications$;
  loading = false;

  constructor(private notificationService: FirebaseNotificationService) {}

  ngOnInit() {
    this.loadNotifications();
  }

  loadNotifications() {
    this.loading = true;
    this.notificationService.loadNotifications(1, 20).subscribe({
      next: () => this.loading = false,
      error: () => this.loading = false
    });
  }

  markRead(notification: AppNotification) {
    if (notification.read) return;
    this.notificationService.markNotificationRead(notification.id).subscribe();
  }

  deleteNotification(event: Event, notification: AppNotification) {
    event.stopPropagation();
    this.notificationService.deleteNotification(notification.id).subscribe();
  }
}
