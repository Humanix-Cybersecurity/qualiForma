// SPDX-License-Identifier: AGPL-3.0-or-later
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { QualiopiController } from './qualiopi.controller';
import { QualiopiService } from './qualiopi.service';

@Module({
  imports: [AuthModule],
  controllers: [QualiopiController],
  providers: [QualiopiService],
})
export class QualiopiModule {}
