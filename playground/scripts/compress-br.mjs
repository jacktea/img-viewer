#!/usr/bin/env node

import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompress, constants } from 'node:zlib';
import { promisify } from 'node:util';

const compress = promisify(brotliCompress);

const scriptDir = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(scriptDir, '..', 'dist');
const minSize = 1024;

const supportedExt = new Set([
  '.html',
  '.js',
  '.css',
  '.svg',
  '.json',
  '.txt',
  '.xml',
  '.wasm',
  '.map',
]);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function shouldCompress(filePath) {
  if (filePath.endsWith('.br')) return false;
  return supportedExt.has(extname(filePath));
}

async function run() {
  const distStat = await stat(distDir).catch(() => null);
  if (!distStat || !distStat.isDirectory()) {
    throw new Error(`dist directory not found: ${distDir}`);
  }

  const files = await walk(distDir);
  let count = 0;

  for (const filePath of files) {
    if (!shouldCompress(filePath)) continue;

    const source = await readFile(filePath);
    if (source.byteLength < minSize) continue;

    const compressed = await compress(source, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: 11,
      },
    });

    await writeFile(`${filePath}.br`, compressed);
    count += 1;
  }

  console.log(`[compress-br] generated ${count} .br files in ${distDir}`);
}

run().catch((error) => {
  console.error('[compress-br] failed:', error);
  process.exitCode = 1;
});
