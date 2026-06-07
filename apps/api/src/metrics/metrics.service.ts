// SPDX-License-Identifier: AGPL-3.0-or-later
import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

/**
 * Métriques Prometheus (prom-client, Apache-2.0) exposées sur /metrics.
 * Conçu pour un scraping par une stack souveraine auto-hébergée (Prometheus + Grafana,
 * Apache-2.0/AGPLv3) — aucun service d'observabilité US requis.
 *
 * Aucune étiquette ne porte de donnée personnelle ni d'identifiant tenant à forte cardinalité ;
 * le `tenant` n'est PAS labellisé pour éviter l'explosion de cardinalité et la fuite d'usage.
 */
@Injectable()
export class MetricsService {
  readonly registry = new Registry();

  readonly httpDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Durée des requêtes HTTP',
    labelNames: ['method', 'route', 'status'] as const,
    buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
    registers: [this.registry],
  });

  readonly emargementsSignes = new Counter({
    name: 'emargements_signes_total',
    help: 'Émargements signés',
    labelNames: ['methode'] as const,
    registers: [this.registry],
  });

  readonly scellements = new Counter({
    name: 'scellements_total',
    help: 'Scellements de demi-journée réalisés',
    labelNames: ['niveau', 'horodatage'] as const,
    registers: [this.registry],
  });

  constructor() {
    this.registry.setDefaultLabels({ app: 'humanix-api' });
    collectDefaultMetrics({ register: this.registry });
  }

  metrics(): Promise<string> {
    return this.registry.metrics();
  }

  get contentType(): string {
    return this.registry.contentType;
  }
}
