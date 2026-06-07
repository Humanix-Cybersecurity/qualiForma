// SPDX-License-Identifier: AGPL-3.0-or-later
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LmsController } from './lms.controller';
import { LmsService } from './lms.service';

@Module({
  imports: [AuthModule],
  controllers: [LmsController],
  providers: [LmsService],
})
export class LmsModule {}
