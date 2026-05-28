import { Component } from '@angular/core';
import { AuthModalService } from './core/services/auth-modal.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'pick2winWeb';

    constructor(public authModal: AuthModalService) {}

  closeAuthModal() {
    this.authModal.close();
  }

}
