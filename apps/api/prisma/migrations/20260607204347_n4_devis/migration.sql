-- CreateEnum
CREATE TYPE "DevisStatut" AS ENUM ('brouillon', 'envoye', 'accepte', 'refuse', 'expire');

-- CreateTable
CREATE TABLE "devis" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "numero" TEXT NOT NULL,
    "session_id" UUID,
    "entreprise_id" UUID,
    "apprenant_id" UUID,
    "financeur" "Financeur",
    "statut" "DevisStatut" NOT NULL DEFAULT 'brouillon',
    "date_devis" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validite_jours" INTEGER NOT NULL DEFAULT 30,
    "total_ht_cents" INTEGER NOT NULL DEFAULT 0,
    "total_tva_cents" INTEGER NOT NULL DEFAULT 0,
    "total_ttc_cents" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "facture_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devis_ligne" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "devis_id" UUID NOT NULL,
    "designation" TEXT NOT NULL,
    "quantite" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "prix_unitaire_cents" INTEGER NOT NULL,
    "tva_taux_bp" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "devis_ligne_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "devis_tenant_id_idx" ON "devis"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "devis_tenant_id_numero_key" ON "devis"("tenant_id", "numero");

-- CreateIndex
CREATE INDEX "devis_ligne_tenant_id_idx" ON "devis_ligne"("tenant_id");

-- CreateIndex
CREATE INDEX "devis_ligne_devis_id_idx" ON "devis_ligne"("devis_id");

-- AddForeignKey
ALTER TABLE "devis_ligne" ADD CONSTRAINT "devis_ligne_devis_id_fkey" FOREIGN KEY ("devis_id") REFERENCES "devis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
