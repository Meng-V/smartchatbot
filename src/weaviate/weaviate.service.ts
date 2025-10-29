import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { RetrieveEnvironmentVariablesService } from '../shared/services/retrieve-environment-variables/retrieve-environment-variables.service';

export interface FaqObject {
  id?: string;
  question: string;
  answer: string;
  category?: string;
  tags?: string[];
  institutionId?: string;
  campus?: string;
  sourceUrl?: string;
  updatedAt?: string; // ISO date string
  vector?: number[];
}

export interface WeaviateSearchResultItem extends FaqObject {
  _id?: string;
  _score?: number;
  _distance?: number;
}

@Injectable()
export class WeaviateService {
  private readonly logger = new Logger(WeaviateService.name);
  private readonly http: AxiosInstance;
  private readonly baseUrl: string;
  private readonly className = 'FaqEntry';
  private readonly alphaDefault: number;
  private readonly topKDefault: number;

  constructor(private readonly env: RetrieveEnvironmentVariablesService) {
    let scheme = 'https';
    let host = '';
    let apiKey: string | undefined;
    try {
      scheme = this.env.retrieve<string>('WEAVIATE_SCHEME') || 'https';
    } catch {}
    try {
      host = this.env.retrieve<string>('WEAVIATE_HOST');
    } catch {}
    try {
      apiKey = this.env.retrieve<string>('WEAVIATE_API_KEY');
    } catch {}

    this.baseUrl = host ? `${scheme}://${host}` : '';

    this.http = axios.create({
      baseURL: this.baseUrl || 'http://localhost',
      headers: apiKey
        ? {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          }
        : { 'Content-Type': 'application/json' },
      timeout: 20000,
    });

    try {
      this.alphaDefault = Number(
        this.env.retrieve<string>('RAG_HYBRID_ALPHA') || '0.6',
      );
    } catch {
      this.alphaDefault = 0.6;
    }
    try {
      this.topKDefault = Number(this.env.retrieve<string>('RAG_TOP_K') || '6');
    } catch {
      this.topKDefault = 6;
    }
  }

  private whereToGraphQL(where: any): string {
    const entries: string[] = [];
    for (const key of Object.keys(where)) {
      const val = where[key];
      if (val === undefined) continue;
      const renderedKey = key;
      let renderedVal = '';
      if (renderedKey === 'operator') {
        // GraphQL enum (no quotes)
        renderedVal = String(val);
      } else if (Array.isArray(val)) {
        // operands or arrays
        const arr = val
          .map((v) =>
            typeof v === 'object'
              ? `{ ${this.whereToGraphQL(v)} }`
              : this.valueToGraphQL(v),
          )
          .join(', ');
        renderedVal = `[${arr}]`;
      } else if (typeof val === 'object') {
        renderedVal = `{ ${this.whereToGraphQL(val)} }`;
      } else {
        renderedVal = this.valueToGraphQL(val);
      }
      entries.push(`${renderedKey}: ${renderedVal}`);
    }
    return entries.join(', ');
  }

  private valueToGraphQL(val: any): string {
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    if (Array.isArray(val)) {
      return `[${val.map((v) => this.valueToGraphQL(v)).join(', ')}]`;
    }
    // Paths should be arrays of quoted strings, but this is handled above.
    // valueString and other strings stay quoted
    const escaped = String(val).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `"${escaped}"`;
  }

  async health(): Promise<boolean> {
    if (!this.baseUrl) return false;
    try {
      const res = await this.http.get('/v1/.well-known/ready');
      return res.status === 200;
    } catch (e) {
      this.logger.warn(`Weaviate health check failed: ${String(e)}`);
      return false;
    }
  }

  async ensureSchema(): Promise<void> {
    try {
      const res = await this.http.get('/v1/schema');
      const classes: any[] = res.data?.classes || [];
      const exists = classes.some((c: any) => c.class === this.className);
      if (exists) return;
    } catch {
      // proceed to create if schema fetch fails
      this.logger.log('Schema fetch failed, will try to create class');
    }

    const body = {
      class: this.className,
      vectorizer: 'none',
      properties: [
        { name: 'question', dataType: ['text'] },
        { name: 'answer', dataType: ['text'] },
        { name: 'category', dataType: ['text'] },
        { name: 'tags', dataType: ['text[]'] },
        { name: 'institutionId', dataType: ['text'] },
        { name: 'campus', dataType: ['text'] },
        { name: 'sourceUrl', dataType: ['text'] },
        { name: 'updatedAt', dataType: ['date'] },
      ],
    };

    await this.http.post('/v1/schema/classes', body);
  }

