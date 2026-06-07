// SPDX-License-Identifier: AGPL-3.0-or-later
import { Controller, ForbiddenException, Get, Header, Headers, Res } from '@nestjs/common';
import type { Response } from 'express';
import { loadEnv } from '../config/env';
import { MetricsService } from './metrics.service';

/**
 * Exposition Prometheus — hors périmètre tenant (exclue du TenantMiddleware).
 * Si `METRICS_TOKEN` est défini, l'accès exige `Authorization: Bearer <token>` ;
 * sinon l'endpoint n'est censé être atteignable que sur le réseau privé de scraping.
 */
@Controller('metrics')
export class MetricsController {
  private readonly env = loadEnv();

  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async scrape(@Headers('authorization') authz: string | undefined, @Res() res: Response): Promise<void> {
    if (this.env.METRICS_TOKEN && authz !== `Bearer ${this.env.METRICS_TOKEN}`) {
      throw new ForbiddenException('Accès métriques refusé.');
    }
    res.setHeader('Content-Type', this.metrics.contentType);
    res.send(await this.metrics.metrics());
  }
}
