import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-admin-header',
  templateUrl: './admin-header.component.html',
  styleUrls: ['./admin-header.component.css']
})
export class AdminHeaderComponent {
  @Input() title = 'Dashboard';
  @Input() crumb = 'Overview';
  @Output() menuClicked = new EventEmitter<void>();
  @Output() logoutClicked = new EventEmitter<void>();

  formatFxInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value);

    input.value = Number.isFinite(value) && value >= 0 ? value.toFixed(2) : '0.00';
  }
}
