/*
  Warnings:

  - You are about to drop the column `comodin_ia` on the `salas` table. All the data in the column will be lost.
  - You are about to drop the column `comodin_llamada` on the `salas` table. All the data in the column will be lost.
  - You are about to drop the column `comodin_publico` on the `salas` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "salas" DROP COLUMN "comodin_ia",
DROP COLUMN "comodin_llamada",
DROP COLUMN "comodin_publico";

-- CreateTable
CREATE TABLE "comodines" (
    "comodin_id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,
    "borrado_en" TIMESTAMP(3),

    CONSTRAINT "comodines_pkey" PRIMARY KEY ("comodin_id")
);

-- CreateTable
CREATE TABLE "sala_comodines" (
    "sala_comodin_id" SERIAL NOT NULL,
    "sala_id" INTEGER NOT NULL,
    "comodin_id" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sala_comodines_pkey" PRIMARY KEY ("sala_comodin_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "comodines_nombre_key" ON "comodines"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "sala_comodines_sala_id_comodin_id_key" ON "sala_comodines"("sala_id", "comodin_id");

-- AddForeignKey
ALTER TABLE "sala_comodines" ADD CONSTRAINT "sala_comodines_sala_id_fkey" FOREIGN KEY ("sala_id") REFERENCES "salas"("sala_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sala_comodines" ADD CONSTRAINT "sala_comodines_comodin_id_fkey" FOREIGN KEY ("comodin_id") REFERENCES "comodines"("comodin_id") ON DELETE RESTRICT ON UPDATE CASCADE;
