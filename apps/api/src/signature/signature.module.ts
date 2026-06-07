// SPDX-License-Identifier: AGPL-3.0-or-later
import { Global, Module } from '@nestjs/common';
import { TsaService } from './tsa.service';

/** Services transverses de signature (autorité d'horodatage). */
@Global()
@Module({
  providers: [TsaService],
  exports: [TsaService],
})
export class SignatureModule {}
