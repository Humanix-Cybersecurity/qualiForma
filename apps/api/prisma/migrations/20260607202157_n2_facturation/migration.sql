-- CreateEnum
CREATE TYPE "Financeur" AS ENUM ('entreprise', 'opco', 'particulier', 'pole_emploi', 'cpf', 'region', 'etat', 'autre_of', 'autre');

-- CreateEnum
CREATE TYPE "FactureStatut" AS ENUM ('brouillon', 'emise', 'partiellement_payee', 'payee', 'annulee');

-- CreateEnum
CREATE TYPE "MoyenPaiement" AS ENUM ('virement', 'cheque', 'carte', 'especes', 'prelevement', 'autre');

-- AlterTable
ALTER TABLE "inscription" ADD COLUMN     "financeur" "Financeur",
ADD COLUMN     "prix_cents" INTEGER;

-- CreateTable
CREATE TABLE "facture" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "numero" TEXT NOT NULL,
    "session_id" UUID,
    "entreprise_id" UUID,
    "apprenant_id" UUID,
    "financeur" "Financeur",
    "statut" "FactureStatut" NOT NULL DEFAULT 'brouillon',
    "date_emission" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_echeance" TIMESTAMP(3),
    "total_ht_cents" INTEGER NOT NULL DEFAULT 0,
    "total_tva_cents" INTEGER NOT NULL DEFAULT 0,
    "total_ttc_cents" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facture_ligne" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "facture_id" UUID NOT NULL,
    "designation" TEXT NOT NULL,
    "quantite" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "prix_unitaire_cents" INTEGER NOT NULL,
    "tva_taux_bp" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "facture_ligne_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paiement" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "facture_id" UUID NOT NULL,
    "date_paiement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "montant_cents" INTEGER NOT NULL,
    "moyen" "MoyenPaiement" NOT NULL DEFAULT 'virement',
    "reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paiement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "facture_tenant_id_idx" ON "facture"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "facture_tenant_id_numero_key" ON "facture"("tenant_id", "numero");

-- CreateIndex
CREATE INDEX "facture_ligne_tenant_id_idx" ON "facture_ligne"("tenant_id");

-- CreateIndex
CREATE INDEX "facture_ligne_facture_id_idx" ON "facture_ligne"("facture_id");

-- CreateIndex
CREATE INDEX "paiement_tenant_id_idx" ON "paiement"("tenant_id");

-- CreateIndex
CREATE INDEX "paiement_facture_id_idx" ON "paiement"("facture_id");

-- AddForeignKey
ALTER TABLE "facture_ligne" ADD CONSTRAINT "facture_ligne_facture_id_fkey" FOREIGN KEY ("facture_id") REFERENCES "facture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiement" ADD CONSTRAINT "paiement_facture_id_fkey" FOREIGN KEY ("facture_id") REFERENCES "facture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
