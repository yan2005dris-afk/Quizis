/*
  Warnings:

  - Added the required column `usuario_id` to the `banco_preguntas` table without a default value. This is not possible if the table is not empty.

  Migration strategy:
  1. Add column as nullable
  2. Assign existing banks to the admin user (admin@quizis.com)
  3. Make column NOT NULL
  4. Add FK constraint and index
*/

-- 1. Add column as nullable first
ALTER TABLE "banco_preguntas" ADD COLUMN "usuario_id" INTEGER;

-- 2. Assign existing banks to the admin user
UPDATE "banco_preguntas"
SET "usuario_id" = (SELECT "usuario_id" FROM "usuarios" WHERE "email" = 'admin@quizis.com')
WHERE "usuario_id" IS NULL;

-- 3. Make column NOT NULL
ALTER TABLE "banco_preguntas" ALTER COLUMN "usuario_id" SET NOT NULL;

-- 4. CreateIndex
CREATE INDEX "banco_preguntas_usuario_id_idx" ON "banco_preguntas"("usuario_id");

-- 5. AddForeignKey
ALTER TABLE "banco_preguntas" ADD CONSTRAINT "banco_preguntas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;
