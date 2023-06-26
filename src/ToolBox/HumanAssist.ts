import { Tool, ToolInput } from "./ToolTemplates";

class HumanAssist implements Tool {
  private static instance: HumanAssist;

  public name: string = "HumanAssist";
  public description: string =
    "This tool is useful when you need to ask user something: asking for more information, clarification, etc";
  public readonly parameters: { [parameterName: string]: string } = {
    text: "string [things you want to say to human: question or normal sentence]"
  };

  private constructor() {
    HumanAssist.instance = this;
  }

  public static getInstance(): HumanAssist {
    if (!HumanAssist.instance) {
      HumanAssist.instance = new HumanAssist();
    }

    return HumanAssist.instance;
  }

  async run(toolInput: ToolInput): Promise<string> {
    const {text} = toolInput;
    return new Promise<string>(async(resolve, reject) => {
      const response = await HumanAssist.run(text);
      resolve(response)
    }) 
  }

  static async run(text: string): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      resolve(`Put this text exactly in Final Answer "${text}"`);
    })
  }
}

export {HumanAssist}
