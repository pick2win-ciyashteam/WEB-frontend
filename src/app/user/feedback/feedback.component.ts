import { Component, OnInit } from '@angular/core';
import { FeedbackPostPayload, FeedbackQuestion } from 'src/app/core/interfaces/content';
import { ApiService } from 'src/app/core/services/api.service';
import { ProfileService } from 'src/app/core/services/profile.service';

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
  feedbackTab: 'vote' | 'suggest' = 'vote';
  surveySubmitted = false;
  feedbackSubmitted = false;
  surveyRef = '';
  feedbackRef = '';
  feedbackItems: UserFeedbackItem[] = [];
  feedbackQuestions: FeedbackQuestion[] = [];
  loadingFeedback = true;
  loadingQuestions = true;
  feedbackLoadError = '';
  surveyLoadError = '';
  surveySubmitError = '';
  feedbackSubmitError = '';
  submittingSurvey = false;
  submittingFeedback = false;
  surveyComplete = false;
  profileEmail = '';

  constructor(private api: ApiService, private profileService: ProfileService) {}

  ngOnInit(): void {
    this.loadFeedback();
    this.loadFeedbackQuestions();
    this.profileService.loadProfile().subscribe({
      next: () => this.profileEmail = this.profileService.profile?.email || '',
      error: () => this.profileEmail = ''
    });
  }

  submitSurvey(event: Event): void {
    event.preventDefault();
    this.surveySubmitError = '';

    if (this.surveySubmitted) {
      this.surveySubmitError = 'You have already submitted your vote.';
      return;
    }

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    if (!this.isSurveyFormComplete(formData)) {
      this.surveySubmitError = 'Please answer all required vote questions before submitting.';
      return;
    }

    const rating = Number(formData.get('uct_rating') || 0);

    const payload = {
      answers: {
        q1: String(formData.get('uct_sentiment') || ''),
        q2: formData.getAll('uct_changes').map(String),
        q3: String(formData.get('uct_frequency') || ''),
        q4: String(formData.get('uct_recommend') || ''),
        q5: String(formData.get('uct_team_need') || ''),
        q6: String(formData.get('uct_competitions') || '').trim(),
        q7: String(formData.get('uct_next_sport') || ''),
        q8: String(formData.get('uct_pricing') || ''),
        q9: String(formData.get('uct_device') || ''),
        q10: String(formData.get('survey_comment') || '').trim(),
        q11: rating
      }
    };

    this.submittingSurvey = true;
    this.api.postFeedbackAnswers(payload)
      .subscribe({
        next: (res) => {
          this.submittingSurvey = false;

          if (res?.already_submitted) {
            this.markSurveySubmitted(res, true);
            return;
          }

          if (res?.success === false) {
            this.surveySubmitError = res?.message || 'Unable to submit survey. Please try again.';
            return;
          }

          this.markSurveySubmitted(res, true);
        },
        error: (err) => {
          this.submittingSurvey = false;

          if (err?.error?.already_submitted) {
            this.markSurveySubmitted(err.error, true);
            return;
          }

          this.surveySubmitError = err?.error?.message || err?.error?.error || 'Unable to submit survey. Please try again.';
        }
      });
  }

  resetSurvey(): void {
    this.surveySubmitError = 'You have already submitted your vote.';
  }

  updateSurveyCompletion(form: HTMLFormElement): void {
    this.surveyComplete = this.isSurveyFormComplete(new FormData(form));
  }

  setFeedbackTab(tab: 'vote' | 'suggest'): void {
    this.feedbackTab = tab;
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
      email: this.profileEmail || String(formData.get('email') || '').trim(),
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
       
          this.submittingFeedback = false;
          this.feedbackRef = String(res?.data?.reference || res?.reference || res?.id || this.localRef('FB'));
          this.feedbackSubmitted = true;
          this.feedbackTab = 'suggest';
          form.reset();
          this.scrollToMessage('feedbackThanksMessage');
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

  questionText(questionNumber: number, fallback: string): string {
    return this.feedbackQuestions[questionNumber - 1]?.question || fallback;
  }

  questionHint(questionNumber: number, fallback = ''): string {
    return this.feedbackQuestions[questionNumber - 1]?.hint || fallback;
  }

  private isSurveyFormComplete(formData: FormData): boolean {
    return !!String(formData.get('uct_sentiment') || '')
      && formData.getAll('uct_changes').length > 0
      && !!String(formData.get('uct_frequency') || '')
      && !!String(formData.get('uct_recommend') || '')
      && !!String(formData.get('uct_team_need') || '')
      && !!String(formData.get('uct_competitions') || '').trim()
      && !!String(formData.get('uct_next_sport') || '')
      && !!String(formData.get('uct_pricing') || '')
      && !!String(formData.get('uct_device') || '')
      && !!String(formData.get('survey_comment') || '').trim()
      && Number(formData.get('uct_rating') || 0) > 0;
  }

  private markSurveySubmitted(res: any, scrollToSuccess = false): void {
    this.surveyRef = String(res?.data?.reference || res?.reference || res?.id || 'Submitted');
    this.surveySubmitted = true;
    this.feedbackTab = 'vote';
    this.surveySubmitError = '';

    if (scrollToSuccess) {
      this.scrollToMessage('surveyThanksMessage');
    }
  }

  private scrollToMessage(id: string): void {
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }, 50);
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
        if (res?.already_submitted) {
          this.feedbackQuestions = [];
          this.loadingQuestions = false;
          this.markSurveySubmitted(res);
          return;
        }

        this.feedbackQuestions = res?.success && Array.isArray(res.data)
          ? [...res.data].sort((a, b) => (a.sort_order - b.sort_order) || (a.id - b.id))
          : [];
        this.surveySubmitted = false;
        this.loadingQuestions = false;
      },
      error: (err) => {
        if (err?.error?.already_submitted) {
          this.feedbackQuestions = [];
          this.loadingQuestions = false;
          this.markSurveySubmitted(err.error);
          return;
        }

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
