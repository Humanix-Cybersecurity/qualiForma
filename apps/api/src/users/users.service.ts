// SPDX-License-Identifier: AGPL-3.0-or-later
import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import type { AccessClaims } from '@humanix/domain';
import { requireTenantContext } from '../tenant/tenant-context';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';
import { QuotasService } from '../quotas/quotas.service';
import { AuditService } from '../audit/audit.service';

export interface CreateUserInput {
  email: string;
  prenom?: string;
  nom?: string;
  role: 'apprenant' | 'formateur' | 'referent_handicap';
  /** Mot de passe initial optionnel ; sinon un mot de passe temporaire est généré et renvoyé. */
  password?: string;
}

/** Mot de passe temporaire robuste (à transmettre puis à changer par l'utilisateur). */
function genTempPassword(): string {
  // 18 octets base64url → ~24 caractères, entropie largement suffisante.
  return randomBytes(18).toString('base64url');
}

@Injectable()
export class UsersService {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly quotas: QuotasService,
    private readonly audit: AuditService,
  ) {}

  /** Crée un compte apprenant/formateur/référent dans le tenant courant (réservé admin OF). */
  async create(input: CreateUserInput, actor: AccessClaims) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const { tenantId } = requireTenantContext();
      const email = input.email.toLowerCase().trim();

      const existing = await tx.user.findFirst({ where: { email } });
      if (existing) throw new ConflictException('Un compte existe déjà avec cet e-mail.');

      await this.quotas.assertCanAddUser(tx, tenantId);

      const temporaryPassword = input.password ?? genTempPassword();
      if (temporaryPassword.length < 12) {
        throw new BadRequestException('Le mot de passe doit comporter au moins 12 caractères.');
      }
      const passwordHash = await argon2.hash(temporaryPassword, { type: argon2.argon2id });

      const user = await tx.user.create({
        data: {
          tenantId,
          email,
          passwordHash,
          role: input.role,
          prenom: input.prenom ?? null,
          nom: input.nom ?? null,
        },
        select: { id: true, email: true, role: true, prenom: true, nom: true },
      });

      await this.audit.record(tx, {
        action: 'user.create',
        entity: 'user',
        entityId: user.id,
        actorUserId: actor.sub,
        payload: { role: user.role },
      });

      // Le mot de passe temporaire n'est renvoyé qu'à la création, jamais stocké en clair.
      return { ...user, temporaryPassword: input.password ? undefined : temporaryPassword };
    });
  }

  /** Met à jour l'identité, le rôle (parmi apprenant/formateur/référent) ou l'activation d'un compte. */
  async update(
    id: string,
    actor: AccessClaims,
    input: { prenom?: string | null; nom?: string | null; role?: CreateUserInput['role']; isActive?: boolean },
  ) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const user = await tx.user.findFirst({ where: { id }, select: { id: true, role: true } });
      if (!user) throw new NotFoundException('Utilisateur introuvable.');
      // On ne gère ici que les rôles non privilégiés (pas d'admin/super-admin via cet écran).
      if (user.role === 'admin_of' || user.role === 'super_admin') {
        throw new ForbiddenException('Compte administrateur non modifiable via cet écran.');
      }
      const updated = await tx.user.update({
        where: { id },
        data: {
          ...(input.prenom !== undefined ? { prenom: input.prenom } : {}),
          ...(input.nom !== undefined ? { nom: input.nom } : {}),
          ...(input.role !== undefined ? { role: input.role } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        },
        select: { id: true, email: true, prenom: true, nom: true, role: true, isActive: true },
      });
      await this.audit.record(tx, {
        action: 'user.update',
        entity: 'user',
        entityId: id,
        actorUserId: actor.sub,
        payload: { role: updated.role, isActive: updated.isActive },
      });
      return updated;
    });
  }

  /**
   * Supprime un compte UNIQUEMENT s'il n'a ni inscription ni émargement (sinon : conservation
   * pour la valeur probante → désactiver, ou anonymiser via RGPD). Évite les suppressions
   * destructrices de preuves.
   */
  async remove(id: string, actor: AccessClaims) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const user = await tx.user.findFirst({ where: { id }, select: { id: true, role: true } });
      if (!user) throw new NotFoundException('Utilisateur introuvable.');
      if (user.role === 'admin_of' || user.role === 'super_admin') {
        throw new ForbiddenException('Compte administrateur non supprimable via cet écran.');
      }
      const [nbInscriptions, nbEmargements] = await Promise.all([
        tx.inscription.count({ where: { apprenantId: id } }),
        tx.emargement.count({ where: { userId: id } }),
      ]);
      if (nbInscriptions > 0 || nbEmargements > 0) {
        throw new BadRequestException(
          'Compte rattaché à des inscriptions/émargements : désactivez-le ou anonymisez-le (RGPD) plutôt que de le supprimer.',
        );
      }
      await tx.user.delete({ where: { id } });
      await this.audit.record(tx, { action: 'user.delete', entity: 'user', entityId: id, actorUserId: actor.sub });
      return { id, deleted: true };
    });
  }

  /** Liste les comptes du tenant, filtrable par rôle (pour l'inscription aux sessions). */
  async list(role?: CreateUserInput['role']) {
    return this.tenantPrisma.withTenant((tx) =>
      tx.user.findMany({
        where: role ? { role } : { role: { in: ['apprenant', 'formateur', 'referent_handicap'] } },
        orderBy: [{ nom: 'asc' }, { email: 'asc' }],
        select: { id: true, email: true, prenom: true, nom: true, role: true, isActive: true },
      }),
    );
  }
}
