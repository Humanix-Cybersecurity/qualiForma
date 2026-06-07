-- CreateEnum
CREATE TYPE "LeconType" AS ENUM ('texte', 'video', 'pdf');

-- CreateTable
CREATE TABLE "module_formation" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "formation_id" UUID NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "publie" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "module_formation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lecon" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "module_id" UUID NOT NULL,
    "titre" TEXT NOT NULL,
    "type" "LeconType" NOT NULL DEFAULT 'texte',
    "contenu" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lecon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lecon_progression" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "lecon_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lecon_progression_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "module_formation_tenant_id_idx" ON "module_formation"("tenant_id");

-- CreateIndex
CREATE INDEX "module_formation_formation_id_idx" ON "module_formation"("formation_id");

-- CreateIndex
CREATE INDEX "lecon_tenant_id_idx" ON "lecon"("tenant_id");

-- CreateIndex
CREATE INDEX "lecon_module_id_idx" ON "lecon"("module_id");

-- CreateIndex
CREATE INDEX "lecon_progression_tenant_id_idx" ON "lecon_progression"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "lecon_progression_lecon_id_user_id_key" ON "lecon_progression"("lecon_id", "user_id");

-- AddForeignKey
ALTER TABLE "lecon" ADD CONSTRAINT "lecon_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "module_formation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lecon_progression" ADD CONSTRAINT "lecon_progression_lecon_id_fkey" FOREIGN KEY ("lecon_id") REFERENCES "lecon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
