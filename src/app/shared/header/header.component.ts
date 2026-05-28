import { Component } from '@angular/core';
import { AuthModalService } from 'src/app/core/services/auth-modal.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {

  isMenuOpen = false;
  hideNotice = localStorage.getItem('p2w_region_dismiss') === '1';

    constructor(private authModal: AuthModalService) {}

     openLogin() {
    this.closeMenu();
    this.authModal.open('login');
  }

  openSignup() {
    this.closeMenu();
    this.authModal.open('signup');
  }


  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu() {
    this.isMenuOpen = false;
  }

  dismissNotice() {
    this.hideNotice = true;
    localStorage.setItem('p2w_region_dismiss', '1');
  }
}