
ALTER TABLE "salas" ADD COLUMN "codigo_pin" TEXT;


UPDATE "salas" SET "codigo_pin" = 'UPSE-' || "sala_id" WHERE "codigo_pin" IS NULL;

ALTER TABLE "salas" ALTER COLUMN "codigo_pin" SET NOT NULL;


ALTER TABLE "salas" ALTER COLUMN "estado" SET DEFAULT 'BORRADOR';


CREATE UNIQUE INDEX "salas_codigo_pin_key" ON "salas"("codigo_pin");
