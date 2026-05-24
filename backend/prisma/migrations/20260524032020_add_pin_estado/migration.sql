/*
  Warnings:

  - A unique constraint covering the columns `[pin]` on the table `salas` will be added. If there are existing duplicate values, this will fail.
  - The required column `pin` was added to the `salas` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "salas" ADD COLUMN     "pin" TEXT NOT NULL,
ALTER COLUMN "estado" SET DEFAULT 'borrador';

-- CreateIndex
CREATE UNIQUE INDEX "salas_pin_key" ON "salas"("pin");
