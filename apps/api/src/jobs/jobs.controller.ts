// SPDX-License-Identifier: AGPL-3.0-or-later
import { Controller, Post } from '@nestjs/common';
import { Auth } from '../auth/auth.decorator';
import { PurgeService } from './purge.service';
import { RelancesService } from './relances.service';

/** Exécution manuelle des jobs (exploitation / supervision). Réservé super-admin. */
@Controller('admin/jobs')
@Auth('super_admin')
export class JobsController {
  constructor(
    private readonly relances: RelancesService,
    private readonly purge: PurgeService,
  ) {}

  @Post('relancer')
  relancer() {
    return this.relances.relancer();
  }

  @Post('purger')
  purger() {
    return this.purge.purger();
  }
}
