import { Component } from '@angular/core';

interface PolicySection {
  title: string;
  body: string;
}

@Component({
  selector: 'app-terms',
  templateUrl: './terms.component.html',
  styleUrls: ['./terms.component.css']
})
export class TermsComponent {
  readonly docTitle = 'Terms & Conditions';
  readonly docMeta = 'Last updated 24 June 2026 - PICK2WIN Technologies Pvt Ltd';
  readonly pageIcon = 'gavel';
  readonly sections: PolicySection[] = [
    {
      title: 'Acceptance & eligibility',
      body: 'By creating a PICK2WIN account you confirm you are <strong>18 years or older</strong>, legally permitted to use the platform in your jurisdiction, and that you accept these Terms, the Privacy Policy and the Refund Policy. PICK2WIN is not intended for minors.'
    },
    {
      title: 'What PICK2WIN is - and is not',
      body: 'PICK2WIN is a <strong>virtual team-configuration tool</strong>. Its UCT engine turns your own inputs into 20 structured teams per match. PICK2WIN is <strong>not</strong> a betting, gambling or real-money gaming service, does <strong>not</strong> predict match outcomes, does <strong>not</strong> guarantee any result, and pays out no winnings. You decide how to use the generated teams elsewhere.'
    },
    {
      title: 'No advice or recommendations',
      body: 'PICK2WIN explains how the platform is structured and the constraints it works within. It does <strong>not</strong> recommend players, captains, formations or selections, and never advises which options to choose. Every configuration decision is entirely yours - the engine only processes the inputs you provide.'
    },
    {
      title: 'Accounts & verification',
      body: 'Each user may hold <strong>one account only</strong>. Both a mobile number and an email address must be verified; disposable email and VoIP / virtual numbers are blocked. Creating multiple accounts - for example to evade the one-account rule - leads to <strong>permanent ban</strong> and forfeiture of any balance.'
    },
    {
      title: 'Coins & generation',
      body: 'One coin equals one match UCT generation, and each successful run produces exactly <strong>20 structured teams</strong>. Coin packs are one-time purchases with no subscription or auto-renewal. Your coins form a single combined balance valid for <strong>365 days from your most recent purchase</strong> (Active Pack Merge - see the Refund Policy). Each generation reflects strictly the configuration inputs you provided (Substitute, Mandate, Captaincy); if a completed run does not reflect those inputs, this is a technical fault - contact <a href="mailto:support@pick2win.io">support@pick2win.io</a> with your downloaded TXT file for verification (see Refund Policy &middot; Verified technical failure).'
    },
    {
      title: 'Coin consumption & failed runs',
      body: 'A coin is consumed <strong>only</strong> when a generation succeeds and 20 teams are delivered to My Teams. No coin is charged if a run fails, is cancelled mid-flow, or never completes; on failure you return to the configuration screen with your inputs preserved and may re-run. If a coin is charged but no teams are delivered due to a fault on our side, contact <a href="mailto:support@pick2win.io">support@pick2win.io</a> and we will verify and restore or refund the coin.'
    },
    {
      title: 'Generated teams are final',
      body: 'Once a generation completes, the 20 teams are <strong>final</strong> and locked as-is: they cannot be edited, swapped, modified, regenerated or undone, and each match supports one successful generation per user. While the teams are visible in My Teams you may browse, preview and download them.'
    },
    {
      title: 'Availability & downloads',
      body: 'Generated teams remain available in My Teams until the match kicks off. <strong>After kickoff they are removed</strong>, and the file you downloaded becomes your only copy. You are responsible for downloading your teams before kickoff.'
    },
    {
      title: 'Acceptable use',
      body: 'You agree not to scrape, automate, resell, or commercially redistribute the service or its output, not to attempt to bypass verification or rate limits, and not to interfere with the platform operation. We may suspend or terminate accounts that breach these terms.'
    },
    {
      title: 'Intellectual property',
      body: 'The PICK2WIN name, UCT engine, interface and content are owned by PICK2WIN Technologies Pvt Ltd. You retain ownership of the inputs you provide; you receive a personal, non-transferable right to use the teams generated for you.'
    },
    {
      title: 'Disclaimers & limitation of liability',
      body: 'The service is provided as is. Football data is sourced from third-party providers and may change; PICK2WIN is not liable for lineup changes, cancellations, third-party platform actions, or how you use the generated teams. To the maximum extent permitted by law, our aggregate liability is limited to the amount you paid in the preceding 12 months.'
    },
    {
      title: 'Changes to these terms',
      body: 'We may update these Terms. Coins you have already purchased remain usable under the terms in force at the time of purchase; future changes never retroactively shorten the validity of coins you already hold or change a pack you already paid for.'
    },
    {
      title: 'Governing law',
      body: 'These Terms are governed by the laws of India, with exclusive jurisdiction of the courts of Bengaluru, Karnataka.'
    },
    {
      title: 'Contact',
      body: 'Questions about these Terms? Email <a href="mailto:support@pick2win.io" style="color: var(--gold);">support@pick2win.io</a>.'
    }
  ];

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
}
