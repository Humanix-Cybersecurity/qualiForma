// SPDX-License-Identifier: AGPL-3.0-or-later
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FacturationController } from './facturation.controller';
import { FacturationService } from './facturation.service';

@Module({
  imports: [AuthModule],
  controllers: [FacturationController],
  providers: [FacturationService],
  exports: [FacturationService],
})
export class FacturationModule {}
