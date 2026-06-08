-- AlterTable
ALTER TABLE "respuestas_ronda" ADD COLUMN     "participante_id" INTEGER;

-- AddForeignKey
ALTER TABLE "respuestas_ronda" ADD CONSTRAINT "respuestas_ronda_participante_id_fkey" FOREIGN KEY ("participante_id") REFERENCES "participantes"("participante_id") ON DELETE SET NULL ON UPDATE CASCADE;
