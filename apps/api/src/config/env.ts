// SPDX-License-Identifier: AGPL-3.0-or-later
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  PUBLIC_BASE_URL: z.string().url().default('http://localhost:3000'),
  // Origines autorisées (CORS) pour le front, séparées par des virgules.
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173,http://localhost:4173')
    .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),

  DATABASE_URL: z.string().min(1),
  // Connexion privilégiée (rôle propriétaire) pour l'exploitation super-admin SaaS
  // (cross-tenant, hors RLS — module séparé du cœur AGPL, ADR 0007). Optionnelle.
  DATABASE_ADMIN_URL: z.string().optional(),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(2_592_000),
  MFA_ISSUER: z.string().default('Humanix'),

  // Clé AES-256-GCM (base64, 32 octets) pour chiffrer les secrets MFA au repos.
  APP_ENCRYPTION_KEY: z
    .string()
    .refine((v) => Buffer.from(v, 'base64').length === 32, '32 octets en base64 attendus.'),

  // --- Stockage objet S3 / MinIO ---
  S3_ENDPOINT: z.string().url().default('http://localhost:9000'),
  S3_REGION: z.string().default('eu-west-1'),
  S3_BUCKET: z.string().default('humanix'),
  S3_ACCESS_KEY: z.string().default('minioadmin'),
  S3_SECRET_KEY: z.string().default('minioadmin'),
  S3_FORCE_PATH_STYLE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  S3_SSE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),

  // --- ClamAV ---
  CLAMAV_HOST: z.string().default('localhost'),
  CLAMAV_PORT: z.coerce.number().int().positive().default(3310),

  // --- Limites d'upload (sécurité, ADR 0006) ---
  UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(52_428_800), // 50 Mio

  // --- Horodatage RFC 3161 / eIDAS (souveraineté) ---
  // qualified : PSCo qualifié FR (Universign/Datasure…) — OBLIGATOIRE en production.
  // internal  : horodatage interne signé (DEV uniquement). mock : tests.
  TSA_MODE: z.enum(['qualified', 'internal', 'mock']).default('internal'),
  TSA_URL: z.string().url().optional(),
  TSA_POLICY_OID: z.string().optional(),
  // Liste blanche d'hôtes TSA autorisés (PSCo qualifiés FR). Vide = pas de contrainte d'hôte.
  TSA_ALLOWED_HOSTS: z
    .string()
    .default('')
    .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),

  // --- Jetons de signature anti-fraude (QR dynamique) ---
  JETON_TTL_SECONDS: z.coerce.number().int().positive().default(60), // QR projeté (rotatif)
  JETON_LIEN_TTL_SECONDS: z.coerce.number().int().positive().default(86_400), // lien e-mail

  // --- Conservation des preuves (RGPD) : 10 ans par défaut pour la valeur probante ---
  PREUVE_RETENTION_YEARS: z.coerce.number().int().positive().default(10),

  // --- Jobs planifiés (relances + purge RGPD). Nécessite DATABASE_ADMIN_URL (accès privilégié). ---
  JOBS_ENABLED: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),

  // --- Stockage WORM (souveraineté) : object-lock + rétention sur les objets ---
  S3_OBJECT_LOCK: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  S3_RETENTION_YEARS: z.coerce.number().int().positive().default(10),

  // --- Notifications (opérateurs FR uniquement) ---
  MAIL_PROVIDER: z.enum(['log', 'brevo']).default('log'),
  MAIL_FROM: z.string().default('no-reply@humanix.example'),
  BREVO_API_KEY: z.string().optional(),
  SMS_PROVIDER: z.enum(['log', 'octopush']).default('log'),
  SMS_SENDER: z.string().default('Humanix'),
  OCTOPUSH_API_LOGIN: z.string().optional(),
  OCTOPUSH_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/** Valide et mémoïse l'environnement. Lève au démarrage si invalide (fail-fast). */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Configuration d'environnement invalide :\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export const ENV = 'ENV';
