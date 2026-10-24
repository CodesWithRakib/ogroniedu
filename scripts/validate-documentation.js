#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const errors = [];

function getFiles(dir, extensions) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === '.next' || file === '.agents') continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(fullPath, extensions));
    } else {
      const ext = path.extname(file);
      if (extensions.includes(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

const docsFiles = getFiles(root, ['.md', '.mmd', '.sql']);

for (const filePath of docsFiles) {
  const text = fs.readFileSync(filePath, 'utf-8');
  const relPath = path.relative(root, filePath);

  if (text.trim().length < 30) {
    errors.push(`Too little content: ${relPath}`);
  }

  // Link check regex supporting nested parentheses (e.g. Next.js route groups like (public), (dashboard), (admin))
  const linkRegex = /\]\(((?:[^()]+|\([^()]*\))+)\)/g;
  let match;
  while ((match = linkRegex.exec(text)) !== null) {
    // CommonMark allows wrapping a destination in angle brackets; Prettier
    // emits that form when the target itself contains parentheses (e.g.
    // Next.js route-group paths). Unwrap before resolving.
    let target = match[1].trim();
    if (target.length > 2 && target.startsWith('<') && target.endsWith('>')) {
      target = target.slice(1, -1);
    }
    if (target.startsWith('http://') || target.startsWith('https://') || target.startsWith('mailto:') || target.startsWith('#')) {
      continue;
    }
    const cleanTarget = target.split('#')[0];
    if (cleanTarget) {
      let resolved;
      if (cleanTarget.startsWith('file://')) {
        const normalized = cleanTarget.replace(/\\/g, '/');
        const repoName = path.basename(root).toLowerCase();
        const marker = `/${repoName}/`;
        const markerIdx = normalized.toLowerCase().indexOf(marker);
        if (markerIdx !== -1) {
          const relativeWithinRepo = normalized.slice(markerIdx + marker.length);
          resolved = path.resolve(root, relativeWithinRepo);
        } else {
          try {
            resolved = fileURLToPath(cleanTarget);
          } catch {
            resolved = cleanTarget.replace(/^file:\/\/\/?/, '');
          }
        }
      } else if (cleanTarget.startsWith('/')) {
        const fromRoot = path.resolve(root, cleanTarget.slice(1));
        resolved = fs.existsSync(fromRoot) ? fromRoot : cleanTarget;
      } else {
        resolved = path.resolve(path.dirname(filePath), cleanTarget);
      }
      if (!fs.existsSync(resolved)) {
        errors.push(`Broken link in ${relPath}: -> ${target}`);
      }
    }
  }
}

const requiredDocuments = [
  'README.md',
  'docs/production-modernization/README.md',
  'docs/production-modernization/00-CURRENT-STATE.md',
  'docs/production-modernization/01-SCOPE-AND-MVP-REQUIREMENTS.md',
  'docs/production-modernization/02-ARCHITECTURE-AND-DEPENDENCIES.md',
  'docs/production-modernization/03-ROUTE-AND-PAGE-INVENTORY.md',
  'docs/production-modernization/04-API-AND-BACKEND-INVENTORY.md',
  'docs/production-modernization/05-FEATURE-AND-ROLE-MATRIX.md',
  'docs/production-modernization/06-DATABASE-AND-DATA-INTEGRITY.md',
  'docs/production-modernization/07-SECURITY-AUDIT.md',
  'docs/production-modernization/08-ARCHITECTURE-REFACTOR-REGISTER.md',
  'docs/production-modernization/09-DEPRECATED-AND-DEPENDENCY-REGISTER.md',
  'docs/production-modernization/10-TESTING-AND-BROWSER-AUTOMATION.md',
  'docs/production-modernization/11-MASTER-TASK-REGISTER.md',
  'docs/production-modernization/12-PHASE-EXECUTION-PLAN.md',
  'docs/production-modernization/13-SEVEN-DAY-EXECUTION-SCHEDULE.md',
  'docs/production-modernization/14-RELEASE-READINESS-CHECKLIST.md',
  'docs/production-modernization/15-DECISION-AND-BLOCKER-LOG.md',
];

for (const req of requiredDocuments) {
  if (!fs.existsSync(path.resolve(root, req))) {
    errors.push(`Missing mandatory document: ${req}`);
  }
}

if (errors.length > 0) {
  console.error('\nDocumentation Validation FAILED:');
  console.error(errors.join('\n'));
  process.exit(1);
} else {
  console.log(`\nDocumentation Validation PASSED: Successfully verified ${docsFiles.length} Markdown, Mermaid, and SQL files.`);
  console.log(`All ${requiredDocuments.length} mandatory canonical documents exist and are valid.\n`);
  process.exit(0);
}