  async batchUpsertFaqs(objects: FaqObject[]): Promise<void> {
    if (!objects || objects.length === 0) return;

    const mapped = objects.map((o) => ({
      class: this.className,
      id: o.id,
      vector: o.vector,
      properties: {
        question: o.question,
        answer: o.answer,
        category: o.category,
        tags: o.tags,
        institutionId: o.institutionId,
        campus: o.campus,
        sourceUrl: o.sourceUrl,
        updatedAt: o.updatedAt,
      },
    }));

    await this.http.post('/v1/batch/objects', { objects: mapped });
  }

  private buildWhereFilter(
    institutionId?: string,
    campus?: string,
    category?: string,
  ): any | undefined {
    const filters: any[] = [];
    if (institutionId) {
      filters.push({
        path: ['institutionId'],
        operator: 'Equal',
        valueString: institutionId,
      });
    }
    if (campus) {
      filters.push({
        path: ['campus'],
        operator: 'Equal',
        valueString: campus,
      });
    }
    if (category) {
      filters.push({
        path: ['category'],
        operator: 'Equal',
        valueString: category,
      });
    }

    if (filters.length === 0) return undefined;
    if (filters.length === 1)
      return { operator: 'And', operands: [filters[0]] };
    return { operator: 'And', operands: filters };
  }

  async hybridSearch(
    query: string,
    options?: {
      topK?: number;
      alpha?: number;
      institutionId?: string;
      campus?: string;
      category?: string;
      vector?: number[]; // optional nearVector for hybrid
      properties?: string[]; // fields for BM25 part
    },
  ): Promise<WeaviateSearchResultItem[]> {
    if (!this.baseUrl) return [];
    const topK = options?.topK ?? this.topKDefault;
    const alpha = options?.alpha ?? this.alphaDefault;
    const whereFilter = this.buildWhereFilter(
      options?.institutionId,
      options?.campus,
      options?.category,
    );

    // Try hybrid with optional vector first
    const vectorPart = options?.vector
      ? `, vector: [${options.vector.join(',')}]`
      : '';
    const wherePart = whereFilter
      ? `, where: ${this.whereToGraphQL(whereFilter)}`
      : '';
    const propertiesPart = options?.properties?.length
      ? `, properties: [${options.properties.map((p) => `"${p}"`).join(', ')}]`
      : '';

    const fields = `question answer category tags institutionId campus sourceUrl updatedAt _additional { id score distance }`;

    const hybridQuery = `{
      Get {
        ${this.className}(hybrid: { query: """${this.escape(query)}""", alpha: ${alpha}${vectorPart}${propertiesPart} }${wherePart}, limit: ${topK}) {
          ${fields}
        }
      }
    }`;

    try {
      const res = await this.http.post('/v1/graphql', { query: hybridQuery });
      const items = res.data?.data?.Get?.[this.className] || [];
      return this.normalizeResults(items);
    } catch (e) {
      this.logger.warn(
        `Hybrid search failed, trying nearVector fallback: ${String(e)}`,
      );
    }

    // Fallback nearVector only if vector is provided
    if (options?.vector) {
      const nearVectorQuery = `{
        Get {
          ${this.className}(nearVector: { vector: [${options.vector.join(',')}] }${wherePart}, limit: ${topK}) {
            ${fields}
          }
        }
      }`;
      try {
        const res = await this.http.post('/v1/graphql', {
          query: nearVectorQuery,
        });
        const items = res.data?.data?.Get?.[this.className] || [];
        if (items.length > 0) {
          return this.normalizeResults(items);
        }
      } catch {}
    }

    // If no vector, try BM25 fallback
    try {
      const bm25Query = `{
        Get {
          ${this.className}(bm25: { query: """${this.escape(query)}"""${propertiesPart} }${wherePart}, limit: ${topK}) {
            ${fields}
          }
        }
      }`;
      const res = await this.http.post('/v1/graphql', { query: bm25Query });
      const items = res.data?.data?.Get?.[this.className] || [];
      return this.normalizeResults(items);
    } catch {}

    return [];
  }

  private normalizeResults(items: any[]): WeaviateSearchResultItem[] {
    return items.map((it: any) => ({
      id: it._additional?.id,
      question: it.question,
      answer: it.answer,
      category: it.category,
      tags: it.tags,
      institutionId: it.institutionId,
      campus: it.campus,
      sourceUrl: it.sourceUrl,
      updatedAt: it.updatedAt,
      _score:
        typeof it._additional?.score === 'number'
          ? it._additional.score
          : undefined,
      _distance:
        typeof it._additional?.distance === 'number'
          ? it._additional.distance
          : undefined,
    }));
  }

  private escape(input: string): string {
    return input.replace(/\\/g, '\\\\').replace(/"""/g, '\\"\\"\\"');
  }
}
