import {
  LlmAnswerParserService,
  AgentOutput,
} from './llm-answer-parser.service';

describe('LlmAnswerParserService', () => {
  let service: LlmAnswerParserService;

  beforeEach(() => {
    service = new LlmAnswerParserService();
  });

  it('should parse LLM output with action', () => {
    const llmOutput = `{
      "Thought": "Some thought",
      "Action": "Some action",
      "Action Input": { "key": "value" }
    }`;

    const expectedOutput: AgentOutput = {
      outputType: 'action',
      thought: 'Some thought',
      action: 'Some action',
      actionInput: { key: 'value' },
    };

    expect(service.parseLLMOutput(llmOutput)).toEqual(expectedOutput);
  });

  it('should parse LLM output with final answer', () => {
    const llmOutput = `{
      "Thought": "Some thought",
      "Final Answer": "Some final answer"
    }`;

    const expectedOutput: AgentOutput = {
      outputType: 'final',
      thought: 'Some thought',
      finalAnswer: 'Some final answer',
    };

    expect(service.parseLLMOutput(llmOutput)).toEqual(expectedOutput);
  });

  it('should throw error for invalid LLM output', () => {
    const llmOutput = `{
      "Invalid": "Output"
    }`;

    expect(() => service.parseLLMOutput(llmOutput)).toThrow(
      'Error in parsing LLM output',
    );
  });
});
