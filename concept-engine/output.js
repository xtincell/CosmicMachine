import { openSync, writeFileSync, fsyncSync, closeSync, mkdirSync, rmSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const outputs = join(dirname(fileURLToPath(import.meta.url)), 'outputs');

// Shared by CLI and HTTP. Existing artifacts are never opened for replacement.
export function saveOutput(product, content, directory = outputs) {
  if (typeof product !== 'string' || !product.trim()) throw new TypeError('Produit manquant.');
  if (typeof content !== 'string') throw new TypeError('Résultat texte manquant.');
  const slug = product.normalize('NFKD').replace(/\p{M}/gu, '')
    .toLowerCase().replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'concept';
  const ts = new Date().toISOString().replace(/:/g, '-');
  mkdirSync(directory, { recursive: true });
  const file = join(directory, `${ts}_${slug}_${randomUUID()}.md`);
  const descriptor = openSync(file, 'wx');
  let complete = false;
  try {
    writeFileSync(descriptor, content, 'utf8');
    fsyncSync(descriptor);
    complete = true;
  } finally {
    try { closeSync(descriptor); }
    finally { if (!complete) rmSync(file, { force: true }); }
  }
  return file;
}
