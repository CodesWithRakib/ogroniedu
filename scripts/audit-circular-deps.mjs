import fs from 'node:fs';
import path from 'node:path';

function findFiles(dir, exts = ['.ts', '.tsx']) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of list) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.next') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findFiles(fullPath, exts));
    } else if (exts.includes(path.extname(entry.name)) && !entry.name.endsWith('.d.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

function resolveImport(sourceFile, importPath, baseDir) {
  if (!importPath.startsWith('.')) return null; // ignore external package imports
  const sourceDir = path.dirname(sourceFile);
  const resolvedBase = path.resolve(sourceDir, importPath);

  const candidates = [
    resolvedBase + '.ts',
    resolvedBase + '.tsx',
    path.join(resolvedBase, 'index.ts'),
    path.join(resolvedBase, 'index.tsx'),
    resolvedBase + '.js',
    path.join(resolvedBase, 'index.js'),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return path.normalize(c);
    }
  }
  return null;
}

function extractImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const importRegex = /(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?from\s+)?['"]([^'"]+)['"]/g;
  const imports = [];
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

function detectCycles(graph) {
  const visited = new Set();
  const recStack = new Set();
  const cycles = [];

  function dfs(node, pathArr) {
    visited.add(node);
    recStack.add(node);
    pathArr.push(node);

    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...pathArr]);
      } else if (recStack.has(neighbor)) {
        const cycleStartIndex = pathArr.indexOf(neighbor);
        const cycle = pathArr.slice(cycleStartIndex).concat(neighbor);
        cycles.push(cycle);
      }
    }

    recStack.delete(node);
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  }

  return cycles;
}

function analyzePackage(name, dir) {
  console.log(`\nAuditing package: ${name} (${dir})...`);
  const files = findFiles(dir);
  console.log(`Total files found: ${files.length}`);

  const graph = new Map();
  for (const file of files) {
    const normalizedFile = path.normalize(file);
    const rawImports = extractImports(file);
    const resolvedDeps = [];
    for (const imp of rawImports) {
      const resolved = resolveImport(file, imp, dir);
      if (resolved && resolved !== normalizedFile) {
        resolvedDeps.push(resolved);
      }
    }
    graph.set(normalizedFile, resolvedDeps);
  }

  const cycles = detectCycles(graph);
  if (cycles.length === 0) {
    console.log(`✅ Zero circular dependencies detected in ${name}`);
  } else {
    console.warn(`⚠️ Found ${cycles.length} cycle(s) in ${name}:`);
    for (let i = 0; i < Math.min(cycles.length, 10); i++) {
      console.warn(`Cycle ${i + 1}:`);
      console.warn(cycles[i].map(f => '  -> ' + path.relative(process.cwd(), f)).join('\n'));
    }
  }
  return cycles;
}

const apiCycles = analyzePackage('@ogroniedu/api', path.resolve('apps/api/src'));
const webCycles = analyzePackage('@ogroniedu/web', path.resolve('apps/web/src'));
const contractsCycles = analyzePackage('@ogroniedu/contracts', path.resolve('packages/contracts/src'));
const dbCycles = analyzePackage('@ogroniedu/database', path.resolve('packages/database/src'));

const totalCycles = apiCycles.length + webCycles.length + contractsCycles.length + dbCycles.length;
console.log(`\n=================================================`);
console.log(`Total circular dependency cycles detected: ${totalCycles}`);
console.log(`=================================================`);
