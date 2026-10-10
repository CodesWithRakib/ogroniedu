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
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === '.next') continue;
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
    const target = match[1];
    if (target.startsWith('http://') || target.startsWith('https://') || target.startsWith('mailto:') || target.startsWith('#')) {
      continue;
    }
    const cleanTarget = target.split('#')[0];
    if (cleanTarget) {
      let resolved;
      if (cleanTarget.startsWith('file://')) {
        try {
          resolved = fileURLToPath(cleanTarget);
        } catch {
          resolved = cleanTarget.replace(/^file:\/\/\/?/, '');
        }
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
  'docs/PRODUCT_REQUIREMENTS.md',
  'docs/FEATURE_CATALOG.md',
  'docs/USER_ROLES_AND_PERMISSIONS.md',
  'docs/BUSINESS_RULES.md',
  'docs/SYSTEM_ARCHITECTURE.md',
  'docs/technology-stack.md',
  'docs/technology-compatibility-matrix.md',
  'docs/DATABASE_DESIGN.md',
  'docs/DATA_DICTIONARY.md',
  'docs/API_STANDARDS.md',
  'docs/SECURITY_AND_PRIVACY.md',
  'docs/NOTIFICATION_SYSTEM.md',
  'docs/REALTIME_ARCHITECTURE.md',
  'docs/LOCALIZATION_AND_ACCESSIBILITY.md',
  'docs/TESTING_STRATEGY.md',
  'docs/DEPLOYMENT_AND_OPERATIONS.md',
  'docs/OBSERVABILITY_AND_MONITORING.md',
  'docs/BACKUP_AND_DISASTER_RECOVERY.md',
  'docs/DEFINITION_OF_DONE.md',
  'docs/IMPLEMENTATION_ROADMAP.md',
  'docs/KNOWN_LIMITATIONS.md',
  'docs/audits/documentation-audit.md',
  'docs/audits/architecture-decisions-needed.md',
  'docs/database/schema.sql',
  'prompts/00-master-instructions.md',
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
