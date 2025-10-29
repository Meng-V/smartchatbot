import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { RetrieveEnvironmentVariablesService } from '../retrieve-environment-variables/retrieve-environment-variables.service';

@Injectable()
export class EmbeddingService {
  private readonly openai: OpenAI;
  private readonly defaultModel: string;

  constructor(
    private readonly retrieveEnv: RetrieveEnvironmentVariablesService,
  ) {
    this.openai = new OpenAI({
      organization: this.retrieveEnv.retrieve<string>('OPENAI_ORGANIZATION_ID'),
      apiKey: this.retrieveEnv.retrieve<string>('OPENAI_API_KEY'),
    });
    this.defaultModel =
      this.retrieveEnv.retrieve<string>('RAG_EMBEDDING_MODEL') ||
      'text-embedding-3-small';
  }

  async embed(texts: string[], model?: string): Promise<number[][]> {
    if (!texts || texts.length === 0) return [];
    const res = await this.openai.embeddings.create({
      model: model || this.defaultModel,
      input: texts,
    });
    return res.data.map((d: any) => d.embedding as number[]);
  }

  async embedOne(text: string, model?: string): Promise<number[]> {
    const vectors = await this.embed([text], model);
    return vectors[0];
  }
}
