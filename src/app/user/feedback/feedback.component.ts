import { Component } from '@angular/core';

@Component({
  selector: 'app-feedback',
  templateUrl: './feedback.component.html',
  styleUrls: ['./feedback.component.css']
})
export class FeedbackComponent {
  surveySubmitted = false;
  feedbackSubmitted = false;
  surveyRef = '';
  feedbackRef = '';

  submitSurvey(event: Event) {
    event.preventDefault();
    this.surveyRef = 'P2W-SUR-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    this.surveySubmitted = true;
  }

  resetSurvey() {
    this.surveySubmitted = false;
  }

  submitFeedback(event: Event) {
    event.preventDefault();
    this.feedbackRef = 'P2W-FB-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    this.feedbackSubmitted = true;
  }

  resetFeedbackForm() {
    this.feedbackSubmitted = false;
  }

}
