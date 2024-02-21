type ModelName =
  | 'gpt-3.5-turbo'
  | 'gpt-3.5-turbo-0613'
  | 'gpt-3.5-turbo-0301'
  | 'gpt-4-0613'
  | 'gpt-4-0314'
  | 'gpt-4';

type ModelTokenUsage = {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
};

type TokenUsage = Partial<Record<ModelName, ModelTokenUsage>>;
