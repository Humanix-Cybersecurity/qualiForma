// SPDX-License-Identifier: AGPL-3.0-or-later
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FacturationModule } from '../facturation/facturation.module';
import { DevisController } from './devis.controller';
import { DevisService } from './devis.service';

@Module({
  imports: [AuthModule, FacturationModule],
  controllers: [DevisController],
  providers: [DevisService],
})
export class DevisModule {}
