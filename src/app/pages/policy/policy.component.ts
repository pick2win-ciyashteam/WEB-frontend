import { AfterViewInit, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

interface PolicySection {
  title: string;
  body: string;
}

@Component({
  selector: 'app-policy',
  templateUrl: './policy.component.html',
  styleUrls: ['./policy.component.css']
})
export class PolicyComponent implements AfterViewInit {
  readonly docTitle = 'Privacy Policy';
  readonly docMeta = 'Last updated 24 June 2026 - PICK2WIN Technologies Pvt Ltd';
  readonly pageIcon = 'shield_lock';
  readonly sections: PolicySection[] = [
    { title: 'What we collect', body: 'Account details you provide: full name, date of birth, country of residence, mobile number, email address and a securely hashed password. We also record usage needed to run the service (matches you configure, coin balance and purchase history) and limited technical data (device / IP signals) for fraud prevention.' },
    { title: 'Why we collect it', body: 'To verify eligibility (18+, one account per user), prevent fraud and multi-accounting, deliver UCT generations, process payments, and provide support. We do not sell your personal data.' },
    { title: 'Verification data', body: 'One-time passcodes are sent by SMS and email to confirm ownership of your number and address. Device and IP signals are used only for fraud and abuse detection.' },
    { title: 'Payments', body: 'All payments are processed by <strong>Razorpay</strong>. We never see or store full card numbers or CVV - that data goes directly to Razorpay under PCI-DSS. We retain only the minimum record (pack, amount, date, reference) needed for billing and refunds.' },
    { title: 'Sharing with processors', body: 'We share the minimum data required with service providers acting on our behalf: Razorpay (payments), our SMS / email provider (verification), and our football-data provider (lineups). These providers are bound by contract and may not use your data for their own purposes.' },
    { title: 'Cookies & local storage', body: 'We use essential cookies / local storage to keep you signed in and remember in-session state. We do not run third-party advertising trackers.' },
    { title: 'Data retention & account deletion', body: 'We keep your data while your account is active. If you delete your account, your personal data is <strong>erased</strong> and the account cannot be reclaimed; limited transaction records may be retained where required by law (e.g. tax / anti-fraud). Deletion is permanent and any unused coins are forfeited (see Refund Policy section 5).' },
    { title: 'Your rights', body: 'Subject to applicable law, you may request access to, correction of, export of, or erasure of your personal data. Contact us to exercise these rights.' },
    { title: 'Security', body: 'We use encryption in transit, hashed passwords, and access controls. No system is perfectly secure, but we work to protect your data and to notify you of material incidents where required.' },
    { title: 'Contact', body: 'Privacy questions or requests? Email <a href="mailto:support@pick2win.io">support@pick2win.io</a>.' }
  ];

  constructor(private route: ActivatedRoute) {}

  ngAfterViewInit(): void {
    this.route.fragment.subscribe(fragment => {
      if (fragment) {
        setTimeout(() => this.scrollToAnchor(fragment), 100);
      }
    });
  }

  scrollToTop(event: Event): void {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  scrollToSection(event: Event, sectionId: string): void {
    event.preventDefault();
    const target = document.getElementById(sectionId);

    if (!target) {
      return;
    }

    const headerOffset = 96;
    const top = target.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  private scrollToAnchor(sectionId: string): void {
    const target = document.getElementById(sectionId);
    if (!target) return;

    const headerOffset = 108;
    const top = target.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }
}
