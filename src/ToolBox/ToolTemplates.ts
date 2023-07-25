type ToolInput = Record<string, string | null>;

/**
 * Any class implement this interface has to follow Singleton design pattern
 */
interface Tool {
  name: string;
  description: string;
  parameters: {
    [parameterName: string]: string; //paramter_name: type as string
  };
  toolRun(input: ToolInput): Promise<string>; //Interface for agent to use
}

export {Tool, ToolInput}