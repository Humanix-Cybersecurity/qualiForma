// SPDX-License-Identifier: AGPL-3.0-or-later
import { Injectable, Logger } from '@nestjs/common';
import { loadEnv } from '../config/env';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}
export interface SmsMessage {
  to: string; // format E.164, ex. +336…
  text: string;
}

/**
 * Notifications via opérateurs **FR uniquement** (souveraineté, ADR 0008) :
 * e-mail **Brevo**, SMS **Octopush** (OVH possible en alternative). Aucun SDK propriétaire
 * (HTTP direct). Sans clé configurée → mode `log` (dev), aucun envoi réel.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly env = loadEnv();

  async sendEmail(msg: EmailMessage): Promise<void> {
    if (this.env.MAIL_PROVIDER === 'brevo' && this.env.BREVO_API_KEY) {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': this.env.BREVO_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({
          sender: { email: this.env.MAIL_FROM },
          to: [{ email: msg.to }],
          subject: msg.subject,
          htmlContent: msg.html,
          ...(msg.text ? { textContent: msg.text } : {}),
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`Brevo HTTP ${res.status}`);
      return;
    }
    this.logger.log(`[mail:log] à=${msg.to} sujet="${msg.subject}"`);
  }

  async sendSms(msg: SmsMessage): Promise<void> {
    if (this.env.SMS_PROVIDER === 'octopush' && this.env.OCTOPUSH_API_KEY && this.env.OCTOPUSH_API_LOGIN) {
      const res = await fetch('https://api.octopush.com/v1/public/sms-campaign/send', {
        method: 'POST',
        headers: {
          'api-login': this.env.OCTOPUSH_API_LOGIN,
          'api-key': this.env.OCTOPUSH_API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          recipients: [{ phone_number: msg.to }],
          text: msg.text,
          type: 'sms_premium',
          sender: this.env.SMS_SENDER,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`Octopush HTTP ${res.status}`);
      return;
    }
    this.logger.log(`[sms:log] à=${msg.to} texte="${msg.text.slice(0, 40)}…"`);
  }
}
