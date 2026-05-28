import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type AuthModalType = 'login' | 'signup' | null;

@Injectable({
  providedIn: 'root'
})
export class AuthModalService {
  modal$ = new BehaviorSubject<AuthModalType>(null);

  open(type: 'login' | 'signup') {
    this.modal$.next(type);
  }

  close() {
    this.modal$.next(null);
  }
}