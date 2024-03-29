-- CreateTable
CREATE TABLE "ConversationFeedback" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "userComment" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,

    CONSTRAINT "ConversationFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConversationFeedback_conversationId_key" ON "ConversationFeedback"("conversationId");

-- AddForeignKey
ALTER TABLE "ConversationFeedback" ADD CONSTRAINT "ConversationFeedback_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
