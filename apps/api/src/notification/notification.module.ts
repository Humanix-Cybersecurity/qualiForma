// SPDX-License-Identifier: AGPL-3.0-or-later
import { Global, Module } from '@nestjs/common';
import { NotificationService } from './notification.service';

/** Notifications souveraines (e-mail/SMS FR). Global : réutilisable par les relances. */
@Global()
@Module({
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
