import { Component } from '@angular/core';
import { AuthModalService } from 'src/app/core/services/auth-modal.service';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-faq',
  templateUrl: './faq.component.html',
  styleUrls: ['./faq.component.css']
})
export class FaqComponent {
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
