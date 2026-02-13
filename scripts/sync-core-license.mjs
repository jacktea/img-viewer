#!/usr/bin/env node

import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const mode = process.argv[2] ?? 'copy';
const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const coreRoot = resolve(repoRoot, 'packages/core');

const fileMappings = [
  {
    source: resolve(repoRoot, 'LICENSE'),
    target: resolve(coreRoot, 'LICENSE'),
  },
  {
    source: resolve(repoRoot, 'THIRD_PARTY_NOTICES.md'),
    target: resolve(coreRoot, 'THIRD_PARTY_NOTICES.md'),
  },
];

const sourceLicensesDir = resolve(repoRoot, 'third_party/licenses');
const targetLicensesDir = resolve(coreRoot, 'third_party/licenses');

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function syncCopy() {
  for (const { source, target } of fileMappings) {
    if (!(await exists(source))) {
      throw new Error(`Missing source file: ${source}`);
    }
    await mkdir(dirname(target), { recursive: true });
    await cp(source, target, { force: true });
  }

  if (!(await exists(sourceLicensesDir))) {
    throw new Error(`Missing source directory: ${sourceLicensesDir}`);
  }

  await mkdir(dirname(targetLicensesDir), { recursive: true });
  await cp(sourceLicensesDir, targetLicensesDir, {
    recursive: true,
    force: true,
  });
}

async function syncClean() {
  for (const { target } of fileMappings) {
    await rm(target, { force: true });
  }
  await rm(resolve(coreRoot, 'third_party'), { recursive: true, force: true });
}

if (mode === 'copy') {
  await syncCopy();
} else if (mode === 'clean') {
  await syncClean();
} else {
  throw new Error(`Unknown mode: ${mode}. Use "copy" or "clean".`);
}
