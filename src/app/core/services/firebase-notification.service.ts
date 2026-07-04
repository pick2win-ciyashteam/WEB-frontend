import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, isSupported, Messaging, onMessage } from 'firebase/messaging';
import { ApiService } from './api.service';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

const firebaseConfig = {
  apiKey: 'AIzaSyBiB9-yJalqm-HItd0YTU3LhhqdCJhEnYk',
  authDomain: 'pick2win-9c092.firebaseapp.com',
  projectId: 'pick2win-9c092',
  storageBucket: 'pick2win-9c092.firebasestorage.app',
  messagingSenderId: '963173256978',
  appId: '1:963173256978:web:5c8b33c4d25a94a2222dcb',
  measurementId: 'G-9N90G7RD0B'
};

const vapidKey = 'BCGkqcMrgTACMDUZQc_KYQuu0heV0MQxSJsvaqtjwSYPTvsApVY0ZAhU0fjNHccL30C1Ob0lAtbT15iQpxm4YBs';

@Injectable({
  providedIn: 'root'
})
export class FirebaseNotificationService {
  private app = initializeApp(firebaseConfig);
  private messaging?: Messaging;
  private tokenRegistered = false;
  private foregroundListenerStarted = false;
  private clickPermissionFallbackAdded = false;

  private notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
  notifications$ = this.notificationsSubject.asObservable();

  unreadCount$ = new BehaviorSubject<number>(0);

  constructor(
    private api: ApiService,
    private zone: NgZone
  ) {}

  async requestPermissionOnAppOpen(): Promise<void> {
    console.log('[FCM] requestPermissionOnAppOpen called');

    if (!this.isBrowser()) {
      console.warn('[FCM] Browser notification/service worker APIs are not available');
      return;
    }

    console.log('[FCM] Current notification permission:', Notification.permission);

    if (Notification.permission === 'granted') {
      console.log('[FCM] Notification permission already granted');
      return;
    }

    if (Notification.permission === 'denied') {
      console.warn('[FCM] Notification permission is denied. Enable it from browser site settings.');
      return;
    }

    const supported = await isSupported().catch((err) => {
      console.error('[FCM] Support check failed:', err);
      return false;
    });

    console.log('[FCM] Messaging supported:', supported);
    if (!supported) return;

    const permission = await Notification.requestPermission();
    console.log('[FCM] Notification permission after app-open prompt:', permission);

    if (permission !== 'granted') {
      this.addClickPermissionFallback();
    }
  }

  async initializeAfterLogin(): Promise<void> {
    console.log('[FCM] initializeAfterLogin called');

    if (this.tokenRegistered) {
      console.log('[FCM] Token already registered in this session');
      return;
    }

    if (!this.isBrowser()) {
      console.warn('[FCM] Browser notification/service worker APIs are not available');
      return;
    }

    const supported = await isSupported().catch((err) => {
      console.error('[FCM] Support check failed:', err);
      return false;
    });

    console.log('[FCM] Messaging supported:', supported);
    if (!supported) return;

    const permission = await Notification.requestPermission();
    console.log('[FCM] Notification permission:', permission);
    if (permission !== 'granted') {
      console.warn('[FCM] Notification permission not granted. Enable notifications in browser site settings to test push messages.');
      this.addClickPermissionFallback();
      return;
    }

    const serviceWorkerRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('[FCM] Service worker registered:', serviceWorkerRegistration);

    this.messaging = getMessaging(this.app);

    const fcmToken = await getToken(this.messaging, {
      vapidKey,
      serviceWorkerRegistration
    });

    console.log('[FCM] Token generated:', fcmToken);

    if (!fcmToken) {
      console.warn('[FCM] Firebase FCM token not generated.');
      return;
    }

    this.registerDevice(fcmToken).subscribe({
      next: (res) => {
        console.log('[FCM] register-device success:', res);
        this.tokenRegistered = true;
      },
      error: (err) => {
        console.error('[FCM] register-device failed:', err);
      }
    });

    this.startForegroundListener();
  }

  private startForegroundListener(): void {
    if (!this.messaging || this.foregroundListenerStarted) return;

    this.foregroundListenerStarted = true;

    onMessage(this.messaging, payload => {
      console.log('[FCM] Foreground message received:', payload);

      this.zone.run(() => {
        const notification: AppNotification = {
          id: payload.messageId || `${Date.now()}`,
          title: payload.notification?.title || payload.data?.['title'] || 'Pick2Win notification',
          body: payload.notification?.body || payload.data?.['body'] || 'You have a new update.',
          createdAt: new Date().toISOString(),
          read: false
        };

        this.addNotification(notification);
      });
    });
  }

  private addClickPermissionFallback(): void {
    if (this.clickPermissionFallbackAdded || !this.isBrowser() || Notification.permission !== 'default') return;

    this.clickPermissionFallbackAdded = true;
    console.log('[FCM] Adding one-time click fallback for notification permission prompt');

    document.addEventListener('click', async () => {
      const permission = await Notification.requestPermission();
      console.log('[FCM] Notification permission after click fallback:', permission);
    }, { once: true });
  }

  registerDevice(fcmToken: string): Observable<any> {
    return this.api.registerDevice({
      fcm_token: fcmToken,
      device_type: 'web'
    });
  }

  loadNotifications(): Observable<AppNotification[]> {
    return of(this.notificationsSubject.value);
  }

  markAllRead(): void {
    const notifications = this.notificationsSubject.value.map(item => ({ ...item, read: true }));
    this.notificationsSubject.next(notifications);
    this.updateUnreadCount(notifications);
  }

  clearSession(): void {
    this.tokenRegistered = false;
    this.notificationsSubject.next([]);
    this.unreadCount$.next(0);
  }

  private addNotification(notification: AppNotification): void {
    const notifications = [notification, ...this.notificationsSubject.value].slice(0, 50);
    this.notificationsSubject.next(notifications);
    this.updateUnreadCount(notifications);
  }

  private updateUnreadCount(notifications: AppNotification[]): void {
    this.unreadCount$.next(notifications.filter(item => !item.read).length);
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined'
      && typeof navigator !== 'undefined'
      && 'serviceWorker' in navigator
      && typeof Notification !== 'undefined';
  }
}
