import { Component } from '@angular/core';
import { ApiService } from 'src/app/core/services/api.service';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent {
  loggedIn$ = this.authService.loggedIn$;
  supportOpen = false;
  supportSubmitted = false;
  supportSubmitting = false;
  supportError = '';

  constructor(
    private authService: AuthService,
    private api: ApiService
  ) {}

  toggleSupport(): void {
    this.supportOpen = !this.supportOpen;

    if (!this.supportOpen) {
      this.supportSubmitted = false;
      this.supportError = '';
    }
  }

  closeSupport(): void {
    this.supportOpen = false;
    this.supportSubmitted = false;
    this.supportSubmitting = false;
    this.supportError = '';
  }

  submitSupport(event: Event, subjectInput: HTMLInputElement, messageInput: HTMLTextAreaElement): void {
    event.preventDefault();

    const subject = subjectInput.value.trim();
    const message = messageInput.value.trim();

    if (!subject || !message || this.supportSubmitting) {
      return;
    }

    this.supportSubmitting = true;
    this.supportSubmitted = false;
    this.supportError = '';

    this.api.postSupport({ subject, message }).subscribe({
      next: (res) => {
        this.supportSubmitting = false;

        if (res?.success === false) {
          this.supportError = res?.message || 'Unable to submit your message. Please try again.';
          return;
        }

        subjectInput.value = '';
        messageInput.value = '';
        this.supportSubmitted = true;
      },
      error: (err) => {
        this.supportSubmitting = false;
        this.supportError = err?.error?.message || err?.error?.error || 'Unable to submit your message. Please try again.';
      }
    });
  }
}
