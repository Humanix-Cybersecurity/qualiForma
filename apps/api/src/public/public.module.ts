// SPDX-License-Identifier: AGPL-3.0-or-later
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PublicController } from './public.controller';
import { DemandesController } from './demandes.controller';
import { PublicService } from './public.service';

@Module({
  imports: [AuthModule],
  controllers: [PublicController, DemandesController],
  providers: [PublicService],
})
export class PublicModule {}
