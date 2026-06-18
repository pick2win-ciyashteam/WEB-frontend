import { Component } from '@angular/core';

interface PolicySection {
  title: string;
  body: string;
}

@Component({
  selector: 'app-refund',
  templateUrl: './refund.component.html',
  styleUrls: ['./refund.component.css']
})
export class RefundComponent {
  readonly docTitle = 'Refund Policy';
  readonly docMeta = 'Last updated 24 June 2026 - PICK2WIN Technologies Pvt Ltd';
  readonly pageIcon = 'currency_exchange';
  readonly sections: PolicySection[] = [
    { title: 'One-time purchases', body: 'Coin packs are one-time purchases. There are no subscriptions and nothing is ever charged automatically; you choose when to buy another pack.' },
    { title: 'Coin validity & Active Pack Merge', body: 'Your coins live as a single combined balance valid for <strong>365 days from your most recent purchase</strong>. Buying a new pack while you still hold active coins merges your remaining coins into the new pack and revalidates the whole balance for a fresh 365 days from that purchase date. Coins already expired before a new purchase stay forfeited.' },
    { title: 'Completed generations are non-refundable', body: 'Once a UCT generation completes successfully, the coin is consumed and the workflow is complete. Consumed coins and completed generations are non-refundable.' },
    { title: 'Match changes & third-party actions', body: 'Refunds are not provided for cancelled, postponed, abandoned or rescheduled matches, lineup changes, reduced fixture schedules, or the actions of any third party. PICK2WIN\'s responsibility ends at delivery of your 20 teams.' },
    { title: 'Account deletion forfeits unused coins', body: 'If you voluntarily delete your account, <strong>unused coins are permanently forfeited</strong> and balances are non-refundable. Use your coins before requesting deletion. Once processed, balances are removed and recovery is not possible.' },
    { title: 'Verified technical failure', body: 'The only exception: if your payment succeeded but a UCT <strong>completely failed to generate due to a technical issue on our side</strong>, contact support - we will restore the coin or issue a refund after verification.' },
    { title: 'Chargebacks', body: 'Please contact us before raising a chargeback so we can resolve the issue. Chargebacks raised in bad faith on consumed coins may lead to account suspension.' },
    { title: 'Contact', body: 'Refund questions? Email <a href="mailto:support@pick2win.io">support@pick2win.io</a> - we aim to reply within 48 hours.' }
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
