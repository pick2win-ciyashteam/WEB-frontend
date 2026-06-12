import { Component } from '@angular/core';

@Component({
  selector: 'app-faq',
  templateUrl: './faq.component.html',
  styleUrls: ['./faq.component.css']
})
export class FaqComponent {
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
