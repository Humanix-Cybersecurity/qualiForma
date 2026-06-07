// SPDX-License-Identifier: AGPL-3.0-or-later
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EmargementController } from './emargement.controller';
import { EmargementService } from './emargement.service';

@Module({
  imports: [AuthModule], // pour @Auth(...)
  controllers: [EmargementController],
  providers: [EmargementService],
  exports: [EmargementService],
})
export class EmargementModule {}
