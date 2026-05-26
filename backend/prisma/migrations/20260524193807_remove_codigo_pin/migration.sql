/*
  Warnings:

  - You are about to drop the column `codigo_pin` on the `salas` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "salas_codigo_pin_key";

-- AlterTable
ALTER TABLE "salas" DROP COLUMN "codigo_pin";
