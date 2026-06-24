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
  readonly docMeta = 'Last updated 27 June 2026 - PICK2WIN Technologies Private Limited';
  readonly pageIcon = 'shield_lock';

  readonly sections: PolicySection[] = [
    { title: 'Introduction', body: 'PICK2WIN Technologies Private Limited (“PICK2WIN”, “we”, “our”, or “us”) respects your privacy and is committed to protecting your personal information.<br><br>This Privacy Policy explains how we collect, use, store, protect, and disclose personal information when you access or use the PICK2WIN website, platform, and related services.<br><br>By creating an account or using PICK2WIN, you agree to the practices described in this Privacy Policy.' },
    { title: 'Information We Collect', body: '<strong>Information You Provide</strong><br>When creating and using a PICK2WIN account, we may collect:<ul><li>Full Name</li><li>Date of Birth</li><li>Country of Residence</li><li>Email Address</li><li>Mobile Number</li><li>Securely Hashed Password</li></ul><strong>Account & Service Information</strong><br>To operate the platform and provide services, we may collect:<ul><li>Account Creation Date</li><li>Account Verification Status</li><li>Coin Balance</li><li>Coin Purchase History</li><li>UCT Generation History</li><li>Download History</li><li>Support Requests</li><li>Account Activity Records</li></ul><strong>Technical & Security Information</strong><br>To protect the platform and prevent abuse, we may collect:<ul><li>IP Address</li><li>Device Information</li><li>Browser Information</li><li>Operating System Information</li><li>Login Activity</li><li>Security & Fraud Prevention Signals</li><li>Session Information</li><li>Account Access Logs</li></ul>' },
    { title: 'Why We Collect Information', body: 'We process personal information to:<ul><li>Create and manage user accounts.</li><li>Verify user eligibility.</li><li>Enforce the one-account-per-user policy.</li><li>Deliver UCT generation services.</li><li>Process purchases and payments.</li><li>Detect and prevent fraud.</li><li>Investigate abuse and security incidents.</li><li>Provide customer support.</li><li>Improve platform reliability and security.</li><li>Comply with legal and regulatory obligations.</li></ul>We collect only information reasonably necessary to provide and protect our services.' },
    { title: 'Verification Data', body: 'PICK2WIN uses email and mobile verification to confirm account ownership.<br><br>Verification may include:<ul><li>Email One-Time Passwords (OTP)</li><li>SMS One-Time Passwords (OTP)</li></ul>Device and IP information may be used solely for:<ul><li>Fraud prevention</li><li>Multi-account detection</li><li>Security monitoring</li><li>Abuse prevention</li><li>Platform protection</li></ul>' },
    { title: 'Payments', body: 'All payments are processed through Razorpay or other authorized payment providers.<br><br>PICK2WIN does not receive or store:<ul><li>Full Card Numbers</li><li>CVV Numbers</li><li>Complete Payment Credentials</li><li>Banking Passwords</li><li>Banking Authentication Information</li></ul>Payment information is processed directly by the payment provider in accordance with applicable payment security standards, including PCI-DSS requirements.<br><br>PICK2WIN may retain limited transaction information including:<ul><li>Transaction Reference</li><li>Coin Pack Purchased</li><li>Purchase Amount</li><li>Purchase Date</li><li>Payment Status</li></ul>This information is used solely for:<ul><li>Billing</li><li>Support</li><li>Refund Processing</li><li>Accounting</li><li>Fraud Prevention</li><li>Legal Compliance</li></ul>' },
    { title: 'Service Providers & Data Sharing', body: 'PICK2WIN may share limited information with trusted service providers that assist in operating the platform.<br><br>Examples include:<ul><li>Razorpay (Payment Processing)</li><li>Email Delivery Providers</li><li>SMS Delivery Providers</li><li>Cloud Hosting Providers</li><li>Football Data Providers</li><li>Customer Support Systems</li><li>Security & Infrastructure Providers</li></ul>These providers receive only the information necessary to perform their services and are contractually required to protect it.<br><br>PICK2WIN does not sell personal information.' },
    { title: 'Our Commitment To User Privacy', body: 'PICK2WIN believes that user trust is one of its most important responsibilities.<br><br>We do not build our business around collecting, selling, renting, trading, leasing, or monetizing personal information.<br><br>User privacy and account security are prioritized in the design, development, and operation of the PICK2WIN platform.<br><br>PICK2WIN will never intentionally sell, rent, lease, trade, or disclose personal information to:<ul><li>Advertisers</li><li>Marketing Companies</li><li>Data Brokers</li><li>Advertising Networks</li><li>Third-Party Marketing Platforms</li></ul>for commercial gain.<br><br>Any limited information sharing is restricted solely to what is necessary for:<ul><li>Providing platform services.</li><li>Processing payments.</li><li>Delivering verification messages.</li><li>Maintaining platform functionality.</li><li>Preventing fraud and abuse.</li><li>Protecting platform security.</li><li>Meeting legal and regulatory obligations.</li></ul>PICK2WIN’s objective is to collect only the information required to operate the platform safely, securely, and reliably.<br><br>User safety, privacy, and account security remain core priorities in everything we build and operate.' },
    { title: 'Cookies & Local Storage', body: 'PICK2WIN uses essential cookies and browser local storage to:<ul><li>Maintain Login Sessions</li><li>Preserve Account State</li><li>Support Platform Functionality</li><li>Improve Security</li><li>Protect User Accounts</li></ul>We do not use advertising cookies, behavioural advertising technologies, or cross-site tracking technologies.<br><br>For additional information, please refer to our <a href="/cookie-policy">Cookie Policy</a>.' },
    { title: 'Data Retention', body: 'We retain personal information only as long as necessary to:<ul><li>Provide services.</li><li>Maintain account functionality.</li><li>Meet legal obligations.</li><li>Resolve disputes.</li><li>Prevent fraud.</li><li>Protect platform security.</li></ul>Transaction records, invoices, payment references, audit logs, fraud-prevention records, and legally required accounting records may be retained for the minimum period required by applicable law.<br><br>Such retained records are not used to recreate, restore, or reactivate deleted accounts.' },
    { title: 'Account Deletion', body: 'Users may request permanent account deletion by contacting support.<br><br>Once account deletion is completed:<ul><li>The account is permanently removed from PICK2WIN production systems.</li><li>Personal account information is permanently deleted.</li><li>Login access is permanently disabled.</li><li>The account cannot be recovered.</li><li>The account cannot be restored.</li><li>The account cannot be reactivated.</li><li>Unused coins are permanently forfeited.</li><li>Previous UCT generations, downloads, configurations, and account history are permanently removed.</li></ul>Users wishing to use PICK2WIN again after deletion must create a new account and complete registration and verification again.<br><br>Because account deletion is permanent and irreversible, users should carefully consider their decision before submitting a deletion request.' },
    { title: 'International Data Transfers', body: 'Depending on the services used to operate PICK2WIN, information may be processed or stored in jurisdictions outside the user’s country of residence.<br><br>Where such transfers occur, PICK2WIN takes reasonable steps to ensure appropriate safeguards are applied to protect personal information.' },
    { title: 'Your Privacy Rights', body: 'Subject to applicable law, users may have the right to:<ul><li>Access Personal Information</li><li>Correct Inaccurate Information</li><li>Request Deletion of Personal Information</li><li>Request Export of Personal Information</li><li>Object to Certain Processing Activities</li><li>Restrict Certain Processing Activities</li></ul>Requests may be submitted to:<br><a href="mailto:support@pick2win.io">support@pick2win.io</a><br><br>Reasonable verification may be required before fulfilling requests.' },
    { title: 'Marketing Communications', body: 'PICK2WIN may occasionally send service-related communications regarding:<ul><li>Account Activity</li><li>Security Notices</li><li>Policy Updates</li><li>Service Announcements</li><li>Platform Maintenance Notices</li></ul>Users may opt out of non-essential marketing communications where applicable.<br><br>Certain service and security communications cannot be disabled while maintaining an active account.' },
    { title: 'Children’s Privacy', body: 'PICK2WIN is intended only for individuals aged 18 years or older.<br><br>We do not knowingly collect personal information from minors.<br><br>If we become aware that information has been collected from a minor, we may remove the information and terminate the associated account.' },
    { title: 'Security', body: 'PICK2WIN implements reasonable technical and organizational measures to protect personal information.<br><br>Security measures may include:<ul><li>HTTPS/TLS Encryption</li><li>Password Hashing</li><li>Access Controls</li><li>Authentication Controls</li><li>Monitoring & Logging</li><li>Fraud Detection Mechanisms</li><li>Infrastructure Security Controls</li></ul>While no system can guarantee absolute security, we continually work to protect user information and improve platform security.' },
    { title: 'Security Incidents', body: 'In the event of a significant security incident affecting personal information, PICK2WIN will take reasonable steps to:<ul><li>Investigate the Incident</li><li>Mitigate the Impact</li><li>Notify Affected Users where required by law</li><li>Cooperate with Relevant Authorities where appropriate</li></ul>' },
    { title: 'Third-Party Services & Links', body: 'PICK2WIN may integrate with or reference third-party services.<br><br>These services operate under their own privacy policies and practices.<br><br>PICK2WIN is not responsible for the privacy practices, security practices, or content of third-party websites, services, or platforms.<br><br>Users should review the privacy policies of any third-party services they choose to use.' },
    { title: 'Changes To This Privacy Policy', body: 'PICK2WIN may update this Privacy Policy from time to time.<br><br>When material changes are made, the updated version will be published on the platform with a revised “Last Updated” date.<br><br>Continued use of the platform following publication constitutes acceptance of the updated Privacy Policy.' },
    { title: 'Contact & Privacy Requests', body: 'For privacy questions, requests, complaints, or data-related inquiries:<br>Email: <a href="mailto:support@pick2win.io">support@pick2win.io</a><br><br>PICK2WIN aims to acknowledge and review privacy-related requests within 48–72 business hours.' }
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
