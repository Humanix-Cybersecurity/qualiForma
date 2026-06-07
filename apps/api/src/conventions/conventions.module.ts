// SPDX-License-Identifier: AGPL-3.0-or-later
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConventionsController } from './conventions.controller';
import { ConventionsService } from './conventions.service';

@Module({
  imports: [AuthModule],
  controllers: [ConventionsController],
  providers: [ConventionsService],
})
export class ConventionsModule {}
