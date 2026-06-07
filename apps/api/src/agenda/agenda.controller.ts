// SPDX-License-Identifier: AGPL-3.0-or-later
import { Controller, Get, Query } from '@nestjs/common';
import { Auth } from '../auth/auth.decorator';
import { AgendaService } from './agenda.service';

const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

@Controller('agenda')
export class AgendaController {
  constructor(private readonly agenda: AgendaService) {}

  @Get()
  @Auth('admin_of', 'formateur')
  get(@Query('from') from?: string, @Query('to') to?: string, @Query('formateurId') formateurId?: string) {
    // Défaut : 30 jours glissants à partir d'aujourd'hui (dates calculées côté client en pratique).
    const f = isDate(from) ? from : new Date().toISOString().slice(0, 10);
    const t = isDate(to) ? to : f;
    return this.agenda.agenda({ from: f, to: t, ...(formateurId ? { formateurId } : {}) });
  }
}
