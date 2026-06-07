// SPDX-License-Identifier: AGPL-3.0-or-later
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CryptoService } from '../common/crypto.service';
import { RolesGuard } from '../rbac/roles.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, CryptoService, JwtAuthGuard, RolesGuard],
  // Exportés pour que les futurs modules métier puissent utiliser @Auth(...).
  exports: [JwtAuthGuard, RolesGuard, JwtModule],
})
export class AuthModule {}
