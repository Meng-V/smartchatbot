type Role = "AIAgent" | "Customer";

class ConversationMemory {
  private curRole: Role;
  private conversation: [Role, string][];
  constructor() {
    this.curRole = "AIAgent";
    this.conversation = [];
    
  }

  addToConversation(role: Role, text: string) {
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

    conversationString += this.curRole === "AIAgent" ? "Customer: " : "AIAgent";

    return conversationString;
  }
}

export { Role, ConversationMemory };
