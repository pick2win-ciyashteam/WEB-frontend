import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, isSupported, Messaging, onMessage } from 'firebase/messaging';
import { ApiService } from './api.service';
import { UserNotificationRaw } from '../interfaces/content';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  raw?: UserNotificationRaw;
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
  loading$ = new BehaviorSubject<boolean>(false);
  error$ = new BehaviorSubject<string>('');

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
    const payload = {
      registration_token: fcmToken,
      device_type: 'web'
    } as const;

    console.log('[FCM] Sending browser token to register-device:', payload);
    return this.api.registerDevice(payload);
  }

  loadNotifications(page = 1, limit = 20): Observable<AppNotification[]> {
    this.loading$.next(true);
    this.error$.next('');

    return this.api.getUserNotifications(page, limit).pipe(
      tap(response => console.log('[Notifications API] get-notification response:', response)),
      map(response => {
        const rawNotifications = this.getNotificationItems(response);
        const notifications = rawNotifications
          .map(item => this.normalizeNotification(item))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        this.notificationsSubject.next(notifications);
        this.unreadCount$.next(this.getUnreadCount(response, notifications));
        this.loading$.next(false);
        return notifications;
      }),
      catchError(error => {
        console.error('[Notifications API] get-notification failed:', error);
        this.loading$.next(false);
        this.error$.next(error?.error?.message || error?.error?.error || 'Unable to load notifications.');
        return of(this.notificationsSubject.value);
      })
    );
  }

  markNotificationRead(id: number | string): Observable<any> {
    return this.api.markUserNotificationRead(id).pipe(
      tap(response => console.log('[Notifications API] notification/read response:', response)),
      tap(() => {
        const notifications = this.notificationsSubject.value.map(item =>
          String(item.id) === String(id) ? { ...item, read: true } : item
        );

        this.notificationsSubject.next(notifications);
        this.updateUnreadCount(notifications);
        this.loadNotifications(1, 20).subscribe();
      }),
      catchError(error => {
        console.error('[Notifications API] notification/read failed:', error);
        return of(null);
      })
    );
  }

  deleteNotification(id: number | string): Observable<any> {
    return this.api.deleteUserNotification(id).pipe(
      tap(response => console.log('[Notifications API] notification delete response:', response)),
      tap(() => {
        const notifications = this.notificationsSubject.value.filter(item => String(item.id) !== String(id));
        this.notificationsSubject.next(notifications);
        this.updateUnreadCount(notifications);
        this.loadNotifications(1, 20).subscribe();
      }),
      catchError(error => {
        console.error('[Notifications API] notification delete failed:', error);
        return of(null);
      })
    );
  }

  markAllRead(): void {
    const unreadNotifications = this.notificationsSubject.value.filter(item => !item.read);

    unreadNotifications.forEach(notification => {
      this.markNotificationRead(notification.id).subscribe();
    });
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

  private normalizeNotification(item: UserNotificationRaw): AppNotification {
    const id = item.id ?? item._id ?? item.notification_id ?? `${Date.now()}-${Math.random()}`;
    const title = item.title ?? item.subject ?? 'Pick2Win notification';
    const body = item.message ?? item.body ?? item.description ?? item.content ?? 'You have a new update.';
    const createdAt = item.created_at ?? item.createdAt ?? item.updated_at ?? new Date().toISOString();
    const readValue = item.is_read ?? item.read ?? item.read_at ?? false;

    return {
      id: String(id),
      title: String(title),
      body: String(body),
      createdAt: String(createdAt),
      read: this.toBoolean(readValue),
      raw: item
    };
  }

  private getNotificationItems(response: any): UserNotificationRaw[] {
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.notifications)) return response.notifications;
    if (Array.isArray(response?.data?.notifications)) return response.data.notifications;
    if (Array.isArray(response?.data?.data)) return response.data.data;

    return [];
  }

  private getUnreadCount(response: any, notifications: AppNotification[]): number {
    const unreadCount = response?.unread_count
      ?? response?.unreadCount
      ?? response?.count
      ?? response?.data?.unread_count
      ?? response?.data?.unreadCount;

    return unreadCount === undefined || unreadCount === null
      ? notifications.filter(item => !item.read).length
      : Number(unreadCount);
  }

  private toBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
      const normalized = value.toLowerCase().trim();
      return ['1', 'true', 'yes', 'read'].includes(normalized) || normalized.length > 9;
    }

    return Boolean(value);
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
