/*
  Warnings:

  - Added the required column `consolidated_payload` to the `scellement_creneau` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "scellement_creneau" ADD COLUMN     "consolidated_payload" JSONB NOT NULL;
