-- CreateTable
CREATE TABLE "preguntas" (
    "pregunta_id" SERIAL NOT NULL,
    "sala_id" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "opciones" JSONB NOT NULL,
    "respuesta_correcta" TEXT NOT NULL,
    "nivel" INTEGER NOT NULL DEFAULT 1,
    "monto" DECIMAL(65,30),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,
    "borrado_en" TIMESTAMP(3),

    CONSTRAINT "preguntas_pkey" PRIMARY KEY ("pregunta_id")
);

-- CreateTable
CREATE TABLE "respuestas_ronda" (
    "respuesta_id" SERIAL NOT NULL,
    "ronda_id" INTEGER NOT NULL,
    "pregunta_id" INTEGER NOT NULL,
    "respuesta_elegida" TEXT,
    "es_correcta" BOOLEAN NOT NULL DEFAULT false,
    "comodin_usado" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "respuestas_ronda_pkey" PRIMARY KEY ("respuesta_id")
);

-- CreateTable
CREATE TABLE "rondas" (
    "ronda_id" SERIAL NOT NULL,
    "sala_id" INTEGER NOT NULL,
    "nickname" TEXT NOT NULL,
    "numero_ronda" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "preguntas_asignadas" JSONB,
    "fecha_inicio" TIMESTAMP(3),
    "fecha_fin" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rondas_pkey" PRIMARY KEY ("ronda_id")
);

-- CreateTable
CREATE TABLE "salas" (
    "sala_id" SERIAL NOT NULL,
    "admin_id" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "token_compartido" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'esperando',
    "limite_preguntas" INTEGER NOT NULL DEFAULT 15,
    "comodin_publico" BOOLEAN NOT NULL DEFAULT true,
    "comodin_ia" BOOLEAN NOT NULL DEFAULT true,
    "comodin_llamada" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,
    "borrado_en" TIMESTAMP(3),

    CONSTRAINT "salas_pkey" PRIMARY KEY ("sala_id")
);

-- CreateTable
CREATE TABLE "votos_publico" (
    "voto_id" SERIAL NOT NULL,
    "ronda_id" INTEGER NOT NULL,
    "pregunta_id" INTEGER NOT NULL,
    "nickname" TEXT NOT NULL,
    "opcion_votada" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votos_publico_pkey" PRIMARY KEY ("voto_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "salas_token_compartido_key" ON "salas"("token_compartido");

-- AddForeignKey
ALTER TABLE "preguntas" ADD CONSTRAINT "preguntas_sala_id_fkey" FOREIGN KEY ("sala_id") REFERENCES "salas"("sala_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuestas_ronda" ADD CONSTRAINT "respuestas_ronda_ronda_id_fkey" FOREIGN KEY ("ronda_id") REFERENCES "rondas"("ronda_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuestas_ronda" ADD CONSTRAINT "respuestas_ronda_pregunta_id_fkey" FOREIGN KEY ("pregunta_id") REFERENCES "preguntas"("pregunta_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rondas" ADD CONSTRAINT "rondas_sala_id_fkey" FOREIGN KEY ("sala_id") REFERENCES "salas"("sala_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salas" ADD CONSTRAINT "salas_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "usuarios"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votos_publico" ADD CONSTRAINT "votos_publico_ronda_id_fkey" FOREIGN KEY ("ronda_id") REFERENCES "rondas"("ronda_id") ON DELETE RESTRICT ON UPDATE CASCADE;
