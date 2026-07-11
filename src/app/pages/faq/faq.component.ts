import { AfterViewInit, Component, ElementRef, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-faq',
  templateUrl: './faq.component.html',
  styleUrls: ['./faq.component.css']
})
export class FaqComponent implements AfterViewInit, OnDestroy {
  private sectionObserver?: IntersectionObserver;

  constructor(private host: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    const root = this.host.nativeElement;
    const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('.secnav-link'));
    const linksBySection = new Map(
      links.map(link => [link.getAttribute('href')?.slice(1) || '', link])
    );

    this.sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) {
          return;
        }

        links.forEach(link => link.classList.remove('active'));
        linksBySection.get(entry.target.id)?.classList.add('active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    root.querySelectorAll<HTMLElement>('.faq-section')
      .forEach(section => this.sectionObserver?.observe(section));
  }

  filterFaqs(event: Event): void {
    const query = (event.target as HTMLInputElement).value.trim().toLowerCase();
    const root = this.host.nativeElement;
    const items = Array.from(root.querySelectorAll<HTMLDetailsElement>('.faq-item'));
    const sections = Array.from(root.querySelectorAll<HTMLElement>('.faq-section'));
    let shown = 0;

    items.forEach(item => {
      const searchableText = `${item.dataset['q'] || ''} ${item.textContent || ''}`.toLowerCase();
      const matches = !query || searchableText.includes(query);
      item.hidden = !matches;
      item.open = !!query && query.length > 2 && matches;
      if (matches) shown++;
    });

    sections.forEach(section => {
      const hasVisibleQuestion = Array.from(section.querySelectorAll<HTMLElement>('.faq-item'))
        .some(item => !item.hidden);
      section.classList.toggle('hidden', !hasVisibleQuestion);
    });

    root.querySelector('#noResults')?.classList.toggle('show', shown === 0);
    const meta = root.querySelector<HTMLElement>('#searchMeta');
    if (meta) {
      meta.textContent = query ? `${shown} of ${items.length} questions` : '';
    }
  }

  scrollToSection(event: Event, sectionId: string): void {
    event.preventDefault();
    this.host.nativeElement.querySelector<HTMLElement>(`#${sectionId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  ngOnDestroy(): void {
    this.sectionObserver?.disconnect();
  }
}
