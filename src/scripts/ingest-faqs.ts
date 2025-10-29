/*
  Usage:
    npx ts-node src/scripts/ingest-faqs.ts <path-to-json>

  JSON format: Array<{
    question: string;
    answer: string;
    category?: string;
    tags?: string[];
    institutionId?: string;
    campus?: string;
    sourceUrl?: string;
    updatedAt?: string;
  }>
*/

import { readFile } from 'fs/promises';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { IngestionRunnerModule } from './ingestion-runner.module';
import { WeaviateService, FaqObject } from '../weaviate/weaviate.service';
import { EmbeddingService } from '../shared/services/embedding/embedding.service';

async function main() {
  const logger = new Logger('ingest-faqs');
  const file = process.argv[2];
  if (!file) {
    console.error(
      'Missing input file. Usage: npx ts-node src/scripts/ingest-faqs.ts <path-to-json>',
    );
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(
    IngestionRunnerModule,
    {
      logger: ['error', 'log', 'warn'],
    },
  );

  try {
    const weaviate = app.get(WeaviateService);
    const embedding = app.get(EmbeddingService);

    const buf = await readFile(file);
    const rows = JSON.parse(buf.toString()) as Omit<FaqObject, 'vector'>[];

    logger.log(`Loaded ${rows.length} FAQ items from ${file}`);

    await weaviate.ensureSchema();

    const chunkSize = 100;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const texts = chunk.map((r) => `${r.question}\n\n${r.answer}`);
      const vectors = await embedding.embed(texts);

      const objects: FaqObject[] = chunk.map((r, idx) => ({
        ...r,
        updatedAt: r.updatedAt || new Date().toISOString(),
        vector: vectors[idx],
      }));

      await weaviate.batchUpsertFaqs(objects);
      logger.log(`Upserted ${i + objects.length}/${rows.length} items`);
    }

    logger.log('Ingestion complete.');
  } catch (e) {
    console.error('Ingestion failed:', e);
    process.exit(1);
  } finally {
    await app.close();
  }
}

main();
