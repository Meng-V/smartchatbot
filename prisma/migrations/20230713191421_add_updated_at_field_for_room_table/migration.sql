/*
  Warnings:

  - Added the required column `lastUpdated` to the `Room` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "lastUpdated" TIMESTAMP(3) NOT NULL;
