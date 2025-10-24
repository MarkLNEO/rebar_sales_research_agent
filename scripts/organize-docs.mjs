#!/usr/bin/env node
/*
  Organize repository documentation and logs.
  - Moves all top-level *.md files (outside docs/) into docs/legacy/<slug>/README.md
  - Moves root *.log into logs/ subfolders by type (prepush, push, dev, misc)
  - Leaves docs/ and @claude_guides untouched
*/
import { promises as fs } from 'fs';
import path from 'path';

const repoRoot = process.cwd();

function slugify(name) {
  return name
    .replace(/\.md$/i, '')
    .replace(/[^a-z0-9]+/gi, '-')</n+    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function moveFile(src, dest) {
  await ensureDir(path.dirname(dest));
  await fs.rename(src, dest);
}

async function fileExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function organizeMarkdown() {
  const dir = await fs.readdir(repoRoot);
  for (const entry of dir) {
    if (!entry.toLowerCase().endsWith('.md')) continue;
    if (entry === 'README.md') continue; // keep root README for convenience
    const abs = path.join(repoRoot, entry);
    const stat = await fs.lstat(abs);
    if (!stat.isFile()) continue;
    // Skip anything already inside docs/
    if (abs.includes(path.sep + 'docs' + path.sep)) continue;
    const slug = slugify(entry);
    const dest = path.join(repoRoot, 'docs', 'legacy', slug, 'README.md');
    console.log(`↪︎ Moving ${entry} -> ${path.relative(repoRoot, dest)}`);
    await moveFile(abs, dest);
  }
}

async function organizeLogs() {
  const dir = await fs.readdir(repoRoot);
  for (const entry of dir) {
    if (!entry.toLowerCase().endsWith('.log')) continue;
    const abs = path.join(repoRoot, entry);
    const stat = await fs.lstat(abs);
    if (!stat.isFile()) continue;
    let folder = 'misc';
    if (entry.includes('prepush')) folder = 'prepush';
    else if (entry.includes('push')) folder = 'push';
    else if (entry.includes('dev')) folder = 'dev';
    const dest = path.join(repoRoot, 'logs', folder, entry);
    console.log(`↪︎ Moving ${entry} -> ${path.relative(repoRoot, dest)}`);
    await moveFile(abs, dest);
  }
}

async function main() {
  await organizeMarkdown();
  await organizeLogs();
  console.log('✅ Organization complete');
}

main().catch((err) => {
  console.error('❌ Failed to organize files', err);
  process.exit(1);
});

