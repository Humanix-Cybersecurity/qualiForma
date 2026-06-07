-- CreateEnum
CREATE TYPE "PlanInterval" AS ENUM ('mensuel', 'annuel');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('trialing', 'active', 'past_due', 'canceled');

-- CreateEnum
CREATE TYPE "CreneauPeriode" AS ENUM ('matin', 'apres_midi');

-- CreateEnum
CREATE TYPE "SessionStatut" AS ENUM ('planifiee', 'en_cours', 'terminee', 'annulee');

-- CreateEnum
CREATE TYPE "InscriptionStatut" AS ENUM ('prevue', 'confirmee', 'presente', 'abandon', 'annulee');

-- CreateEnum
CREATE TYPE "ModaliteLieu" AS ENUM ('presentiel', 'visio', 'hybride');

-- CreateEnum
CREATE TYPE "SignataireType" AS ENUM ('apprenant', 'formateur');

-- CreateEnum
CREATE TYPE "EmargementMethode" AS ENUM ('code', 'qr', 'manuscrite');

-- CreateEnum
CREATE TYPE "EmargementStatut" AS ENUM ('en_attente', 'signe', 'refuse', 'absent');

-- CreateEnum
CREATE TYPE "SignatureLevel" AS ENUM ('SES', 'SEA');

-- CreateEnum
CREATE TYPE "HorodatageType" AS ENUM ('serveur', 'rfc3161');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('pdf', 'txt', 'zip', 'syllabus', 'autre');

-- CreateEnum
CREATE TYPE "DocumentScope" AS ENUM ('tenant', 'formation', 'session', 'apprenant');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('pending', 'clean', 'infected', 'error');

-- CreateEnum
CREATE TYPE "ConventionStatut" AS ENUM ('brouillon', 'envoyee', 'signee', 'annulee');

-- CreateEnum
CREATE TYPE "QuestionnaireType" AS ENUM ('positionnement_amont', 'evaluation_acquis', 'satisfaction_chaud', 'satisfaction_froid', 'recueil_besoin');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('texte_libre', 'choix_unique', 'choix_multiple', 'echelle', 'booleen');

-- CreateEnum
CREATE TYPE "CertificatStatut" AS ENUM ('brouillon', 'emis', 'annule');

-- CreateEnum
CREATE TYPE "ReclamationStatut" AS ENUM ('ouverte', 'en_traitement', 'resolue', 'cloturee');

-- CreateEnum
CREATE TYPE "ActionStatut" AS ENUM ('ouverte', 'en_cours', 'cloturee');

-- AlterTable
ALTER TABLE "app_user" ADD COLUMN     "handicap_adaptations" TEXT,
ADD COLUMN     "nom" TEXT,
ADD COLUMN     "prenom" TEXT;

