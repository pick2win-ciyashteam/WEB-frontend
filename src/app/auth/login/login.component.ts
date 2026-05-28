import { Component } from '@angular/core';
import { AuthModalService } from 'src/app/core/services/auth-modal.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  
    constructor(private authModal: AuthModalService) {}

  openSignup() {
    this.authModal.open('signup');
  }

}
