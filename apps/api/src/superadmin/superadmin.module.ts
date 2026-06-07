// SPDX-License-Identifier: AGPL-3.0-or-later
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SuperAdminController } from './superadmin.controller';
import { SuperAdminPrismaService } from './superadmin-prisma.service';
import { SuperAdminService } from './superadmin.service';

/** Module d'exploitation SaaS (super-admin). Séparé du cœur AGPL — désactivable. */
@Module({
  imports: [AuthModule],
  controllers: [SuperAdminController],
  providers: [SuperAdminService, SuperAdminPrismaService],
})
export class SuperAdminModule {}
