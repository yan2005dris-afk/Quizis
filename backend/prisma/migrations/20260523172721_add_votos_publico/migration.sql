-- CreateTable
CREATE TABLE "votos_publico" (
    "voto_id" SERIAL NOT NULL,
    "ronda_id" INTEGER NOT NULL,
    "pregunta_id" INTEGER NOT NULL,
    "participante_id" INTEGER NOT NULL,
    "opcion_id" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votos_publico_pkey" PRIMARY KEY ("voto_id")
);

-- AddForeignKey
ALTER TABLE "votos_publico" ADD CONSTRAINT "votos_publico_ronda_id_fkey" FOREIGN KEY ("ronda_id") REFERENCES "rondas"("ronda_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votos_publico" ADD CONSTRAINT "votos_publico_pregunta_id_fkey" FOREIGN KEY ("pregunta_id") REFERENCES "preguntas"("pregunta_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votos_publico" ADD CONSTRAINT "votos_publico_participante_id_fkey" FOREIGN KEY ("participante_id") REFERENCES "participantes"("participante_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votos_publico" ADD CONSTRAINT "votos_publico_opcion_id_fkey" FOREIGN KEY ("opcion_id") REFERENCES "opciones_pregunta"("opcion_id") ON DELETE RESTRICT ON UPDATE CASCADE;
