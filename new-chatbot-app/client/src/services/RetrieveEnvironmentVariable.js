export function retrieveEnvironmentVariable(variableName) {
    const variable = import.meta.env[variableName];
    if (variable === undefined) {
      throw new Error(`Variable ${variableName} is not defined in .env`);
    }
    return variable;
  }