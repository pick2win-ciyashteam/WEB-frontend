import { Component, OnInit } from '@angular/core';
import { FeedbackPostPayload, FeedbackQuestion } from 'src/app/core/interfaces/content';
import { ApiService } from 'src/app/core/services/api.service';
import { ProfileService } from 'src/app/core/services/profile.service';

interface UserFeedbackItem {
  id: number | string;
  title: string;
  message: string;
  created_at: string;
  status: string;
}

@Component({
  selector: 'app-feedback',
  templateUrl: './feedback.component.html',
  styleUrls: ['./feedback.component.css']
})
export class FeedbackComponent implements OnInit {
  readonly newSurveyQuestions = [
    { n: 1, name: 'uct_sentiment', text: 'Overall, how do you feel about PICK2WIN UCT today?', options: [['love','Love it'],['like','Like it'],['neutral','Neutral'],['dislike','Dislike'],['strong-dislike','Strongly dislike']] },
    { n: 2, name: 'uct_likes', text: 'What do you like most?', multiple: true, optional: true, options: [['fast','Fast team generation'],['time','Saves preparation time'],['variety','Team variety'],['captain','Captain / Vice-Captain options'],['strategy','Strategy controls'],['rules','Platform-specific lineup rules'],['txt','TXT download'],['combos','Multiple team combinations']] },
    { n: 3, name: 'uct_changes', text: 'What should we improve first?', multiple: true, hint: 'Choose up to 3 - at least one required', options: [['gen','Team generation quality'],['diversity','Team diversity'],['cvc','Captain / Vice-Captain logic'],['ui','User interface'],['perf','Performance'],['exports','Downloads & exports'],['comps','More football competitions'],['platforms','More fantasy platforms'],['exposure','Player Exposure %'],['mobile','Mobile experience']] },
    { n: 4, name: 'uct_platform_use', text: 'Which fantasy platform do you currently use most?', options: [['dk','DraftKings'],['fd','FanDuel'],['both','Both equally'],['neither','Neither currently']] },
    { n: 5, name: 'uct_platform_p2w', text: 'Which supported fantasy platform do you use with PICK2WIN most often?', options: [['dk','DraftKings'],['fd','FanDuel'],['both','Both equally']] },
    { n: 6, name: 'uct_platform_benefit', text: 'Which platform benefits the most from PICK2WIN?', options: [['dk','DraftKings'],['fd','FanDuel'],['both','Both equally'],['unsure','Not sure yet']] },
    { n: 7, name: 'uct_app_value', text: "How valuable is PICK2WIN's platform-specific lineup approach?", options: [['extreme','Extremely valuable'],['valuable','Valuable'],['neutral','Neutral'],['slight','Slightly valuable'],['none','Not valuable']] },
    { n: 8, name: 'uct_control', text: 'How much control do you prefer during team generation?', options: [['auto','Fully automatic'],['mostly-auto','Mostly automatic'],['balanced','Balanced'],['mostly-manual','Mostly manual'],['full','Full control']] },
    { n: 9, name: 'uct_exposure', text: 'Would you use Player Exposure % controls?', options: [['yes','Definitely'],['maybe','Maybe'],['no','Not interested']] },
    { n: 10, name: 'uct_strategy', text: 'Do generated teams match your strategy and provide enough variety?', options: [['always','Always'],['most','Most of the time'],['sometimes','Sometimes'],['rarely','Rarely'],['never','Never']] },
    { n: 11, name: 'uct_pricing', text: 'Which pricing model do you prefer?', options: [['coins','Coin packs'],['per-uct','Pay per UCT'],['monthly','Monthly subscription'],['annual','Annual subscription'],['pass','Competition or Series Pass']] },
    { n: 12, name: 'uct_recommend', text: 'How likely are you to recommend PICK2WIN?', options: [['very','Very likely'],['likely','Likely'],['maybe','Maybe'],['unlikely','Unlikely'],['very-unlikely','Very unlikely']] },
    { n: 13, name: 'uct_next_sport', text: 'Which sport should PICK2WIN support next?', divider: 'Future Roadmap', options: [['nfl','American Football (NFL)'],['nba','Basketball'],['mlb','Baseball'],['cricket','Cricket']] },
    { n: 14, name: 'uct_current_sports', text: 'Which sports do you currently play in Daily Fantasy Sports?', multiple: true, hint: 'Select all that apply - at least one required', options: [['soccer','Football (Soccer)'],['nfl','NFL'],['nba','Basketball'],['mlb','Baseball'],['cricket','Cricket']] },
    { n: 15, name: 'uct_coin_multisport', text: 'Would you use your coin balance across multiple sports?', options: [['yes','Definitely'],['probably','Probably'],['maybe','Maybe'],['probably-not','Probably not'],['no','No']] },
    { n: 16, name: 'uct_more_sports', text: 'Would additional sports encourage you to use PICK2WIN more often?', options: [['yes','Definitely'],['probably','Probably'],['maybe','Maybe'],['probably-not','Probably not'],['no','No']] },
    { n: 17, name: 'uct_comp_soccer', text: 'Which Football competitions should PICK2WIN prioritise?', multiple: true, optional: true, options: [['premier-league','Premier League'],['uefa-champions-league','UEFA Champions League'],['uefa-europa-league','UEFA Europa League'],['fifa-world-cup','FIFA World Cup'],['uefa-euro','UEFA Euro'],['mls','MLS'],['la-liga','La Liga'],['serie-a','Serie A'],['bundesliga','Bundesliga'],['ligue-1','Ligue 1'],['fa-cup','FA Cup'],['other','Other']] }
  ];
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

