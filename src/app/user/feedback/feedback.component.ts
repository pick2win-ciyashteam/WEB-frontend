import { Component, OnInit } from '@angular/core';
import { FeedbackPostPayload, FeedbackQuestion } from 'src/app/core/interfaces/content';
import { ApiService } from 'src/app/core/services/api.service';

interface UserFeedbackItem {
  id: number;
  title: string;
  message: string;
  created_at: string;
  status:string;
}

@Component({
  selector: 'app-feedback',
  templateUrl: './feedback.component.html',
  styleUrls: ['./feedback.component.css']
})
export class FeedbackComponent implements OnInit {
  surveySubmitted = false;
  feedbackSubmitted = false;
  surveyRef = '';
  feedbackRef = '';
  feedbackItems: UserFeedbackItem[] = [];
  feedbackQuestions: FeedbackQuestion[] = [];
  selectedAnswers: Record<number, number> = {};
  loadingFeedback = true;
  loadingQuestions = true;
  feedbackLoadError = '';
  surveyLoadError = '';
  surveySubmitError = '';
  feedbackSubmitError = '';
  submittingSurvey = false;
  submittingFeedback = false;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadFeedback();
    this.loadFeedbackQuestions();
  }

  submitSurvey(event: Event): void {
    event.preventDefault();
    this.surveySubmitError = '';

    const missingQuestion = this.feedbackQuestions.find(question =>
      Number(question.is_mandatory) === 1 && !this.selectedAnswers[question.id]
    );

    if (missingQuestion) {
      this.surveySubmitError = 'Please answer all mandatory survey questions.';
      return;
    }

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const comment = String(formData.get('survey_comment') || '').trim();
    const answers = Object.entries(this.selectedAnswers).map(([questionId, optionId]) => ({
      question_id: Number(questionId),
      option_id: Number(optionId)
    }));

    this.submittingSurvey = true;
    this.api.postFeedbackAnswers({ answers, comment })
      .subscribe({
        next: (res) => {
          this.submittingSurvey = false;
          this.surveyRef = String(res?.data?.reference || res?.reference || res?.id || this.localRef('SUR'));
          this.surveySubmitted = true;
        },
        error: (err) => {
          this.submittingSurvey = false;
          this.surveySubmitError = err?.error?.message || err?.error?.error || 'Unable to submit survey. Please try again.';
        }
      });
  }

  resetSurvey(): void {
    this.surveySubmitted = false;
  }

  selectSurveyAnswer(questionId: number, optionId: number): void {
    this.selectedAnswers[questionId] = optionId;
  }

  submitFeedback(event: Event): void {
    event.preventDefault();
    this.feedbackSubmitError = '';

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const payload: FeedbackPostPayload = {
      category: String(formData.get('category') || ''),
      importance: String(formData.get('importance') || ''),
      subject: String(formData.get('subject') || '').trim(),
      description: String(formData.get('description') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      location: String(formData.get('location') || ''),
      email_followup: formData.get('email_followup') === 'true'
    };

    if (!payload.category || !payload.subject || !payload.description) {
      this.feedbackSubmitError = 'Please fill category, subject, and suggestion.';
      return;
    }

    this.submittingFeedback = true;
    this.api.postFeedback(payload)
      .subscribe({
        next: (res) => {
          console.log(res);
          this.submittingFeedback = false;
          this.feedbackRef = String(res?.data?.reference || res?.reference || res?.id || this.localRef('FB'));
          this.feedbackSubmitted = true;
          form.reset();
          this.loadFeedback();
        },
        error: (err) => {
          this.submittingFeedback = false;
          this.feedbackSubmitError = err?.error?.message || err?.error?.error || 'Unable to submit feedback. Please try again.';
        }
      });
  }

  resetFeedbackForm(): void {
    this.feedbackSubmitted = false;
  }

  formatFeedbackDate(value: string): string {
    if (!value) {
      return '-';
    }

    return new Intl.DateTimeFormat('en-GB', {
      month: 'short',
      year: 'numeric'
    }).format(new Date(value));
  }

  feedbackTitle(title: string): string {
    return (title || 'Feedback').replace(/_/g, ' ');
  }

  trackFeedback(_: number, item: UserFeedbackItem): number {
    return item.id;
  }

  trackQuestion(_: number, question: FeedbackQuestion): number {
    return question.id;
  }

  trackOption(_: number, option: { id: number }): number {
    return option.id;
  }

  private loadFeedback(): void {
    this.loadingFeedback = true;
    this.feedbackLoadError = '';

    this.api.getFeedback().subscribe({
      next: (res) => {
        this.feedbackItems = res?.success && Array.isArray(res.data) ? res.data : [];
        this.loadingFeedback = false;
      },
      error: (err) => {
        this.feedbackItems = [];
        this.loadingFeedback = false;
        this.feedbackLoadError = err?.error?.message || 'Unable to load recent user feedback.';
      }
    });
  }

  private loadFeedbackQuestions(): void {
    this.loadingQuestions = true;
    this.surveyLoadError = '';

    this.api.getFeedbackQuestions().subscribe({
      next: (res) => {
        this.feedbackQuestions = res?.success && Array.isArray(res.data)
          ? [...res.data].sort((a, b) => a.sort_order - b.sort_order)
          : [];
        this.loadingQuestions = false;
      },
      error: (err) => {
        this.feedbackQuestions = [];
        this.loadingQuestions = false;
        this.surveyLoadError = err?.error?.message || 'Unable to load survey questions.';
      }
    });
  }

  private localRef(prefix: string): string {
    return `P2W-${prefix}-` + Math.random().toString(36).slice(2, 8).toUpperCase();
  }

}