-- CreateTable
CREATE TABLE "plan" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_cents" INTEGER NOT NULL DEFAULT 0,
    "interval" "PlanInterval" NOT NULL DEFAULT 'mensuel',
    "max_users" INTEGER,
    "max_active_sessions" INTEGER,
    "storage_bytes" BIGINT,
    "features" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'active',
    "current_period_end" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quota" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "max_users" INTEGER,
    "max_active_sessions" INTEGER,
    "storage_bytes" BIGINT,

    CONSTRAINT "quota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formation" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "intitule" TEXT NOT NULL,
    "objectifs" TEXT,
    "prerequis" TEXT,
    "duree_heures" DECIMAL(6,2) NOT NULL,
    "tarif_cents" INTEGER,
    "modalites_acces_handicap" TEXT,
    "indicateurs_qualiopi" TEXT[],
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "formation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "formation_id" UUID NOT NULL,
    "intitule" TEXT,
    "date_debut" DATE NOT NULL,
    "date_fin" DATE NOT NULL,
    "statut" "SessionStatut" NOT NULL DEFAULT 'planifiee',
    "modalite_lieu" "ModaliteLieu" NOT NULL DEFAULT 'presentiel',
    "lieu" TEXT,
    "formateur_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creneau" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "periode" "CreneauPeriode" NOT NULL,
    "heure_debut" TEXT NOT NULL,
    "heure_fin" TEXT NOT NULL,
    "lieu" TEXT,
    "visio_url" TEXT,
    "formateur_id" UUID,
    "signature_ouverte" BOOLEAN NOT NULL DEFAULT false,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creneau_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entreprise_cliente" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "raison_sociale" TEXT NOT NULL,
    "siret" TEXT,
    "adresse" TEXT,
    "contact_email" TEXT,
    "contact_nom" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entreprise_cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "convention" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "numero" TEXT NOT NULL,
    "session_id" UUID,
    "entreprise_id" UUID,
    "statut" "ConventionStatut" NOT NULL DEFAULT 'brouillon',
    "signature_level" "SignatureLevel" NOT NULL DEFAULT 'SES',
    "montant_cents" INTEGER,
    "document_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "convention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscription" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "apprenant_id" UUID NOT NULL,
    "entreprise_id" UUID,
    "statut" "InscriptionStatut" NOT NULL DEFAULT 'prevue',
    "date_inscription" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "convocation" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "inscription_id" UUID NOT NULL,
    "document_id" UUID,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "convocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emargement" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "creneau_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "signataire" "SignataireType" NOT NULL,
    "methode" "EmargementMethode" NOT NULL,
    "statut" "EmargementStatut" NOT NULL DEFAULT 'en_attente',
    "timestamp_serveur" TIMESTAMP(3),
    "timestamp_client" TIMESTAMP(3),
    "ip" TEXT,
    "user_agent" TEXT,
    "geoloc" JSONB,
    "hash_payload" TEXT,
    "heure_arrivee_reelle" TEXT,
    "heure_depart_reelle" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emargement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preuve_signature" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "emargement_id" UUID NOT NULL,
    "payload_sha256" TEXT NOT NULL,
    "faisceau" JSONB NOT NULL,
    "signature_level" "SignatureLevel" NOT NULL DEFAULT 'SES',
    "horodatage_type" "HorodatageType" NOT NULL DEFAULT 'serveur',
    "horodatage_token" TEXT,
    "audit_prev_hash" TEXT,
    "audit_hash" TEXT NOT NULL,
    "verification_token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "preuve_signature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "type" "DocumentType" NOT NULL,
    "scope" "DocumentScope" NOT NULL,
    "formation_id" UUID,
    "session_id" UUID,
    "apprenant_id" UUID,
    "nom_fichier" TEXT NOT NULL,
    "object_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "taille_octets" BIGINT NOT NULL,
    "checksum_sha256" TEXT NOT NULL,
    "scan_status" "ScanStatus" NOT NULL DEFAULT 'pending',
    "chiffre" BOOLEAN NOT NULL DEFAULT true,
    "uploaded_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaire" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "type" "QuestionnaireType" NOT NULL,
    "titre" TEXT NOT NULL,
    "formation_id" UUID,
    "session_id" UUID,
    "anonyme" BOOLEAN NOT NULL DEFAULT false,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questionnaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "questionnaire_id" UUID NOT NULL,
    "libelle" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "options" JSONB,
    "obligatoire" BOOLEAN NOT NULL DEFAULT true,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaire_soumission" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "questionnaire_id" UUID NOT NULL,
    "inscription_id" UUID,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questionnaire_soumission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reponse" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "soumission_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "valeur" TEXT NOT NULL,

    CONSTRAINT "reponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restitution" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "questionnaire_id" UUID NOT NULL,
    "resume" JSONB NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "restitution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificat_realisation" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "inscription_id" UUID NOT NULL,
    "numero" TEXT NOT NULL,
    "statut" "CertificatStatut" NOT NULL DEFAULT 'brouillon',
    "heures_realisees" DECIMAL(6,2) NOT NULL,
    "signature_level" "SignatureLevel" NOT NULL DEFAULT 'SES',
    "document_id" UUID,
    "date_emission" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificat_realisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decompte_facturation" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "entreprise_id" UUID,
    "periode_debut" DATE NOT NULL,
    "periode_fin" DATE NOT NULL,
    "total_heures" DECIMAL(8,2) NOT NULL,
    "montant_cents" INTEGER,
    "document_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decompte_facturation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decompte_ligne" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "decompte_id" UUID NOT NULL,
    "apprenant_id" UUID NOT NULL,
    "heures" DECIMAL(8,2) NOT NULL,

    CONSTRAINT "decompte_ligne_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reclamation" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "session_id" UUID,
    "auteur_user_id" UUID,
    "objet" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "statut" "ReclamationStatut" NOT NULL DEFAULT 'ouverte',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "reclamation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_amelioration_continue" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "reclamation_id" UUID,
    "description" TEXT NOT NULL,
    "responsable_user_id" UUID,
    "statut" "ActionStatut" NOT NULL DEFAULT 'ouverte',
    "due_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "action_amelioration_continue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plan_code_key" ON "plan"("code");

