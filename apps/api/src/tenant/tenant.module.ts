// SPDX-License-Identifier: AGPL-3.0-or-later
import { Module } from '@nestjs/common';
import { TenantResolverService } from './tenant-resolver.service';

@Module({
  providers: [TenantResolverService],
  exports: [TenantResolverService],
})
export class TenantModule {}
