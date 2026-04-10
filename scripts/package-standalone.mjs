#!/usr/bin/env node
// Build an offline-install zip of defect-gatherer + requirements-gatherer plugins.
// Output: dist/defect-and-requirements-tools-vYYYY-MM-DD.zip
//
// Usage: node scripts/package-standalone.mjs
//
// Cross-platform: uses `zip` when available, otherwise falls back to PowerShell's
// Compress-Archive on Windows. No npm dependencies. All external commands are
// invoked via execFileSync with argv arrays (no shell) so paths with spaces or
// special characters are safe.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
process.chdir(REPO_ROOT);

const EXCLUDE_NAMES = new Set(['.agent-progress', 'node_modules', '.DS_Store']);
const EXCLUDE_EXT = ['.log'];

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function hasCommand(cmd) {
  try {
    const finder = process.platform === 'win32' ? 'where' : 'which';
    execFileSync(finder, [cmd], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function copyFiltered(src, dest) {
  cpSync(src, dest, {
    recursive: true,
    filter: (srcPath) => {
      const base = srcPath.split(/[\\/]/).pop();
      if (EXCLUDE_NAMES.has(base)) return false;
      if (EXCLUDE_EXT.some((ext) => base.endsWith(ext))) return false;
      return true;
    },
  });
}

function renderTemplate(templatePath, outputPath, substitutions) {
  let content = readFileSync(templatePath, 'utf8');
  for (const [key, value] of Object.entries(substitutions)) {
    content = content.replaceAll(`{{${key}}}`, value);
  }
  writeFileSync(outputPath, content);
}

function createZip(stagingDir, outputPath) {
  const absOutput = resolve(outputPath);
  if (hasCommand('zip')) {
    execFileSync('zip', ['-r', absOutput, '.'], { cwd: stagingDir, stdio: 'ignore' });
    return;
  }
  if (process.platform === 'win32') {
    const psArgs = [
      '-NoProfile',
      '-Command',
      'Compress-Archive',
      '-Path',
      join(resolve(stagingDir), '*'),
      '-DestinationPath',
      absOutput,
      '-Force',
    ];
    execFileSync('powershell', psArgs, { stdio: 'ignore' });
    return;
  }
  throw new Error('Neither `zip` nor PowerShell Compress-Archive is available. Install `zip` and re-run.');
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
}

const defectPkg = readJson('plugins/defect-gatherer/.claude-plugin/plugin.json');
const reqPkg = readJson('plugins/requirements-gatherer/.claude-plugin/plugin.json');

const VERSION_DEFECT_GATHERER = defectPkg.version;
const VERSION_REQUIREMENTS_GATHERER = reqPkg.version;

if (!VERSION_DEFECT_GATHERER || !VERSION_REQUIREMENTS_GATHERER) {
  console.error('ERROR: could not read plugin versions from plugin.json files.');
  process.exit(1);
}

const date = new Date().toISOString().slice(0, 10);
const outputName = `defect-and-requirements-tools-v${date}.zip`;
const outputPath = join('dist', outputName);
const staging = join('dist', '.staging');

console.log('Packaging standalone zip...');
console.log(`  defect-gatherer:        ${VERSION_DEFECT_GATHERER}`);
console.log(`  requirements-gatherer:  ${VERSION_REQUIREMENTS_GATHERER}`);
console.log(`  output:                 ${outputPath}`);

if (existsSync(staging)) rmSync(staging, { recursive: true, force: true });
if (existsSync(outputPath)) rmSync(outputPath, { force: true });
mkdirSync(staging, { recursive: true });
mkdirSync('dist', { recursive: true });

copyFiltered('plugins/defect-gatherer', join(staging, 'defect-gatherer'));
copyFiltered('plugins/requirements-gatherer', join(staging, 'requirements-gatherer'));

const subs = {
  VERSION_DEFECT_GATHERER,
  VERSION_REQUIREMENTS_GATHERER,
};
renderTemplate('scripts/standalone-templates/INSTALL.md', join(staging, 'INSTALL.md'), subs);
renderTemplate('scripts/standalone-templates/USAGE.md', join(staging, 'USAGE.md'), subs);

createZip(staging, outputPath);

rmSync(staging, { recursive: true, force: true });

const size = formatSize(statSync(outputPath).size);
console.log('');
console.log('Done.');
console.log(`  ${outputPath} (${size})`);
