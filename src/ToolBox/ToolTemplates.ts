interface Tool {
  name: string;
  description: string;
  parameters: {
    [parameterName: string]: string; //paramter_name: type as string
  };
  run: (...args: string[]) => Promise<string>;
}

export {Tool}