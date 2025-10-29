/*
  Usage:
    npx ts-node src/scripts/evaluate-routing.ts <path-to-json>

  JSON format: Array<{
    query: string;
    expectedCategory?: string; // e.g., 'Newspapers'
  }>
*/

import { readFile } from 'fs/promises';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { EvalRunnerModule } from './eval-runner.module';
import { RouterService } from '../routing/router.service';

async function main() {
  const logger = new Logger('evaluate-routing');
  const file = process.argv[2];
  if (!file) {
    logger.error(
      'Missing input file. Usage: npx ts-node src/scripts/evaluate-routing.ts <path-to-json>',
    );
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(EvalRunnerModule, {
    logger: ['error', 'log', 'warn'],
  });

  try {
    const router = app.get(RouterService);

    const buf = await readFile(file);
    const tests = JSON.parse(buf.toString()) as Array<{
      query: string;
      expectedCategory?: string;
    }>;

    let correct = 0;
    let total = 0;

    logger.log(`Evaluating ${tests.length} routing cases...`);
    for (const t of tests) {
      const decision = await router.route(t.query);
      const ok = t.expectedCategory
        ? (decision.category || '').toLowerCase() ===
          t.expectedCategory.toLowerCase()
        : true;
      total++;
      if (ok) correct++;
      logger.log(
        JSON.stringify(
          {
            query: t.query,
            expected: t.expectedCategory || 'N/A',
            predicted: decision.category || 'N/A',
            confidence: decision.confidence.toFixed(3),
            allowedTools: decision.allowedTools,
          },
          null,
          2,
        ),
      );
    }

    const acc = total ? (correct / total) * 100 : 0;
    logger.log(`Routing accuracy: ${acc.toFixed(1)}% (${correct}/${total})`);
  } catch (e) {
    const msg = e instanceof Error ? `${e.message}\n${e.stack}` : String(e);
    logger.error(`Routing evaluation failed: ${msg}`);
    process.exit(1);
  } finally {
    await app.close();
  }
}

main();