-- CreateIndex
CREATE INDEX "subscription_tenant_id_idx" ON "subscription"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "quota_tenant_id_key" ON "quota"("tenant_id");

-- CreateIndex
CREATE INDEX "formation_tenant_id_idx" ON "formation"("tenant_id");

-- CreateIndex
CREATE INDEX "session_tenant_id_idx" ON "session"("tenant_id");

-- CreateIndex
CREATE INDEX "session_formation_id_idx" ON "session"("formation_id");

-- CreateIndex
CREATE INDEX "creneau_tenant_id_idx" ON "creneau"("tenant_id");

-- CreateIndex
CREATE INDEX "creneau_session_id_idx" ON "creneau"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "creneau_session_id_date_periode_key" ON "creneau"("session_id", "date", "periode");

-- CreateIndex
CREATE INDEX "entreprise_cliente_tenant_id_idx" ON "entreprise_cliente"("tenant_id");

-- CreateIndex
CREATE INDEX "convention_tenant_id_idx" ON "convention"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "convention_tenant_id_numero_key" ON "convention"("tenant_id", "numero");

-- CreateIndex
CREATE INDEX "inscription_tenant_id_idx" ON "inscription"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "inscription_session_id_apprenant_id_key" ON "inscription"("session_id", "apprenant_id");

-- CreateIndex
CREATE INDEX "convocation_tenant_id_idx" ON "convocation"("tenant_id");

