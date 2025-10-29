import { Injectable } from '@nestjs/common';
import { EmbeddingService } from '../shared/services/embedding/embedding.service';
import { RetrieveEnvironmentVariablesService } from '../shared/services/retrieve-environment-variables/retrieve-environment-variables.service';
import { PerformanceMonitoringService } from '../shared/services/performance-monitoring/performance-monitoring.service';

export type RouteDecision = {
  category?: string;
  confidence: number;
  allowedTools: string[]; // toolName[]
};

@Injectable()
export class RouterService {
  private centroidCache: Map<string, number[]> = new Map();
  private readonly ruleThreshold: number;
  private readonly embedThreshold: number;

  // Minimal taxonomy for institution-specific intents
  private categories: Record<string, string[]> = {
    SoftwareLicenses: [
      'adobe',
      'creative cloud',
      'photoshop',
      'spss',
      'matlab',
      'arcgis',
      'license',
      'licensed software',
    ],
    MakerSpace: [
      'maker',
      'makerspace',
      '3d print',
      'laser cutter',
      'vinyl cutter',
    ],
    Newspapers: [
      'nyt',
      'new york times',
      'wsj',
      'wall street journal',
      'financial times',
    ],
    Printing: ['print', 'printer', 'printing', 'quota', 'photocopy'],
    AccessBorrowing: [
      'borrow',
      'loan',
      'renew',
      'fine',
      'interlibrary loan',
      'ill',
    ],
  };

  private examples: Record<string, string[]> = {
    SoftwareLicenses: [
      'How do I get Adobe Creative Cloud as a student?',
      'Do we have an SPSS license available?',
      'Where can I access MATLAB on campus?',
      'Is ArcGIS licensed for students?',
    ],
    MakerSpace: [
      'Where is the makerspace located?',
      'Do you offer 3D printing services?',
      'How do I book the laser cutter?',
    ],
    Newspapers: [
      'How can I access the New York Times?',
      'Do we have Wall Street Journal access?',
      'Is Financial Times available through the library?',
    ],
    Printing: [
      'Where can I print on campus?',
      'How much does color printing cost?',
      'How do I check my print quota?',
    ],
    AccessBorrowing: [
      'How long can I borrow books?',
      'How do I renew my loans?',
      'Can I use interlibrary loan?',
    ],
  };

  constructor(
    private readonly embedding: EmbeddingService,
    private readonly env: RetrieveEnvironmentVariablesService,
    private readonly perf: PerformanceMonitoringService,
  ) {
    this.ruleThreshold = Number(
      this.env.retrieve<string>('ROUTER_RULE_THRESHOLD') || '0.85',
    );
    this.embedThreshold = Number(
      this.env.retrieve<string>('ROUTER_EMBED_THRESHOLD') || '0.8',
    );
  }

  private async getCentroid(category: string): Promise<number[]> {
    const cached = this.centroidCache.get(category);
    if (cached) return cached;
    const ex = this.examples[category] || [];
    if (ex.length === 0) return [];
    const vecs = await this.embedding.embed(ex);
    const dim = vecs[0]?.length || 0;
    const centroid = new Array(dim).fill(0);
    for (const v of vecs) {
      for (let i = 0; i < dim; i++) centroid[i] += v[i];
    }
    for (let i = 0; i < dim; i++) centroid[i] /= vecs.length;
    this.centroidCache.set(category, centroid);
    return centroid;
  }

  private cosine(a: number[], b: number[]): number {
    if (!a?.length || !b?.length || a.length !== b.length) return 0;
    let dot = 0,
      na = 0,
      nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    if (na === 0 || nb === 0) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }

  private rulesScore(text: string, category: string): number {
    const tokens = text.toLowerCase();
    const kws = this.categories[category] || [];
    let score = 0;
    for (const kw of kws) if (tokens.includes(kw)) score += 0.25; // simple additive
    return Math.min(1, score);
  }

  async route(userMessage: string): Promise<RouteDecision> {
    // Stage 1: rules
    let bestCat: string | undefined;
    let bestRule = 0;
    for (const cat of Object.keys(this.categories)) {
      const s = this.rulesScore(userMessage, cat);
      if (s > bestRule) {
        bestRule = s;
        bestCat = cat;
      }
    }
    const stopTimer = this.perf.startTimer('router_decision');
    if (bestRule >= this.ruleThreshold) {
      return {
        category: bestCat,
        confidence: bestRule,
        allowedTools: ['RagFaqSearch', 'GoogleSiteSearchTool'],
      };
    }

    // Stage 2: embedding classifier
    const userVec = await this.embedding.embedOne(userMessage);
    let bestEmbed = 0;
    let bestEmbedCat: string | undefined;
    for (const cat of Object.keys(this.categories)) {
      const centroid = await this.getCentroid(cat);
      const sim = this.cosine(userVec, centroid);
      if (sim > bestEmbed) {
        bestEmbed = sim;
        bestEmbedCat = cat;
      }
    }
    if (bestEmbed >= this.embedThreshold) {
      const decision = {
        category: bestEmbedCat,
        confidence: bestEmbed,
        allowedTools: ['RagFaqSearch', 'GoogleSiteSearchTool'],
      };
      try {
        stopTimer();
      } catch {}
      return decision;
    }

    // Fallback: allow all tools (LLM decides)
    const decision = {
      confidence: 0.5,
      allowedTools: [], // empty means "no restriction"
    };
    try {
      stopTimer();
    } catch {}
    return decision;
  }
}
