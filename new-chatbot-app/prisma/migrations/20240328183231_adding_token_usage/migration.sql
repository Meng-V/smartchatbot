/*
  Warnings:

  - You are about to drop the column `completionTokens` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `promptTokens` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `totalTokens` on the `Conversation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Conversation" DROP COLUMN "completionTokens",
DROP COLUMN "promptTokens",
DROP COLUMN "totalTokens";

-- CreateTable
CREATE TABLE "ModelTokenUsage" (
    "id" TEXT NOT NULL,
    "llmModelName" TEXT NOT NULL,
    "completionTokens" INTEGER NOT NULL,
    "promptTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "conversationId" TEXT NOT NULL,

    CONSTRAINT "ModelTokenUsage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ModelTokenUsage" ADD CONSTRAINT "ModelTokenUsage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
