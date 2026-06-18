import { Component } from '@angular/core';

@Component({
  selector: 'app-faq',
  templateUrl: './faq.component.html',
  styleUrls: ['./faq.component.css']
})
export class FaqComponent {
  readonly legends = [
    { className: 'legend-positive', label: 'Good to know' },
    { className: 'legend-important', label: 'Important' },
    { className: 'legend-critical', label: 'Please note' },
    { className: 'legend-general', label: 'General info' }
  ];

  closeOtherFaqs(event: Event) {
    const current = event.target as HTMLDetailsElement;

    if (!current.open) {
      return;
    }

    current
      .closest('.faq-list')
      ?.querySelectorAll<HTMLDetailsElement>('details.faq')
      .forEach((item) => {
        if (item !== current) {
          item.open = false;
        }
      });
  }
}
