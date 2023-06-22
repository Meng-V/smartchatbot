/**
 * Any class implement this interface has to follow Singleton design pattern
 */
interface Tool {
  name: string;
  description: string;
  parameters: {
    [parameterName: string]: string; //paramter_name: type as string
  };
  run: (...args: any[]) => Promise<string>;
}

export {Tool}