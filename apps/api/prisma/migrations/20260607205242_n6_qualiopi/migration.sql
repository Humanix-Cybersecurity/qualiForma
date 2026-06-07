-- CreateEnum
CREATE TYPE "IndicateurStatutValeur" AS ENUM ('conforme', 'a_completer', 'non_applicable');

-- CreateTable
CREATE TABLE "indicateur_statut" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "numero" INTEGER NOT NULL,
    "statut" "IndicateurStatutValeur" NOT NULL DEFAULT 'a_completer',
    "notes" TEXT,
    "document_id" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "indicateur_statut_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "indicateur_statut_tenant_id_idx" ON "indicateur_statut"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "indicateur_statut_tenant_id_numero_key" ON "indicateur_statut"("tenant_id", "numero");
