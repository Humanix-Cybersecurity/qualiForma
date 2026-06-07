// SPDX-License-Identifier: AGPL-3.0-or-later
import { BadRequestException } from '@nestjs/common';
import { CatalogService } from './catalog.service';

type Emarg = { signataire: 'apprenant' | 'formateur'; statut: string };

/** Construit un CatalogService avec un faux TenantPrisma/Audit pour tester la règle de clôture. */
function makeService(scenario: {
  creneaux: { id: string; emargements: Emarg[]; scelle?: 'rfc3161' | 'internal' | null }[];
  attendus: number;
}) {
  const fakeTx = {
    session: {
      findFirst: async () => ({
        id: 'sess-1',
        intitule: 'Cyber',
        statut: 'planifiee',
        formation: { intitule: 'Cyber' },
        creneaux: scenario.creneaux.map((c, i) => ({
          id: c.id,
          date: new Date(`2026-06-0${i + 1}T00:00:00Z`),
          periode: 'matin',
        })),
      }),
      update: async () => ({}),
    },
    inscription: { count: async () => scenario.attendus },
    emargement: {
      findMany: async ({ where }: { where: { creneauId: string } }) =>
        scenario.creneaux.find((c) => c.id === where.creneauId)?.emargements ?? [],
    },
    scellementCreneau: {
      findFirst: async ({ where }: { where: { creneauId: string } }) => {
        const c = scenario.creneaux.find((x) => x.id === where.creneauId);
        return c?.scelle ? { horodatageType: c.scelle, niveau: 'AES', createdAt: new Date() } : null;
      },
    },
  };
  const tenantPrisma = { withTenant: <T>(fn: (tx: unknown) => Promise<T>) => fn(fakeTx) };
  const audit = { record: async () => undefined };
  return new CatalogService(tenantPrisma as never, {} as never, audit as never);
}

const user = { sub: 'u1', tid: 't1', role: 'admin_of', mfa: false } as never;

describe('CatalogService — complétude & clôture', () => {
  it('pret quand tout est résolu, co-signé et scellé qualifié', async () => {
    const svc = makeService({
      attendus: 2,
      creneaux: [
        {
          id: 'c1',
          scelle: 'rfc3161',
          emargements: [
            { signataire: 'apprenant', statut: 'signe' },
            { signataire: 'apprenant', statut: 'absent' },
            { signataire: 'formateur', statut: 'signe' },
          ],
        },
      ],
    });
    const r = await svc.sessionCompletude('sess-1');
    expect(r.pret).toBe(true);
    expect(r.alertes).toHaveLength(0);
  });

  it('alerte si un émargement n’est pas résolu', async () => {
    const svc = makeService({
      attendus: 2,
      creneaux: [
        { id: 'c1', scelle: 'rfc3161', emargements: [{ signataire: 'apprenant', statut: 'signe' }, { signataire: 'formateur', statut: 'signe' }] },
      ],
    });
    const r = await svc.sessionCompletude('sess-1');
    expect(r.pret).toBe(false);
    expect(r.alertes.some((a) => a.includes('non résolu'))).toBe(true);
  });

  it('alerte si non scellé ; avertit si horodatage non qualifié', async () => {
    const svc = makeService({
      attendus: 1,
      creneaux: [
        { id: 'c1', scelle: null, emargements: [{ signataire: 'apprenant', statut: 'signe' }, { signataire: 'formateur', statut: 'signe' }] },
        { id: 'c2', scelle: 'internal', emargements: [{ signataire: 'apprenant', statut: 'signe' }, { signataire: 'formateur', statut: 'signe' }] },
      ],
    });
    const r = await svc.sessionCompletude('sess-1');
    expect(r.alertes.some((a) => a.includes('non scellé'))).toBe(true);
    expect(r.avertissements.some((a) => a.includes('non qualifié'))).toBe(true);
  });

  it('cloturerSession refuse sans force quand des preuves manquent', async () => {
    const svc = makeService({
      attendus: 1,
      creneaux: [{ id: 'c1', scelle: null, emargements: [] }],
    });
    await expect(svc.cloturerSession('sess-1', user, false)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cloturerSession accepte avec force malgré les écarts', async () => {
    const svc = makeService({
      attendus: 1,
      creneaux: [{ id: 'c1', scelle: null, emargements: [] }],
    });
    const r = await svc.cloturerSession('sess-1', user, true);
    expect(r.statut).toBe('terminee');
    expect(r.force).toBe(true);
  });
});
