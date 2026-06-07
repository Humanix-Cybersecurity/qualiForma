// SPDX-License-Identifier: AGPL-3.0-or-later
import { Global, Module } from '@nestjs/common';
import { QuotasService } from './quotas.service';

/** Quotas par tenant, globaux pour application transverse (sessions, utilisateurs). */
@Global()
@Module({
  providers: [QuotasService],
  exports: [QuotasService],
})
export class QuotasModule {}
