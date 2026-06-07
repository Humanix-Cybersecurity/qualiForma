// SPDX-License-Identifier: AGPL-3.0-or-later
import { Controller, Get } from '@nestjs/common';
import type { AccessClaims } from '@humanix/domain';
import { Auth } from '../auth/auth.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { CatalogService } from './catalog.service';

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('formations')
  @Auth('admin_of', 'formateur')
  formations() {
    return this.catalog.listFormations();
  }

  @Get('sessions')
  @Auth('admin_of', 'formateur')
  sessions() {
    return this.catalog.listSessions();
  }

  @Get('me/inscriptions')
  @Auth('apprenant')
  myInscriptions(@CurrentUser() user: AccessClaims) {
    return this.catalog.myInscriptions(user);
  }
}
