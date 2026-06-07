-- CreateEnum
CREATE TYPE "DemandeStatut" AS ENUM ('nouvelle', 'traitee', 'convertie', 'refusee');

-- CreateTable
CREATE TABLE "demande_inscription" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "session_id" UUID,
    "formation_id" UUID,
    "nom" TEXT NOT NULL,
    "prenom" TEXT,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "message" TEXT,
    "statut" "DemandeStatut" NOT NULL DEFAULT 'nouvelle',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demande_inscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "demande_inscription_tenant_id_idx" ON "demande_inscription"("tenant_id");
