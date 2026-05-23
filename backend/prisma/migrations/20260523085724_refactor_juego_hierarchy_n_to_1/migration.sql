/*
  Warnings:

  - You are about to drop the column `opciones` on the `preguntas` table. All the data in the column will be lost.
  - You are about to drop the column `respuesta_correcta` on the `preguntas` table. All the data in the column will be lost.
  - You are about to drop the column `sala_id` on the `preguntas` table. All the data in the column will be lost.
  - Added the required column `banco_id` to the `preguntas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `banco_id` to the `salas` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "preguntas" DROP CONSTRAINT "preguntas_sala_id_fkey";

-- AlterTable
ALTER TABLE "preguntas" DROP COLUMN "opciones",
DROP COLUMN "respuesta_correcta",
DROP COLUMN "sala_id",
ADD COLUMN     "banco_id" INTEGER NOT NULL,
ADD COLUMN     "categoria" TEXT,
ADD COLUMN     "feedback_correcto" TEXT,
ADD COLUMN     "feedback_incorrecto" TEXT;

-- AlterTable
ALTER TABLE "respuestas_ronda" ADD COLUMN     "opcion_id" INTEGER;

-- AlterTable
ALTER TABLE "salas" ADD COLUMN     "banco_id" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "banco_preguntas" (
    "banco_id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,
    "borrado_en" TIMESTAMP(3),

    CONSTRAINT "banco_preguntas_pkey" PRIMARY KEY ("banco_id")
);

-- CreateTable
CREATE TABLE "opciones_pregunta" (
    "opcion_id" SERIAL NOT NULL,
    "pregunta_id" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "es_correcta" BOOLEAN NOT NULL DEFAULT false,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,
    "borrado_en" TIMESTAMP(3),

    CONSTRAINT "opciones_pregunta_pkey" PRIMARY KEY ("opcion_id")
);

-- AddForeignKey
ALTER TABLE "opciones_pregunta" ADD CONSTRAINT "opciones_pregunta_pregunta_id_fkey" FOREIGN KEY ("pregunta_id") REFERENCES "preguntas"("pregunta_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preguntas" ADD CONSTRAINT "preguntas_banco_id_fkey" FOREIGN KEY ("banco_id") REFERENCES "banco_preguntas"("banco_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuestas_ronda" ADD CONSTRAINT "respuestas_ronda_opcion_id_fkey" FOREIGN KEY ("opcion_id") REFERENCES "opciones_pregunta"("opcion_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salas" ADD CONSTRAINT "salas_banco_id_fkey" FOREIGN KEY ("banco_id") REFERENCES "banco_preguntas"("banco_id") ON DELETE RESTRICT ON UPDATE CASCADE;
