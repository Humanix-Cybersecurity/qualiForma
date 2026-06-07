// SPDX-License-Identifier: AGPL-3.0-or-later
import type { fr } from './fr';

// Le type force la parité des clés avec le catalogue FR de référence.
export const en: typeof fr = {
  app: { name: 'Humanix — Training tracking' },
  common: {
    loading: 'Loading…',
    error: 'An error occurred.',
    logout: 'Sign out',
    submit: 'Submit',
    back: 'Back',
    required: 'Required field',
  },
  roles: {
    super_admin: 'Super administrator',
    admin_of: 'Administrator',
    formateur: 'Trainer',
    apprenant: 'Learner',
    referent_handicap: 'Disability advisor',
  },
  login: {
    title: 'Sign in',
    tenant: 'Organisation identifier',
    tenantHelp: 'Your training organisation code (e.g. demo).',
    email: 'Email address',
    password: 'Password',
    totp: 'Two-factor code',
    totpHelp: 'If two-factor authentication is enabled.',
    submit: 'Sign in',
    failed: 'Invalid credentials.',
  },
  dashboard: {
    title: 'Dashboard',
    welcome: 'Welcome',
    yourRole: 'Your role',
  },
  creneaux: {
    title: 'My sessions',
    none: 'No session.',
    morning: 'Morning',
    afternoon: 'Afternoon',
    open: 'Signing open',
    closed: 'Signing closed',
    status: 'Status',
    statutSigne: 'Signed',
    statutEnAttente: 'Pending',
    sign: 'Sign',
    openWindow: 'Open signing',
    closeWindow: 'Close signing',
    code: 'Signing code',
    codeToDisplay: 'Code to display to learners',
    control: 'Attendance control',
  },
  sign: {
    title: 'Sign the session',
    method: 'Signing method',
    methodCode: 'Code',
    methodManuscrite: 'Handwritten signature',
    enterCode: 'Enter the code shown by the trainer',
    confirm: 'Sign',
    success: 'Attendance recorded.',
    verifyLink: 'Verification link',
  },
  verification: {
    title: 'Authenticity verification',
    authentic: 'Authentic attendance record',
    notAuthentic: 'NON-authentic attendance record',
    signedAt: 'Signed on',
    level: 'Signature level',
  },
  a11y: {
    title: 'Accessibility statement',
    intro:
      'Humanix is committed to making its platform accessible in line with RGAA 4.1 (WCAG 2.1 level AA).',
    statusLabel: 'Compliance status',
    status: 'Partially compliant — continuous improvement in progress.',
    measuresLabel: 'Measures in place',
    measures:
      'Keyboard navigation, visible focus, AA contrast, text alternatives, reduced-motion preference, automated axe-core tests in continuous integration.',
    contactLabel: 'Feedback and contact',
    contact:
      'To report an accessibility issue: accessibilite@humanix.example.',
    link: 'Accessibility',
  },
};
