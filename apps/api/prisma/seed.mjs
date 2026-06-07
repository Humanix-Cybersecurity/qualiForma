// SPDX-License-Identifier: AGPL-3.0-or-later
// Seed de démo (étape 3) : un tenant complet et cohérent pour le développement et les démos.
// Exécuté via le rôle superuser (DATABASE_MIGRATION_URL) car le provisioning écrit hors
// contexte tenant. Idempotent : réinitialise le tenant "demo" (cascade) puis le reconstruit.
//
//   1 tenant · plan + abonnement + quota · 1 admin OF, 1 formateur, 1 référent handicap,
//   3 apprenants · 1 entreprise cliente · 1 formation · 1 session sur 2 jours = 4 créneaux
//   (demi-journées) · 3 inscriptions · 1 convention · convocations · 2 questionnaires.
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const url = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
const prisma = new PrismaClient({ datasources: { db: { url } } });

const SLUG = 'demo';
const PASSWORD = 'Demo!Passw0rd';

async function main() {
  const passwordHash = await argon2.hash(PASSWORD, { type: argon2.argon2id });

  // Plan global (SaaS) — upsert par code.
  const plan = await prisma.plan.upsert({
    where: { code: 'pro' },
    update: {},
    create: {
      code: 'pro',
      name: 'Pro',
      priceCents: 9900,
      interval: 'mensuel',
      maxUsers: 50,
      maxActiveSessions: 20,
      storageBytes: BigInt(20) * BigInt(1024) ** BigInt(3),
      features: { exports: true, sso: false },
    },
  });

  // Réinitialise le tenant démo (cascade supprime tout son contenu).
  await prisma.tenant.deleteMany({ where: { slug: SLUG } });
  const tenant = await prisma.tenant.create({
    data: { slug: SLUG, name: 'Organisme de formation démo' },
  });
  const tenantId = tenant.id;

  await prisma.subscription.create({
    data: { tenantId, planId: plan.id, status: 'active' },
  });
  await prisma.quota.create({
    data: { tenantId, maxUsers: 50, maxActiveSessions: 20 },
  });

  // Utilisateurs (tous rôles internes au tenant).
  const mkUser = (email, role, prenom, nom, extra = {}) =>
    prisma.user.create({
      data: { tenantId, email, passwordHash, role, prenom, nom, ...extra },
    });

  const admin = await mkUser('admin@demo.test', 'admin_of', 'Awa', 'Diallo');
  const formateur = await mkUser('formateur@demo.test', 'formateur', 'Karim', 'Benali');
  await mkUser('referent@demo.test', 'referent_handicap', 'Léa', 'Moreau');

  const apprenants = [];
  for (const [i, [email, prenom, nom]] of [
    ['apprenant1@demo.test', 'Sofia', 'Nguyen'],
    ['apprenant2@demo.test', 'Hugo', 'Martin'],
    ['apprenant3@demo.test', 'Inès', 'Lefebvre'],
  ].entries()) {
    apprenants.push(
      await mkUser(email, 'apprenant', prenom, nom,
        i === 2
          ? { handicapAdaptations: 'Supports en gros caractères ; pauses supplémentaires.' }
          : {}),
    );
  }

  const entreprise = await prisma.entrepriseCliente.create({
    data: {
      tenantId,
      raisonSociale: 'ACME Industries',
      siret: '12345678900012',
      contactEmail: 'rh@acme.test',
      contactNom: 'Service RH',
    },
  });

  // Formation (catalogue) + indicateurs Qualiopi rattachés.
  const formation = await prisma.formation.create({
    data: {
      tenantId,
      intitule: 'Cybersécurité — Fondamentaux',
      objectifs: 'Identifier les menaces courantes ; appliquer les bonnes pratiques d\'hygiène numérique.',
      prerequis: 'Aucun prérequis technique.',
      dureeHeures: '14',
      tarifCents: 120000,
      modalitesAccesHandicap:
        'Locaux accessibles PMR. Adaptations possibles sur demande au référent handicap.',
      indicateursQualiopi: ['1', '2', '8', '9'],
    },
  });

  // Session sur 2 jours → 4 créneaux (demi-journées) animés par le formateur.
  const session = await prisma.session.create({
    data: {
      tenantId,
      formationId: formation.id,
      intitule: 'Session juin 2026',
      dateDebut: new Date('2026-06-15'),
      dateFin: new Date('2026-06-16'),
      statut: 'planifiee',
      modaliteLieu: 'presentiel',
      lieu: 'Paris — Salle A',
      formateurId: formateur.id,
    },
  });

  const creneaux = [
    ['2026-06-15', 'matin', '09:00', '12:30'],
    ['2026-06-15', 'apres_midi', '14:00', '17:30'],
    ['2026-06-16', 'matin', '09:00', '12:30'],
    ['2026-06-16', 'apres_midi', '14:00', '17:30'],
  ];
  for (const [ordre, [date, periode, hd, hf]] of creneaux.entries()) {
    await prisma.creneau.create({
      data: {
        tenantId,
        sessionId: session.id,
        date: new Date(date),
        periode,
        heureDebut: hd,
        heureFin: hf,
        lieu: 'Paris — Salle A',
        formateurId: formateur.id,
        ordre,
      },
    });
  }

  // Inscriptions (le premier apprenant via l'entreprise cliente).
  const inscriptions = [];
  for (const [i, a] of apprenants.entries()) {
    inscriptions.push(
      await prisma.inscription.create({
        data: {
          tenantId,
          sessionId: session.id,
          apprenantId: a.id,
          entrepriseId: i === 0 ? entreprise.id : null,
          statut: 'confirmee',
        },
      }),
    );
  }

  // Convention de formation (signature SES par défaut, SEA prévue via QTSP).
  await prisma.convention.create({
    data: {
      tenantId,
      numero: 'CONV-2026-0001',
      sessionId: session.id,
      entrepriseId: entreprise.id,
      statut: 'signee',
      montantCents: 120000,
    },
  });

  // Convocations.
  for (const ins of inscriptions) {
    await prisma.convocation.create({
      data: { tenantId, inscriptionId: ins.id, sentAt: new Date('2026-06-01') },
    });
  }

  // Questionnaires (mapping Qualiopi §9) : positionnement amont + satisfaction à chaud.
  const positionnement = await prisma.questionnaire.create({
    data: {
      tenantId,
      type: 'positionnement_amont',
      titre: 'Positionnement amont',
      formationId: formation.id,
      sessionId: session.id,
      questions: {
        create: [
          { tenantId, libelle: 'Quel est votre niveau actuel en cybersécurité ?', type: 'echelle', options: { min: 1, max: 5 }, ordre: 0 },
          { tenantId, libelle: 'Quelles sont vos attentes principales ?', type: 'texte_libre', obligatoire: false, ordre: 1 },
        ],
      },
    },
  });

  await prisma.questionnaire.create({
    data: {
      tenantId,
      type: 'satisfaction_chaud',
      titre: 'Satisfaction à chaud',
      formationId: formation.id,
      sessionId: session.id,
      anonyme: true,
      questions: {
        create: [
          { tenantId, libelle: 'Recommanderiez-vous cette formation ?', type: 'booleen', ordre: 0 },
          { tenantId, libelle: 'Note globale', type: 'echelle', options: { min: 1, max: 5 }, ordre: 1 },
          { tenantId, libelle: 'Commentaires libres', type: 'texte_libre', obligatoire: false, ordre: 2 },
        ],
      },
    },
  });

  console.log('✓ Seed de démo créé :');
  console.log(`  tenant "${SLUG}" (${tenantId})`);
  console.log(`  comptes (mot de passe : ${PASSWORD}) :`);
  console.log('    admin@demo.test (admin_of) · formateur@demo.test · referent@demo.test');
  console.log('    apprenant1@demo.test, apprenant2@demo.test, apprenant3@demo.test');
  console.log(`  formation "${formation.intitule}" · session ${session.id} · 4 créneaux`);
  console.log(`  Login : POST /auth/login  (en-tête x-tenant-slug: ${SLUG})`);
  void admin;
  void positionnement;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
