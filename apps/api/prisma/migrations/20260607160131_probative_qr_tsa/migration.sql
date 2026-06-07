-- CreateEnum
CREATE TYPE "SignatureJetonScope" AS ENUM ('partage', 'apprenant');

-- AlterEnum
ALTER TYPE "EmargementMethode" ADD VALUE 'lien';

-- AlterTable
ALTER TABLE "emargement" ADD COLUMN     "consentement_geoloc" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "signature_jeton" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "creneau_id" UUID NOT NULL,
    "user_id" UUID,
    "token" TEXT NOT NULL,
    "scope" "SignatureJetonScope" NOT NULL DEFAULT 'partage',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signature_jeton_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "signature_jeton_token_key" ON "signature_jeton"("token");

-- CreateIndex
CREATE INDEX "signature_jeton_tenant_id_idx" ON "signature_jeton"("tenant_id");

-- CreateIndex
CREATE INDEX "signature_jeton_creneau_id_idx" ON "signature_jeton"("creneau_id");

-- AddForeignKey
ALTER TABLE "signature_jeton" ADD CONSTRAINT "signature_jeton_creneau_id_fkey" FOREIGN KEY ("creneau_id") REFERENCES "creneau"("id") ON DELETE CASCADE ON UPDATE CASCADE;
