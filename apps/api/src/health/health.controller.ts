// SPDX-License-Identifier: AGPL-3.0-or-later
import { Controller, Get } from '@nestjs/common';

/** Sonde de vivacité — hors périmètre tenant (exclue du TenantMiddleware). */
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