-- CreateIndex
CREATE INDEX "emargement_tenant_id_idx" ON "emargement"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "emargement_creneau_id_user_id_key" ON "emargement"("creneau_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "preuve_signature_emargement_id_key" ON "preuve_signature"("emargement_id");

-- CreateIndex
CREATE UNIQUE INDEX "preuve_signature_verification_token_key" ON "preuve_signature"("verification_token");

-- CreateIndex
CREATE INDEX "preuve_signature_tenant_id_idx" ON "preuve_signature"("tenant_id");

-- CreateIndex
CREATE INDEX "document_tenant_id_idx" ON "document"("tenant_id");

-- CreateIndex
CREATE INDEX "document_tenant_id_scope_idx" ON "document"("tenant_id", "scope");

-- CreateIndex
CREATE INDEX "questionnaire_tenant_id_idx" ON "questionnaire"("tenant_id");

-- CreateIndex
CREATE INDEX "question_tenant_id_idx" ON "question"("tenant_id");

-- CreateIndex
CREATE INDEX "question_questionnaire_id_idx" ON "question"("questionnaire_id");

-- CreateIndex
CREATE INDEX "questionnaire_soumission_tenant_id_idx" ON "questionnaire_soumission"("tenant_id");

-- CreateIndex
CREATE INDEX "reponse_tenant_id_idx" ON "reponse"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "restitution_questionnaire_id_key" ON "restitution"("questionnaire_id");

-- CreateIndex
CREATE INDEX "restitution_tenant_id_idx" ON "restitution"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificat_realisation_inscription_id_key" ON "certificat_realisation"("inscription_id");

-- CreateIndex
CREATE INDEX "certificat_realisation_tenant_id_idx" ON "certificat_realisation"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificat_realisation_tenant_id_numero_key" ON "certificat_realisation"("tenant_id", "numero");

-- CreateIndex
CREATE INDEX "decompte_facturation_tenant_id_idx" ON "decompte_facturation"("tenant_id");

-- CreateIndex
CREATE INDEX "decompte_ligne_tenant_id_idx" ON "decompte_ligne"("tenant_id");

-- CreateIndex
CREATE INDEX "reclamation_tenant_id_idx" ON "reclamation"("tenant_id");

-- CreateIndex
CREATE INDEX "action_amelioration_continue_tenant_id_idx" ON "action_amelioration_continue"("tenant_id");

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quota" ADD CONSTRAINT "quota_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formation" ADD CONSTRAINT "formation_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_formation_id_fkey" FOREIGN KEY ("formation_id") REFERENCES "formation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_formateur_id_fkey" FOREIGN KEY ("formateur_id") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creneau" ADD CONSTRAINT "creneau_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creneau" ADD CONSTRAINT "creneau_formateur_id_fkey" FOREIGN KEY ("formateur_id") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entreprise_cliente" ADD CONSTRAINT "entreprise_cliente_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convention" ADD CONSTRAINT "convention_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convention" ADD CONSTRAINT "convention_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convention" ADD CONSTRAINT "convention_entreprise_id_fkey" FOREIGN KEY ("entreprise_id") REFERENCES "entreprise_cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscription" ADD CONSTRAINT "inscription_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscription" ADD CONSTRAINT "inscription_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscription" ADD CONSTRAINT "inscription_apprenant_id_fkey" FOREIGN KEY ("apprenant_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscription" ADD CONSTRAINT "inscription_entreprise_id_fkey" FOREIGN KEY ("entreprise_id") REFERENCES "entreprise_cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convocation" ADD CONSTRAINT "convocation_inscription_id_fkey" FOREIGN KEY ("inscription_id") REFERENCES "inscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emargement" ADD CONSTRAINT "emargement_creneau_id_fkey" FOREIGN KEY ("creneau_id") REFERENCES "creneau"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emargement" ADD CONSTRAINT "emargement_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preuve_signature" ADD CONSTRAINT "preuve_signature_emargement_id_fkey" FOREIGN KEY ("emargement_id") REFERENCES "emargement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire" ADD CONSTRAINT "questionnaire_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire" ADD CONSTRAINT "questionnaire_formation_id_fkey" FOREIGN KEY ("formation_id") REFERENCES "formation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question" ADD CONSTRAINT "question_questionnaire_id_fkey" FOREIGN KEY ("questionnaire_id") REFERENCES "questionnaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_soumission" ADD CONSTRAINT "questionnaire_soumission_questionnaire_id_fkey" FOREIGN KEY ("questionnaire_id") REFERENCES "questionnaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_soumission" ADD CONSTRAINT "questionnaire_soumission_inscription_id_fkey" FOREIGN KEY ("inscription_id") REFERENCES "inscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reponse" ADD CONSTRAINT "reponse_soumission_id_fkey" FOREIGN KEY ("soumission_id") REFERENCES "questionnaire_soumission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reponse" ADD CONSTRAINT "reponse_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restitution" ADD CONSTRAINT "restitution_questionnaire_id_fkey" FOREIGN KEY ("questionnaire_id") REFERENCES "questionnaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificat_realisation" ADD CONSTRAINT "certificat_realisation_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificat_realisation" ADD CONSTRAINT "certificat_realisation_inscription_id_fkey" FOREIGN KEY ("inscription_id") REFERENCES "inscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decompte_facturation" ADD CONSTRAINT "decompte_facturation_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decompte_facturation" ADD CONSTRAINT "decompte_facturation_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decompte_facturation" ADD CONSTRAINT "decompte_facturation_entreprise_id_fkey" FOREIGN KEY ("entreprise_id") REFERENCES "entreprise_cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decompte_ligne" ADD CONSTRAINT "decompte_ligne_decompte_id_fkey" FOREIGN KEY ("decompte_id") REFERENCES "decompte_facturation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reclamation" ADD CONSTRAINT "reclamation_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reclamation" ADD CONSTRAINT "reclamation_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_amelioration_continue" ADD CONSTRAINT "action_amelioration_continue_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_amelioration_continue" ADD CONSTRAINT "action_amelioration_continue_reclamation_id_fkey" FOREIGN KEY ("reclamation_id") REFERENCES "reclamation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
