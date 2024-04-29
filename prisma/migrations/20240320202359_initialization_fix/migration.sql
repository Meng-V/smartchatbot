/*
  Warnings:

  - You are about to drop the column `lastUpdated` on the `Room` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Room` table. All the data in the column will be lost.
  - Added the required column `name` to the `Building` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Building" ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Room" DROP COLUMN "lastUpdated",
DROP COLUMN "type";
