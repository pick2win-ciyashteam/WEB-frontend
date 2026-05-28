import { Component } from '@angular/core';
import { AuthModalService } from 'src/app/core/services/auth-modal.service';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css']
})
export class AboutComponent {
  loggedIn$ = this.authService.loggedIn$;

  constructor(
    private authModal: AuthModalService,
    private authService: AuthService
  ) {}

  openSignup() {
    this.authModal.open('signup');
  }

  openLogin() {
    this.authModal.open('login');
  }
}
