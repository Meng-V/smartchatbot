/*
  Warnings:

  - You are about to drop the column `browser` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `operatingSystem` on the `Conversation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Conversation" DROP COLUMN "browser",
DROP COLUMN "operatingSystem",
ADD COLUMN     "userAgent" VARCHAR(100);
