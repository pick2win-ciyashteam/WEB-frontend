import { Component } from '@angular/core';
import { FirebaseNotificationService } from 'src/app/core/services/firebase-notification.service';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent {
  notifications$ = this.notificationService.notifications$;

  constructor(private notificationService: FirebaseNotificationService) {
    this.notificationService.loadNotifications().subscribe();
    this.notificationService.markAllRead();
  }
}
