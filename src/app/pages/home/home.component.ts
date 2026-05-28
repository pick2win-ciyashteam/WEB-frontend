import { Component, OnDestroy, OnInit } from '@angular/core';
import { AuthModalService } from 'src/app/core/services/auth-modal.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {

  launchStatus = 'LAUNCHING SOON';

  days = '00';
  hours = '00';
  minutes = '00';
  seconds = '00';

  private timer: any;
  private launchDate = new Date('2026-06-10T09:00:00Z').getTime();

  constructor(private authModal: AuthModalService) {}

   openSignup() {
    this.authModal.open('signup');
  }

  ngOnInit(): void {
    this.updateCountdown();
    this.timer = setInterval(() => this.updateCountdown(), 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  updateCountdown(): void {
    const now = new Date().getTime();
    const diff = this.launchDate - now;

    if (diff <= 0) {
      this.launchStatus = 'LIVE NOW';
      this.days = this.hours = this.minutes = this.seconds = '00';
      clearInterval(this.timer);
      return;
    }

    this.days = String(Math.floor(diff / (1000 * 60 * 60 * 24))).padStart(2, '0');
    this.hours = String(Math.floor((diff / (1000 * 60 * 60)) % 24)).padStart(2, '0');
    this.minutes = String(Math.floor((diff / (1000 * 60)) % 60)).padStart(2, '0');
    this.seconds = String(Math.floor((diff / 1000) % 60)).padStart(2, '0');
  }
}