/*
  Warnings:

  - You are about to drop the column `name` on the `Room` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[codeName]` on the table `Room` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `codeName` to the `Room` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Room_name_key";

-- AlterTable
ALTER TABLE "Room" DROP COLUMN "name",
ADD COLUMN     "codeName" VARCHAR(4) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Room_codeName_key" ON "Room"("codeName");
