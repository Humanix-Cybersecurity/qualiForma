// SPDX-License-Identifier: AGPL-3.0-or-later
import { Controller, Get, Param, Post } from '@nestjs/common';
import type { AccessClaims } from '@humanix/domain';
import { Auth } from '../auth/auth.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { RgpdService } from './rgpd.service';

@Controller('rgpd')
export class RgpdController {
  constructor(private readonly rgpd: RgpdService) {}

  /** Droit d'accès / portabilité : l'utilisateur exporte ses propres données. */
  @Get('me/export')
  @Auth()
  exportMine(@CurrentUser() user: AccessClaims) {
    return this.rgpd.exportMyData(user);
  }

  /** Droit à l'effacement (pseudonymisation, legal hold sur les preuves). Admin OF. */
  @Post('users/:id/anonymiser')
  @Auth('admin_of')
  anonymiser(@Param('id') id: string, @CurrentUser() user: AccessClaims) {
    return this.rgpd.anonymizeUser(id, user);
  }
}
