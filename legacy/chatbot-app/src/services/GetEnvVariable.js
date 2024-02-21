export function getEnvVariable(variableName) {
  const variable = process.env[variableName];
  if (variable === undefined) {
    throw new Error(`Variable ${variableName} is not defined in .env`);
  }
  return variable;
}