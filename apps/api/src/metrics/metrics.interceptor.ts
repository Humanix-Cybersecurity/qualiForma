// SPDX-License-Identifier: AGPL-3.0-or-later
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

/** Mesure la durée de chaque requête HTTP par route normalisée (motif, pas l'URL réelle). */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const end = this.metrics.httpDuration.startTimer();
    // Motif de route (ex. /emargement/:id) plutôt que l'URL — évite l'explosion de cardinalité.
    const route = (req.route?.path as string | undefined) ?? req.path ?? 'unknown';
    return next.handle().pipe(
      finalize(() => {
        end({ method: req.method, route, status: String(res.statusCode) });
      }),
    );
  }
}
