// SPDX-License-Identifier: AGPL-3.0-or-later
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ReclamationsController } from './reclamations.controller';
import { ReclamationsService } from './reclamations.service';

@Module({
  imports: [AuthModule],
  controllers: [ReclamationsController],
  providers: [ReclamationsService],
})
export class ReclamationsModule {}
