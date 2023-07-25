/*
  Warnings:

  - You are about to drop the column `librarianID` on the `Subject` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Subject" DROP CONSTRAINT "Subject_librarianID_fkey";

-- AlterTable
ALTER TABLE "Subject" DROP COLUMN "librarianID";

-- CreateTable
CREATE TABLE "_LibrarianToSubject" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_LibrarianToSubject_AB_unique" ON "_LibrarianToSubject"("A", "B");

-- CreateIndex
CREATE INDEX "_LibrarianToSubject_B_index" ON "_LibrarianToSubject"("B");

-- AddForeignKey
ALTER TABLE "_LibrarianToSubject" ADD CONSTRAINT "_LibrarianToSubject_A_fkey" FOREIGN KEY ("A") REFERENCES "Librarian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LibrarianToSubject" ADD CONSTRAINT "_LibrarianToSubject_B_fkey" FOREIGN KEY ("B") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
