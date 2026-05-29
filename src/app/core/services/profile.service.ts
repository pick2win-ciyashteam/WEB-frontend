import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, tap } from 'rxjs';
import { UserProfile } from '../interfaces/content';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private profileSubject = new BehaviorSubject<UserProfile | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string>('');

  profile$ = this.profileSubject.asObservable();
  loading$ = this.loadingSubject.asObservable();
  error$ = this.errorSubject.asObservable();

  constructor(private api: ApiService) { }

  get profile(): UserProfile | null {
    return this.profileSubject.value;
  }

  loadProfile(force = false): Observable<unknown> {
    if (this.profileSubject.value && !force) {
      return of(this.profileSubject.value);
    }

    this.loadingSubject.next(true);
    this.errorSubject.next('');

    return this.api.getProfile().pipe(
      tap({
        next: (res) => {
          this.profileSubject.next(res?.success ? res.data : null);
          this.loadingSubject.next(false);

          if (!res?.success) {
            this.errorSubject.next('Unable to load profile.');
          }
        },
        error: (err) => {
          this.profileSubject.next(null);
          this.loadingSubject.next(false);
          this.errorSubject.next(err?.error?.message || 'Unable to load profile.');
        }
      })
    );
  }

  clearProfile(): void {
    this.profileSubject.next(null);
    this.errorSubject.next('');
    this.loadingSubject.next(false);
  }
}
