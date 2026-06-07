-- CreateTable
CREATE TABLE "scellement_creneau" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "creneau_id" UUID NOT NULL,
    "consolidated_sha256" TEXT NOT NULL,
    "nb_signatures" INTEGER NOT NULL,
    "niveau" TEXT NOT NULL,
    "horodatage_type" "HorodatageType" NOT NULL,
    "horodatage_token" TEXT,
    "audit_prev_hash" TEXT,
    "audit_hash" TEXT NOT NULL,
    "verification_token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scellement_creneau_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scellement_creneau_verification_token_key" ON "scellement_creneau"("verification_token");

-- CreateIndex
CREATE INDEX "scellement_creneau_tenant_id_idx" ON "scellement_creneau"("tenant_id");

-- CreateIndex
CREATE INDEX "scellement_creneau_creneau_id_idx" ON "scellement_creneau"("creneau_id");

-- AddForeignKey
ALTER TABLE "scellement_creneau" ADD CONSTRAINT "scellement_creneau_creneau_id_fkey" FOREIGN KEY ("creneau_id") REFERENCES "creneau"("id") ON DELETE CASCADE ON UPDATE CASCADE;