    const payload = {
      answers: {
        q1: String(formData.get('uct_sentiment') || ''),
        q2: formData.getAll('uct_likes').map(String),
        q3: formData.getAll('uct_changes').map(String),
        q4: String(formData.get('uct_platform_use') || ''),
        q5: String(formData.get('uct_platform_p2w') || ''),
        q6: String(formData.get('uct_platform_benefit') || ''),
        q7: String(formData.get('uct_app_value') || ''),
        q8: String(formData.get('uct_control') || ''),
        q9: String(formData.get('uct_exposure') || ''),
        q10: String(formData.get('uct_strategy') || ''),
        q11: String(formData.get('uct_pricing') || ''),
        q12: String(formData.get('uct_recommend') || ''),
        q13: String(formData.get('uct_next_sport') || ''),
        q14: formData.getAll('uct_current_sports').map(String),
        q15: String(formData.get('uct_coin_multisport') || ''),
        q16: String(formData.get('uct_more_sports') || ''),
        q17: formData.getAll('uct_comp_soccer').map(String),
        q18: Number(formData.get('uct_rating') || 0)
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

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('en-GB', {
      month: 'short',
      year: 'numeric'
    }).format(date);
  }

  feedbackTitle(title: string): string {
    return (title || 'Feedback').replace(/_/g, ' ');
  }

  feedbackStatusClass(status: string): string {
    const value = String(status || '').trim().toLowerCase();
    return value === 'planned' || value === 'reviewing' ? 'tag-planned' : 'tag-shipped';
  }

  trackFeedback(_: number, item: UserFeedbackItem): number | string {
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
    const changes = formData.getAll('uct_changes');
    return !!String(formData.get('uct_sentiment') || '')
      && changes.length > 0
      && changes.length <= 3
      && !!String(formData.get('uct_platform_use') || '')
      && !!String(formData.get('uct_platform_p2w') || '')
      && !!String(formData.get('uct_platform_benefit') || '')
      && !!String(formData.get('uct_app_value') || '')
      && !!String(formData.get('uct_control') || '')
      && !!String(formData.get('uct_exposure') || '')
      && !!String(formData.get('uct_strategy') || '')
      && !!String(formData.get('uct_pricing') || '')
      && !!String(formData.get('uct_recommend') || '')
      && !!String(formData.get('uct_next_sport') || '')
      && formData.getAll('uct_current_sports').length > 0
      && !!String(formData.get('uct_coin_multisport') || '')
      && !!String(formData.get('uct_more_sports') || '')
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
        const data = res?.data;
        const rows = Array.isArray(data)
          ? data
          : Array.isArray(data?.feedback)
            ? data.feedback
            : Array.isArray(data?.items)
              ? data.items
              : [];

        this.feedbackItems = res?.success === false ? [] : rows.map((item: any, index: number) => ({
          id: item?.id ?? `feedback-${index}`,
          title: String(item?.title || item?.subject || item?.category || 'User feedback'),
          message: String(item?.message || item?.suggestion || item?.description || ''),
          created_at: String(item?.created_at || item?.date || item?.updated_at || ''),
          status: String(item?.status || 'Shipped')
        }));
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
