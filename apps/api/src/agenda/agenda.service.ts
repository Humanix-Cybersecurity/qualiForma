// SPDX-License-Identifier: AGPL-3.0-or-later
import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';

function toMin(hhmm: string): number {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
}
function overlap(aDebut: string, aFin: string, bDebut: string, bFin: string): boolean {
  return Math.max(toMin(aDebut), toMin(bDebut)) < Math.min(toMin(aFin), toMin(bFin));
}

export interface ConflitInfo {
  type: 'formateur' | 'lieu';
  avecCreneauId: string;
}

@Injectable()
export class AgendaService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  /** Agenda des créneaux sur une plage de dates, avec détection des conflits formateur/lieu. */
  async agenda(params: { from: string; to: string; formateurId?: string }) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const creneaux = await tx.creneau.findMany({
        where: {
          date: { gte: new Date(params.from), lte: new Date(params.to) },
          ...(params.formateurId ? { formateurId: params.formateurId } : {}),
        },
        orderBy: [{ date: 'asc' }, { heureDebut: 'asc' }],
        include: {
          session: { include: { formation: { select: { intitule: true } } } },
          formateur: { select: { id: true, prenom: true, nom: true, email: true } },
        },
      });

      // Détection de conflits : même jour + chevauchement horaire, même formateur ou même lieu.
      const conflits = new Map<string, ConflitInfo[]>();
      const add = (id: string, info: ConflitInfo) => {
        const list = conflits.get(id) ?? [];
        list.push(info);
        conflits.set(id, list);
      };
      const byDay = new Map<string, typeof creneaux>();
      for (const c of creneaux) {
        const k = c.date.toISOString().slice(0, 10);
        const list = byDay.get(k) ?? [];
        list.push(c);
        byDay.set(k, list);
      }
      for (const list of byDay.values()) {
        for (let i = 0; i < list.length; i++) {
          for (let j = i + 1; j < list.length; j++) {
            const a = list[i]!;
            const b = list[j]!;
            if (!overlap(a.heureDebut, a.heureFin, b.heureDebut, b.heureFin)) continue;
            if (a.formateurId && a.formateurId === b.formateurId) {
              add(a.id, { type: 'formateur', avecCreneauId: b.id });
              add(b.id, { type: 'formateur', avecCreneauId: a.id });
            }
            if (a.lieu && b.lieu && a.lieu === b.lieu) {
              add(a.id, { type: 'lieu', avecCreneauId: b.id });
              add(b.id, { type: 'lieu', avecCreneauId: a.id });
            }
          }
        }
      }

      const items = creneaux.map((c) => ({
        id: c.id,
        date: c.date.toISOString().slice(0, 10),
        periode: c.periode,
        heureDebut: c.heureDebut,
        heureFin: c.heureFin,
        lieu: c.lieu,
        visioUrl: c.visioUrl,
        sessionId: c.sessionId,
        formation: c.session.formation.intitule,
        formateur: c.formateur ? ([c.formateur.prenom, c.formateur.nom].filter(Boolean).join(' ') || c.formateur.email) : null,
        signatureOuverte: c.signatureOuverte,
        conflits: conflits.get(c.id) ?? [],
      }));

      return {
        from: params.from,
        to: params.to,
        items,
        nbConflits: items.filter((i) => i.conflits.length > 0).length,
      };
    });
  }
}
