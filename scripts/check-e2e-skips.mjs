#!/usr/bin/env node
/**
 * E2E skip gate (Phase 24 WS6.2).
 *
 * Journey specs that need seeded accounts call `test.skip(!ready, ...)` when
 * their `E2E_*` credentials are absent, and a skipped journey is not a passing
 * journey. CI runs Playwright with the `json` reporter (see
 * apps/web/playwright.config.ts); this gate reads that report and fails when
 * any test was skipped, so the E2E job cannot go green while seeded journeys
 * silently opt out.
 *
 * Usage: node scripts/check-e2e-skips.mjs [path/to/e2e-results.json]
 * Default report: apps/web/test-results/e2e-results.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reportPath = path.resolve(root, process.argv[2] ?? 'apps/web/test-results/e2e-results.json');

function fail(message) {
  console.error(`[e2e-skip-gate] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(reportPath)) {
  fail(`Playwright JSON report not found at ${reportPath}; run the E2E suite first.`);
}

let report;
try {
  report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
} catch (error) {
  fail(`Could not parse ${reportPath}: ${error.message}`);
}

/** Depth-first walk of the suite tree, collecting every test with its title. */
function collectTests(suite, parentTitles = []) {
  const titles = suite.title ? [...parentTitles, suite.title] : parentTitles;
  const tests = [];
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      tests.push({ title: [...titles, spec.title].join(' › '), status: test.status });
    }
  }
  for (const child of suite.suites ?? []) {
    tests.push(...collectTests(child, titles));
  }
  return tests;
}

const tests = (report.suites ?? []).flatMap((suite) => collectTests(suite));
const skipped = tests.filter((test) => test.status === 'skipped');

if (skipped.length > 0) {
  console.error(`[e2e-skip-gate] ${skipped.length} of ${tests.length} test(s) skipped:`);
  for (const test of skipped) console.error(`  - ${test.title}`);
  console.error(
    'Seeded journeys must actually execute in CI; check the E2E_STUDENT_*, E2E_TUTOR_* and E2E_ADMIN_* secrets.',
  );
  process.exit(1);
}

console.log(`[e2e-skip-gate] OK: ${tests.length} test(s) executed, 0 skipped.`);
