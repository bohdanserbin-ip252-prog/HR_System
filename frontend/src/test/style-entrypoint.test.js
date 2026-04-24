import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '..', '..');
const srcRoot = path.join(repoRoot, 'src');
const stylesDir = path.join(srcRoot, 'styles');

function readSource(relativePath) {
  return fs.readFileSync(path.join(srcRoot, relativePath), 'utf8');
}

describe('style entrypoint', () => {
  it('imports every style partial from the global stylesheet', () => {
    const styleCss = readSource('style.css');
    const importedStyles = [...styleCss.matchAll(/@import\s+['"]\.\/styles\/([^'"]+)['"]/g)]
      .map(match => match[1]);
    const styleFiles = fs.readdirSync(stylesDir).filter(file => file.endsWith('.css')).sort();

    expect(importedStyles).toEqual(styleFiles);
  });

  it('keeps page components free of direct style side-effect imports', () => {
    const recruitmentPage = readSource('components/RecruitmentPage.jsx');
    const surveysPage = readSource('components/SurveysPage.jsx');

    expect(recruitmentPage).not.toMatch(/\.\.\/styles\//);
    expect(surveysPage).not.toMatch(/\.\.\/styles\//);
  });
});
