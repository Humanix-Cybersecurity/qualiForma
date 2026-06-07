// SPDX-License-Identifier: AGPL-3.0-or-later
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SuperAdminModule } from '../superadmin/superadmin.module';
import { JobsController } from './jobs.controller';
import { PurgeService } from './purge.service';
import { RelancesService } from './relances.service';

/** Jobs planifiés : relances signatures manquantes + purge RGPD. */
@Module({
  imports: [AuthModule, SuperAdminModule], // @Auth + client privilégié (cross-tenant)
  controllers: [JobsController],
  providers: [RelancesService, PurgeService],
  exports: [RelancesService, PurgeService],
})
export class JobsModule {}
