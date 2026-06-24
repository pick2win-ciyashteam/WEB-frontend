import { AfterViewInit, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

interface PolicySection {
  title: string;
  body: string;
}

@Component({
  selector: 'app-refund',
  templateUrl: './refund.component.html',
  styleUrls: ['./refund.component.css']
})
export class RefundComponent implements AfterViewInit {
  readonly docTitle = 'Refund Policy';
  readonly docMeta = 'Last updated 27 June 2026 - PICK2WIN Technologies Private Limited';
  readonly pageIcon = 'currency_exchange';

  readonly sections: PolicySection[] = [
    { title: 'Overview', body: 'PICK2WIN operates a coin-based User Configuration Teams (UCT) software service.<br><br>Coin packs provide access to UCT generations and are governed by this Refund Policy.<br><br>By purchasing, holding, or using coins, you agree to this Refund Policy.' },
    { title: 'One-Time Purchases', body: 'Coin packs are one-time purchases.<br><br>PICK2WIN does not currently offer:<ul><li>Subscriptions</li><li>Automatic renewals</li><li>Recurring billing</li><li>Automatic charges</li></ul>Users choose when and if they wish to purchase additional coin packs.' },
    { title: 'Purchase Finality', body: 'All coin pack purchases are final.<br><br>By purchasing a coin pack, you are purchasing access to the PICK2WIN UCT software service and not a physical product.<br><br>Refunds will not be provided for:<ul><li>Change of mind.</li><li>Accidental purchases.</li><li>Unused coins.</li><li>Partially used coin packs.</li><li>Dissatisfaction with generated teams.</li><li>Dissatisfaction with team combinations.</li><li>Match outcomes.</li><li>Player performance.</li><li>Third-party fantasy platform results.</li><li>User strategy decisions.</li><li>Failure to use purchased coins before expiry.</li><li>Account deletion requests.</li><li>Requests made after successful coin credit.</li></ul>Users are responsible for reviewing their purchase before completing payment.' },
    { title: 'Coin Validity & Active Pack Merge', body: 'Coins remain valid for 365 days from the date of the most recent coin purchase.<br><br>If a user purchases a new coin pack while active coins remain:<ul><li>Remaining active coins are merged into the new balance.</li><li>The entire active balance receives a new validity period of 365 days from the latest purchase date.</li></ul><strong>Example</strong><ul><li>Purchase 50 Coins on 1 January 2026.</li><li>Use 20 Coins.</li><li>30 Coins remain active.</li><li>Purchase another 100 Coins on 1 July 2026.</li></ul><strong>Result:</strong><ul><li>Total Balance = 130 Coins.</li><li>All 130 Coins remain valid until 30 June 2027.</li></ul>Coins already expired before a new purchase cannot be restored, transferred, refunded, or reactivated.' },
    { title: 'Successful UCT Generations', body: 'A coin is considered consumed when:<ul><li>A UCT generation completes successfully; and</li><li>Twenty (20) virtual teams are delivered to the user’s My Teams section.</li></ul>Once generation completes successfully:<ul><li>The coin is consumed.</li><li>The service has been delivered.</li><li>The transaction becomes final.</li></ul>Consumed coins, completed generations, downloaded outputs, and successfully delivered services are non-refundable.' },
    { title: 'Match Changes & Third-Party Events', body: 'PICK2WIN provides a software-based team generation service only.<br><br>Refunds are not provided for:<ul><li>Cancelled matches.</li><li>Postponed matches.</li><li>Abandoned matches.</li><li>Rescheduled matches.</li><li>Delayed lineups.</li><li>Player injuries.</li><li>Team selection changes.</li><li>Competition schedule changes.</li><li>Third-party fantasy platform rule changes.</li><li>Third-party fantasy platform actions.</li><li>Third-party service interruptions.</li><li>Scoring rule changes.</li><li>User-selected configurations.</li></ul>PICK2WIN’s responsibility ends upon successful generation and delivery of the requested teams.' },
    { title: 'Payment Processing Delays', body: 'PICK2WIN does not control:<ul><li>Banking networks.</li><li>Card issuers.</li><li>Payment processing networks.</li><li>Payment gateway settlement systems.</li></ul>A payment may occasionally appear as:<ul><li>Processing</li><li>Pending</li><li>Authorized</li><li>Delayed</li><li>Under Review</li></ul>between the user’s bank and the payment provider.<br><br>If PICK2WIN has not received successful payment confirmation from the payment provider, coins will not be credited until confirmation is received.<br><br>Users should not make duplicate purchases while a transaction is still pending.<br><br>Resolution times may depend on the payment provider, banking network, and card issuer.' },
    { title: 'Payment Successfully Debited But Not Received By PICK2WIN', body: 'In certain circumstances, a user’s bank account, card statement, or payment application may show a successful debit while the transaction is not successfully completed by the payment provider.<br><br>Examples may include:<ul><li>Network interruptions.</li><li>Banking timeouts.</li><li>Authorization failures.</li><li>Settlement failures.</li><li>Payment gateway processing errors.</li><li>Third-party infrastructure issues.</li></ul>If PICK2WIN does not receive payment confirmation and settlement from the payment provider, the corresponding coin pack cannot be credited.<br><br>In such situations:<ul><li>The transaction will be investigated.</li><li>Payment gateway records will be reviewed.</li><li>Banking references may be requested.</li><li>Payment provider records may be verified.</li></ul>If payment is later confirmed as successfully received by PICK2WIN:<ul><li>Coins will be credited to the user’s account.</li></ul>If payment was never received by PICK2WIN:<ul><li>Any reversal or refund must be processed through the payment provider and banking system.</li></ul>PICK2WIN cannot refund funds that were never received by PICK2WIN.' },
    { title: 'Coin Purchase Issues', body: 'If payment is successfully processed but purchased coins are not credited to the user’s account, the user should contact support immediately.<br><br>After verification, PICK2WIN may:<ul><li>Credit the missing coins.</li><li>Restore the affected purchase.</li><li>Issue a refund to the original payment method where appropriate.</li></ul>Verification may include:<ul><li>Razorpay transaction records.</li><li>Payment references.</li><li>Wallet records.</li><li>Platform logs.</li><li>Banking confirmations.</li></ul>PICK2WIN aims to investigate and resolve verified coin purchase issues within 48–72 business hours after receiving all required information.' },
    { title: 'Verified Technical Failures', body: 'The sole exceptions to the general no-refund policy are:<ul><li>Verified duplicate payments.</li><li>Verified successful payments where coins were not credited.</li><li>Verified PICK2WIN platform failures where a coin was deducted but no teams were delivered.</li></ul>After verification, PICK2WIN may:<ul><li>Restore the affected coin.</li><li>Credit the missing coin pack.</li><li>Issue a refund to the original payment method where appropriate.</li></ul>Where possible, PICK2WIN will resolve issues through coin restoration or coin credit before considering a monetary refund.<br><br>Refunds or restorations are not provided for:<ul><li>User mistakes.</li><li>Internet connectivity issues.</li><li>Device issues.</li><li>Browser issues.</li><li>Unsupported devices.</li><li>Third-party fantasy platform issues.</li><li>User configuration choices.</li><li>Match outcomes.</li></ul>Verified requests are generally processed within 48–72 business hours.' },
    { title: 'Duplicate Payments', body: 'If you believe you have been charged more than once for the same purchase, contact support immediately.<br><br>Verified duplicate transactions may be:<ul><li>Refunded; or</li><li>Corrected through equivalent coin credits.</li></ul>Verification may require transaction references and payment confirmation details.' },
    { title: 'Account Deletion', body: 'If a user voluntarily requests account deletion:<ul><li>Any remaining unused coins are permanently forfeited.</li><li>Coin balances cannot be transferred.</li><li>Coin balances cannot be refunded.</li><li>Generated teams cannot be recovered.</li><li>Deleted accounts cannot be restored.</li><li>Deleted accounts cannot be reactivated.</li></ul>Once account deletion is completed, recovery is not possible.<br><br>Users should use remaining coins before requesting account deletion.' },
    { title: 'Expired Coins', body: 'Coins that expire after their validity period are permanently forfeited.<br><br>Expired coins:<ul><li>Cannot be restored.</li><li>Cannot be refunded.</li><li>Cannot be transferred.</li><li>Cannot be reactivated.</li></ul>Users are responsible for using coins before expiry.' },
    { title: 'Chargebacks', body: 'If you experience a payment issue, please contact PICK2WIN Support before initiating a chargeback.<br><br>Chargebacks raised on valid and successfully delivered services may result in:<ul><li>Temporary account suspension.</li><li>Permanent account suspension.</li><li>Restrictions on future purchases.</li><li>Investigation of account activity.</li></ul>Nothing in this section limits any rights available under applicable consumer protection laws.' },
    { title: 'Changes To This Policy', body: 'PICK2WIN may update this Refund Policy from time to time.<br><br>Changes apply prospectively from their effective date.<br><br>Previously purchased coin packs will not have their validity retroactively shortened or materially altered.' },
    { title: 'Contact & Refund Requests', body: 'For refund requests, payment issues, duplicate charges, transaction disputes, or billing questions:<br>Email: <a href="mailto:support@pick2win.io">support@pick2win.io</a><br><br>PICK2WIN aims to acknowledge and review refund-related requests within 48–72 business hours.' }
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
    if (!target) return;

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
