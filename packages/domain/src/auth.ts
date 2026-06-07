// SPDX-License-Identifier: AGPL-3.0-or-later
import { z } from 'zod';
import { roleSchema } from './roles';

/** Politique de mot de passe (cf. §12 sécurité). */
export const passwordSchema = z
  .string()
  .min(12, 'Le mot de passe doit contenir au moins 12 caractères.')
  .max(256)
  .refine((v) => /[a-z]/.test(v), 'Au moins une minuscule.')
  .refine((v) => /[A-Z]/.test(v), 'Au moins une majuscule.')
  .refine((v) => /[0-9]/.test(v), 'Au moins un chiffre.')
  .refine((v) => /[^A-Za-z0-9]/.test(v), 'Au moins un caractère spécial.');

export const emailSchema = z.string().email().max(320).toLowerCase();

/** Code TOTP à 6 chiffres. */
export const totpCodeSchema = z.string().regex(/^\d{6}$/, 'Code à 6 chiffres attendu.');

export const loginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(256),
  /** Requis si la MFA est activée pour l'utilisateur. */
  totp: totpCodeSchema.optional(),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export const refreshInputSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshInput = z.infer<typeof refreshInputSchema>;

/** Claims portés par le JWT d'accès. `tid` = tenant, `sub` = user id. */
export const accessClaimsSchema = z.object({
  sub: z.string().uuid(),
  tid: z.string().uuid(),
  role: roleSchema,
  /** True une fois la MFA validée dans la session (si l'utilisateur l'a activée). */
  mfa: z.boolean(),
});
export type AccessClaims = z.infer<typeof accessClaimsSchema>;

export const tokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int().positive(),
});
export type TokenPair = z.infer<typeof tokenPairSchema>;
