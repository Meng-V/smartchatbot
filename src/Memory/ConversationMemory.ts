type Role = "AIAgent" | "Customer";

class ConversationMemory {
  private curRole: Role;
  private conversation: [Role, string][];
  private maxContextWindow: number | null;

  constructor(maxContextWindow: number | null = null) {
    this.curRole = "AIAgent";
    this.conversation = [];

    this.maxContextWindow = maxContextWindow;
  }

  addToConversation(role: Role, text: string) {
    if (this.maxContextWindow && this.conversation.length >= this.maxContextWindow) {
      this.conversation.shift();
    }
    this.conversation.push([role, text]);
    this.curRole = role;
  }

  getConversationAsString(): string {
    let conversationString = this.conversation.reduce(
      (prevString, curLine) => {
        return prevString + `${curLine[0]}: ${curLine[1]}\n`;
      },
      ""
    );

    // conversationString += this.curRole === "AIAgent" ? "Customer: " : "AIAgent";

    return conversationString;
  }
}

export { Role, ConversationMemory };
