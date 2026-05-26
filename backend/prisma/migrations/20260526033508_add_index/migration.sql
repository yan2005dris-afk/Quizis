-- CreateIndex
CREATE INDEX "opciones_pregunta_pregunta_id_idx" ON "opciones_pregunta"("pregunta_id");

-- CreateIndex
CREATE INDEX "participantes_sala_id_borrado_en_rol_idx" ON "participantes"("sala_id", "borrado_en", "rol");

-- CreateIndex
CREATE INDEX "preguntas_banco_id_nivel_idx" ON "preguntas"("banco_id", "nivel");

-- CreateIndex
CREATE INDEX "respuestas_ronda_ronda_id_idx" ON "respuestas_ronda"("ronda_id");

-- CreateIndex
CREATE INDEX "respuestas_ronda_pregunta_id_idx" ON "respuestas_ronda"("pregunta_id");

-- CreateIndex
CREATE INDEX "rondas_sala_id_estado_idx" ON "rondas"("sala_id", "estado");

-- CreateIndex
CREATE INDEX "salas_borrado_en_estado_creado_en_idx" ON "salas"("borrado_en", "estado", "creado_en");
