import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';

export type AuthModalType = 'login' | 'signup' | null;

@Injectable({
  providedIn: 'root'
})
export class AuthModalService {
  modal$ = new BehaviorSubject<AuthModalType>(null);

  constructor(private router: Router) {}

  open(type: 'login' | 'signup') {
    this.modal$.next(null);
    this.router.navigate(['/auth', type]);
  }

  close() {
    this.modal$.next(null);
  }
}
