// SPDX-License-Identifier: AGPL-3.0-or-later
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { QuestionnairesController } from './questionnaires.controller';
import { QuestionnairesService } from './questionnaires.service';

@Module({
  imports: [AuthModule],
  controllers: [QuestionnairesController],
  providers: [QuestionnairesService],
  exports: [QuestionnairesService],
})
export class QuestionnairesModule {}
