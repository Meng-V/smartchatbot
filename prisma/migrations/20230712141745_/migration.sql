/*
  Warnings:

  - A unique constraint covering the columns `[uuid]` on the table `Librarian` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Librarian_uuid_key" ON "Librarian"("uuid");
