import { Injectable } from '@nestjs/common';
import { LlmTool, LlmToolInput } from '../llm-tool.interface';
import {
  WeaviateService,
  WeaviateSearchResultItem,
} from '../../../weaviate/weaviate.service';
import { EmbeddingService } from '../../../shared/services/embedding/embedding.service';
import { RetrieveEnvironmentVariablesService } from '../../../shared/services/retrieve-environment-variables/retrieve-environment-variables.service';
import { PerformanceMonitoringService } from '../../../shared/services/performance-monitoring/performance-monitoring.service';

@Injectable()
export class RagFaqToolService implements LlmTool {
  public readonly toolName = 'RagFaqSearch';
  public readonly toolDescription: string =
    'Institution-specific FAQ retrieval using the library knowledge base with citations. Use this when users ask about local services, access, software licenses (Adobe, SPSS, MATLAB, ArcGIS), makerspace, printing, or newspaper access (NYT, WSJ).';
  public readonly toolParametersStructure: { [parameterName: string]: string } =
    {
      query: 'string[REQUIRED] the exact question to search',
      institutionId:
        'string[OPTIONAL] institution or tenant identifier to filter',
      campus: 'string[OPTIONAL] campus filter',
      category:
        'string[OPTIONAL] taxonomy category (e.g., SoftwareLicenses, MakerSpace, Newspapers, Printing, AccessBorrowing)',
      topK: 'string[OPTIONAL] number of results to retrieve, default from env',
      minScore:
        'string[OPTIONAL] minimum score threshold to accept results, default from env',
    };

  private readonly defaultTopK: number;
  private readonly defaultMinScore: number;
  private readonly hybridAlpha: number;
  private readonly defaultInstitutionId?: string;
  private readonly defaultCampus?: string;
  private readonly multiQuery: boolean;
  private readonly recencyHalfLifeDays: number;

  constructor(
    private readonly weaviate: WeaviateService,
    private readonly embedding: EmbeddingService,
    private readonly env: RetrieveEnvironmentVariablesService,
    private readonly perf: PerformanceMonitoringService,
  ) {
    this.defaultTopK = Number(this.env.retrieve<string>('RAG_TOP_K') || '6');
    this.defaultMinScore = Number(
      this.env.retrieve<string>('RAG_MIN_SCORE') || '0.70',
    );
    this.hybridAlpha = Number(
      this.env.retrieve<string>('RAG_HYBRID_ALPHA') || '0.6',
    );
    try {
      this.defaultInstitutionId = this.env.retrieve<string>(
        'RAG_DEFAULT_INSTITUTION_ID',
      );
    } catch {}
    try {
      this.defaultCampus = this.env.retrieve<string>('RAG_DEFAULT_CAMPUS');
    } catch {}
    try {
      this.multiQuery =
        (
          this.env.retrieve<string>('RAG_MULTI_QUERY') || 'false'
        ).toLowerCase() === 'true';
    } catch {
      this.multiQuery = false;
    }
    try {
      this.recencyHalfLifeDays = Number(
        this.env.retrieve<string>('RAG_RECENCY_HALFLIFE_DAYS') || '180',
      );
    } catch {
      this.recencyHalfLifeDays = 180;
    }
  }

  private scoreFrom(item: { _score?: number; _distance?: number }): number {
    if (typeof item._score === 'number') return item._score;
    if (typeof item._distance === 'number') {
      const d = item._distance;
      if (!isNaN(d)) return 1 - Math.min(Math.max(d, 0), 1);
    }
    return 0;
  }

  private recencyBoost(updatedAt?: string): number {
    if (!updatedAt) return 0;
    const t = new Date(updatedAt).getTime();
    if (!t || isNaN(t)) return 0;
    const ageDays = (Date.now() - t) / (1000 * 60 * 60 * 24);
    const hl = Math.max(1, this.recencyHalfLifeDays);
    // Exponential decay -> newer = closer to 1.0, but cap small boost
    const freshness = Math.exp(-ageDays / hl);
    return 0.1 * freshness; // up to +0.1
  }

  private tokenMatchBoost(
    text: string,
    tags?: string[],
    category?: string,
  ): number {
    if (!text) return 0;
    const lc = text.toLowerCase();
    let boost = 0;
    if (category && lc.includes(category.toLowerCase())) boost += 0.03;
    if (tags && Array.isArray(tags)) {
      for (const tg of tags) {
        if (tg && lc.includes(String(tg).toLowerCase())) boost += 0.02;
        if (boost >= 0.1) break;
      }
    }
    return Math.min(boost, 0.1);
  }

