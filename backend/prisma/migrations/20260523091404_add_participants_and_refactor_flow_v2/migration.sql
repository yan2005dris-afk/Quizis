/*
  Warnings:

  - You are about to drop the column `nickname` on the `rondas` table. All the data in the column will be lost.
  - You are about to drop the column `nickname` on the `votos_publico` table. All the data in the column will be lost.
  - You are about to drop the column `opcion_votada` on the `votos_publico` table. All the data in the column will be lost.
  - Added the required column `participante_id` to the `rondas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `opcion_id` to the `votos_publico` table without a default value. This is not possible if the table is not empty.
  - Added the required column `participante_id` to the `votos_publico` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "rondas" DROP COLUMN "nickname",
ADD COLUMN     "participante_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "votos_publico" DROP COLUMN "nickname",
DROP COLUMN "opcion_votada",
ADD COLUMN     "opcion_id" INTEGER NOT NULL,
ADD COLUMN     "participante_id" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "participantes" (
    "participante_id" SERIAL NOT NULL,
    "sala_id" INTEGER NOT NULL,
    "nickname" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'observador',
    "is_online" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,
    "borrado_en" TIMESTAMP(3),

    CONSTRAINT "participantes_pkey" PRIMARY KEY ("participante_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "participantes_sala_id_nickname_key" ON "participantes"("sala_id", "nickname");

-- AddForeignKey
ALTER TABLE "participantes" ADD CONSTRAINT "participantes_sala_id_fkey" FOREIGN KEY ("sala_id") REFERENCES "salas"("sala_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rondas" ADD CONSTRAINT "rondas_participante_id_fkey" FOREIGN KEY ("participante_id") REFERENCES "participantes"("participante_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votos_publico" ADD CONSTRAINT "votos_publico_pregunta_id_fkey" FOREIGN KEY ("pregunta_id") REFERENCES "preguntas"("pregunta_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votos_publico" ADD CONSTRAINT "votos_publico_participante_id_fkey" FOREIGN KEY ("participante_id") REFERENCES "participantes"("participante_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votos_publico" ADD CONSTRAINT "votos_publico_opcion_id_fkey" FOREIGN KEY ("opcion_id") REFERENCES "opciones_pregunta"("opcion_id") ON DELETE RESTRICT ON UPDATE CASCADE;
