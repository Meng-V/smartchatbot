type LlmModelType = OpenAiModelType | CohereModelType;

enum CohereModelType {
  Generate,
  Embed,
  Summarize,
}

enum OpenAiModelType {
  GPT_3_5_TURBO = 'gpt-3.5-turbo',
  GPT_3_5_TURBO_0613 = 'gpt-3.5-turbo-0613',
  GPT_3_5_TURBO_0301 = 'gpt-3.5-turbo-0301',
  GPT_4 = 'gpt-4',
  GPT_4_0613 = 'gpt-4-0613',
  GPT_4_0314 = 'gpt-4-0314',
}