  private expandQueries(q: string): string[] {
    const base = q.trim();
    const variants: Set<string> = new Set([base]);
    const lower = base.toLowerCase();
    // Lightweight synonym expansions for key verticals
    if (/\bnyt\b|new york times/.test(lower)) {
      variants.add(base.replace(/nyt/gi, 'New York Times'));
      variants.add(base + ' site:nytimes.com');
    }
    if (/\bwsj\b|wall street journal/.test(lower)) {
      variants.add(base.replace(/wsj/gi, 'Wall Street Journal'));
    }
    if (/financial times|\bft\b/.test(lower)) {
      variants.add(base.replace(/\bft\b/gi, 'Financial Times'));
    }
    if (/adobe|creative\s*cloud|photoshop|illustrator/.test(lower)) {
      variants.add(base + ' Adobe Creative Cloud');
    }
    if (/spss|matlab|arcgis/.test(lower)) {
      variants.add(base + ' license access');
    }
    if (/makerspace|3d\s*print|laser\s*cutter|vinyl\s*cutter/.test(lower)) {
      variants.add(base + ' makerspace equipment');
    }
    if (/print(er|ing)|quota/.test(lower)) {
      variants.add(base + ' printing instructions cost');
    }
    return Array.from(variants).slice(0, 4); // keep it modest
  }

  public async toolRunForLlm(llmToolInput: LlmToolInput): Promise<string> {
    const query = (llmToolInput.query || '').toString().trim();
    if (!query) {
      return "Cannot use the tool because parameter 'query' is missing. Ask the customer about this.";
    }

    try {
      const category = llmToolInput.category || undefined;
      const institutionId =
        llmToolInput.institutionId || this.defaultInstitutionId || undefined;
      const campus = llmToolInput.campus || this.defaultCampus || undefined;
      const topK = llmToolInput.topK
        ? Number(llmToolInput.topK)
        : this.defaultTopK;
      const minScore = llmToolInput.minScore
        ? Number(llmToolInput.minScore)
        : this.defaultMinScore;

      const stopTimer = this.perf.startTimer('rag_faq_search', {
        queryLength: query.length,
        category,
      });
      const queries = this.multiQuery ? this.expandQueries(query) : [query];
      const vector = await this.embedding.embedOne(query);

      const allResults: WeaviateSearchResultItem[] = [];
      for (const qv of queries) {
        const partial = await this.weaviate.hybridSearch(qv, {
          topK,
          alpha: this.hybridAlpha,
          category,
          institutionId,
          campus,
          vector,
          properties: ['question', 'answer', 'category', 'tags'],
        });
        allResults.push(...partial);
      }
      // de-duplicate by id/question+answer
      const uniqueMap = new Map<string, WeaviateSearchResultItem>();
      for (const r of allResults) {
        const key = r.id || `${r.question}::${r.answer}`;
        if (!uniqueMap.has(key)) uniqueMap.set(key, r);
      }
      const results = Array.from(uniqueMap.values());
      try {
        const topScore = results.length
          ? Math.max(
              ...results.map(
                (r: WeaviateSearchResultItem) => (r._score as number) || 0,
              ),
            )
          : 0;
        stopTimer();
        this.perf.recordMetric('rag_faq_top_score', 0, true, undefined, {
          topScore,
          results: results.length,
        });
      } catch {}

      if (!results.length) {
        return 'No strong matches found in the institutional knowledge base. Consider asking a clarifying question or using web search.';
      }

      const rescored: WeaviateSearchResultItem[] = results
        .map((r: WeaviateSearchResultItem) => ({
          ...r,
          _score:
            this.scoreFrom(r) +
            this.recencyBoost(r.updatedAt) +
            this.tokenMatchBoost(query, r.tags, r.category),
        }))
        .sort(
          (a: WeaviateSearchResultItem, b: WeaviateSearchResultItem) =>
            (b._score || 0) - (a._score || 0),
        );

      const good: WeaviateSearchResultItem[] = rescored.filter(
        (r: WeaviateSearchResultItem) => (r._score || 0) >= minScore,
      );
      const picked = (good.length ? good : rescored).slice(0, topK);

      const contexts = picked
        .map(
          (r: WeaviateSearchResultItem, idx: number) => `#${idx + 1}
Question: ${r.question}
Answer: ${r.answer}
Source: ${r.sourceUrl || 'N/A'}
Score: ${(r._score || 0).toFixed(3)}
`,
        )
        .join('\n');

      const refSet = new Set<string>();
      for (const r of picked) {
        if (r.sourceUrl) refSet.add(r.sourceUrl);
      }
      const refs = Array.from(refSet);
      const refsBlock =
        refs.length > 0 ? `\nReferences:\n${refs.join('\n')}` : '';

      return `Use the following institutional FAQ contexts to answer the user with citations. If unsure, ask a clarifying question or direct to a real librarian.\n${contexts}${refsBlock}`;
    } catch {
      return 'Institutional knowledge service is temporarily unavailable. Ask a clarifying question or try a targeted site search instead.';
    }
  }
}
