// SPDX-License-Identifier: AGPL-3.0-or-later
import { Controller, Get } from '@nestjs/common';
import { Auth } from '../auth/auth.decorator';
import { StatsService } from './stats.service';

@Controller('stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  /** Tableau de bord de pilotage (admin OF / formateur). */
  @Get('dashboard')
  @Auth('admin_of', 'formateur')
  dashboard() {
    return this.stats.dashboard();
  }
}
