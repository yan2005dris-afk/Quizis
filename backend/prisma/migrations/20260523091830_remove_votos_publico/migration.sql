/*
  Warnings:

  - You are about to drop the `votos_publico` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "votos_publico" DROP CONSTRAINT "votos_publico_opcion_id_fkey";

-- DropForeignKey
ALTER TABLE "votos_publico" DROP CONSTRAINT "votos_publico_participante_id_fkey";

-- DropForeignKey
ALTER TABLE "votos_publico" DROP CONSTRAINT "votos_publico_pregunta_id_fkey";

-- DropForeignKey
ALTER TABLE "votos_publico" DROP CONSTRAINT "votos_publico_ronda_id_fkey";

-- DropTable
DROP TABLE "votos_publico";
