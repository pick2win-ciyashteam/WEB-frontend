import { Component } from '@angular/core';

interface CookieSection {
  title: string;
  paragraphs: string[];
  items?: string[];
}

@Component({
  selector: 'app-cookie-policy',
  templateUrl: './cookie-policy.component.html',
  styleUrls: ['./cookie-policy.component.css']
})
export class CookiePolicyComponent {
  readonly docTitle = 'Cookie Policy';
  readonly docMeta = 'Last updated 27 June 2026 - PICK2WIN Technologies Private Limited';
  readonly pageIcon = 'cookie';

  readonly sections: CookieSection[] = [
    {
      title: 'Introduction',
      paragraphs: [
        'This Cookie Policy explains how PICK2WIN Technologies Private Limited (“PICK2WIN”, “we”, “our”, or “us”) uses cookies and similar technologies, including browser local storage, on the PICK2WIN website and platform.',
        'This Cookie Policy should be read together with our <a href="/policy">Privacy Policy</a>.',
        'By using PICK2WIN, you agree to the use of essential cookies and local storage as described in this Policy.'
      ]
    },
    {
      title: 'What Are Cookies and Local Storage?',
      paragraphs: [
        '<strong>Cookies</strong><br>Cookies are small text files stored on your device by a website.',
        'Cookies help websites remember information between page visits and user sessions, allowing services to operate efficiently and securely.',
        '<strong>Local Storage</strong><br>Local storage is a browser technology that allows websites to store limited information directly on your device.',
        'Like cookies, local storage helps maintain information between page loads and sessions.',
        'These technologies help PICK2WIN operate securely, reliably, and efficiently.'
      ]
    },
    {
      title: 'How PICK2WIN Uses Cookies & Local Storage',
      paragraphs: [
        'PICK2WIN uses cookies and local storage solely for essential platform operations.',
        'Examples include:',
        'We do not use cookies or local storage to build advertising profiles or track users across other websites.'
      ],
      items: [
        'Keeping users signed in.',
        'Maintaining active sessions.',
        'Preserving account state.',
        'Remembering in-session configuration selections.',
        'Supporting platform functionality.',
        'Improving platform security.',
        'Detecting fraud and abuse.',
        'Preventing unauthorized access.',
        'Protecting user accounts.',
        'Supporting secure payment workflows.'
      ]
    },
    {
      title: 'Strictly Necessary Technologies',
      paragraphs: [
        'The technologies used by PICK2WIN are considered strictly necessary for operation of the service.',
        'Examples include:',
        'Because these technologies are required for the platform to operate correctly and securely, they cannot be disabled through the PICK2WIN platform.'
      ],
      items: [
        'User authentication.',
        'Secure sign-in functionality.',
        'Session management.',
        'Security monitoring.',
        'Fraud prevention.',
        'In-session configuration management.',
        'Platform functionality and performance.',
        'Account protection mechanisms.'
      ]
    },
    {
      title: 'Local Storage Usage',
      paragraphs: [
        'PICK2WIN uses browser local storage to:',
        'Information stored in local storage remains on your device and is used only for operation of the PICK2WIN platform.',
        'PICK2WIN does not share local storage information with advertisers, marketing companies, or advertising networks.'
      ],
      items: [
        'Maintain sign-in status.',
        'Preserve active sessions.',
        'Store temporary platform state.',
        'Support UCT workflow functionality.',
        'Improve platform security and reliability.'
      ]
    },
    {
      title: 'No Advertising, Analytics Tracking, or Cross-Site Profiling',
      paragraphs: [
        'PICK2WIN respects user privacy.',
        'PICK2WIN does not use:',
        'PICK2WIN does not sell, rent, lease, trade, or monetize personal information through advertising activities.',
        'We believe user privacy, security, and trust are more important than advertising revenue.'
      ],
      items: [
        'Advertising cookies.',
        'Behavioural advertising technologies.',
        'Cross-site tracking technologies.',
        'Third-party advertising trackers.',
        'Marketing pixels.',
        'Advertising networks.',
        'User profiling technologies for advertising purposes.'
      ]
    },
    {
      title: 'Our Commitment To User Privacy',
      paragraphs: [
        'PICK2WIN is committed to protecting user privacy and platform security.',
        'We do not build our business around collecting, selling, renting, trading, or monetizing personal information.',
        'PICK2WIN will never intentionally sell, rent, lease, trade, or disclose personal information to advertisers, marketing companies, data brokers, or other third parties for commercial gain.',
        'Any limited information sharing is restricted solely to what is necessary for:',
        'User safety, privacy, and account security remain core priorities in everything we build and operate.'
      ],
      items: [
        'Processing payments.',
        'Delivering verification messages.',
        'Maintaining platform functionality.',
        'Preventing fraud and abuse.',
        'Protecting platform security.',
        'Meeting legal and regulatory obligations.'
      ]
    },
    {
      title: 'Third-Party Service Providers',
      paragraphs: [
        'Certain third-party service providers may place their own cookies or similar technologies when delivering services required for platform operation.',
        '<strong>Razorpay</strong><br>Payment processing is provided by Razorpay.',
        'During payment or checkout, Razorpay may use cookies or similar technologies for:',
        'Such technologies are governed by Razorpay’s own policies and practices.',
        '<strong>Infrastructure & Security Providers</strong><br>Cloud hosting, content delivery, security services, and infrastructure providers may also use essential technologies required for secure platform operation.',
        'Aside from essential service providers, PICK2WIN does not use third-party advertising or marketing cookies.'
      ],
      items: [
        'Authentication.',
        'Security.',
        'Fraud prevention.',
        'Payment processing.',
        'Risk assessment.'
      ]
    },
    {
      title: 'Managing Cookies',
      paragraphs: [
        'Most web browsers allow users to:',
        'Users can manage these settings through their browser preferences.',
        'Please note that disabling or removing essential cookies or local storage may prevent users from:'
      ],
      items: [
        'View stored cookies.',
        'Delete cookies.',
        'Block cookies.',
        'Restrict cookie usage.',
        'Clear local storage.',
        'Configure browser privacy settings.',
        'Signing in.',
        'Purchasing coin packs.',
        'Generating teams.',
        'Accessing account features.',
        'Maintaining active sessions.',
        'Using parts of the platform correctly.'
      ]
    },
    {
      title: 'Security & Fraud Prevention',
      paragraphs: [
        'Certain cookies and local storage functions are used to help:',
        'Removing or blocking essential technologies may affect PICK2WIN’s ability to provide secure services.'
      ],
      items: [
        'Protect user accounts.',
        'Detect suspicious activity.',
        'Prevent unauthorized access.',
        'Reduce fraud.',
        'Prevent abuse.',
        'Maintain platform security.'
      ]
    },
    {
      title: 'Consent & Future Technologies',
      paragraphs: [
        'PICK2WIN currently uses only essential cookies and local storage required for platform functionality and security.',
        'If PICK2WIN introduces any future non-essential technologies that require user consent under applicable law, users will be notified and consent will be obtained before such technologies are activated.'
      ]
    },
    {
      title: 'Changes To This Cookie Policy',
      paragraphs: [
        'PICK2WIN may update this Cookie Policy from time to time.',
        'Any updates will be published on this page and reflected by the “Last Updated” date shown above.',
        'Continued use of the platform after updates become effective constitutes acceptance of the revised Cookie Policy.'
      ]
    },
    {
      title: 'Contact',
      paragraphs: [
        'For questions, concerns, requests, or complaints relating to this Cookie Policy:<br>Email: <a href="mailto:support@pick2win.io">support@pick2win.io</a>',
        'PICK2WIN aims to acknowledge and review cookie-related requests within 48–72 business hours.'
      ]
    }
  ];
}
