// SPDX-License-Identifier: AGPL-3.0-or-later
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ExportsModule } from '../exports/exports.module';
import { EmargementController } from './emargement.controller';
import { EmargementService } from './emargement.service';
import { ScellementService } from './scellement.service';
import { ProofPackService } from './proof-pack.service';

@Module({
  imports: [AuthModule, ExportsModule], // @Auth(...) + ExportsService (feuille PDF du pack)
  controllers: [EmargementController],
  providers: [EmargementService, ScellementService, ProofPackService],
  exports: [EmargementService],
})
export class EmargementModule {}
