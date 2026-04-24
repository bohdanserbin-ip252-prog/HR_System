#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TARGET_DIRS = ['backend/src', 'frontend/src'];
const ALLOWED_EXTENSIONS = new Set(['.rs', '.js', '.jsx', '.css']);
const MAX_LINES = 250;

function walk(dirPath, output = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, output);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const extension = path.extname(entry.name);
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      continue;
    }

    output.push(fullPath);
  }

  return output;
}

function countLines(content) {
  if (content.length === 0) {
    return 0;
  }

  let lines = content.split(/\r?\n/).length;
  if (content.endsWith('\n')) {
    lines -= 1;
  }

  return lines;
}

function formatRelative(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join('/');
}

const sourceFiles = TARGET_DIRS.flatMap(dir => {
  const absoluteDir = path.join(ROOT, dir);
  if (!fs.existsSync(absoluteDir)) {
    return [];
  }
  return walk(absoluteDir);
});

const offenders = sourceFiles
  .map(filePath => {
    const content = fs.readFileSync(filePath, 'utf8');
    return {
      filePath,
      relativePath: formatRelative(filePath),
      lines: countLines(content),
    };
  })
  .filter(item => item.lines > MAX_LINES)
  .sort((a, b) => b.lines - a.lines || a.relativePath.localeCompare(b.relativePath));

if (offenders.length === 0) {
  console.log(`check:max-lines OK - no source files exceed ${MAX_LINES} lines.`);
  process.exit(0);
}

console.error(`check:max-lines FAILED - ${offenders.length} file(s) exceed ${MAX_LINES} lines:`);
for (const offender of offenders) {
  console.error(`- ${offender.relativePath}: ${offender.lines}`);
}
process.exit(1);
