import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { saveOutput } from '../concept-engine/output.js';

function sandbox(t) {
  const dir = mkdtempSync(join(tmpdir(), 'cosmic-output-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('two outputs at the exact same time preserve both concepts', t => {
  const dir = sandbox(t);
  const NativeDate = globalThis.Date;
  globalThis.Date = class extends NativeDate {
    constructor(...args) { super(...(args.length ? args : ['2026-10-07T12:00:00.000Z'])); }
  };
  try {
    const first = saveOutput('Marque de recette', 'Première piste', dir);
    const second = saveOutput('Marque de recette', 'Seconde piste', dir);
    assert.notEqual(first, second);
    assert.equal(readFileSync(first, 'utf8'), 'Première piste');
    assert.equal(readFileSync(second, 'utf8'), 'Seconde piste');
    assert.equal(readdirSync(dir).length, 2);
  } finally { globalThis.Date = NativeDate; }
});

test('product punctuation cannot become a path or invalidate the output name', t => {
  const dir = sandbox(t);
  const file = saveOutput('../../Marque / café \0', 'Piste complète', dir);
  assert.equal(dirname(file), dir);
  assert.equal(readFileSync(file, 'utf8'), 'Piste complète');
});

test('an unavailable output directory never returns a save receipt', t => {
  const dir = sandbox(t);
  const blocked = join(dir, 'not-a-directory');
  writeFileSync(blocked, 'existant');
  assert.throws(() => saveOutput('Marque', 'Piste', blocked));
  assert.equal(readFileSync(blocked, 'utf8'), 'existant');
});

test('invalid output content is rejected before any artifact is created', t => {
  const dir = sandbox(t);
  assert.throws(() => saveOutput('Marque', undefined, dir));
  assert.deepEqual(readdirSync(dir), []);
});

test('independent processes cannot replace each other at the same timestamp', async t => {
  const dir = sandbox(t);
  const script = `const { saveOutput } = await import(process.argv[1]);
    const NativeDate = Date;
    globalThis.Date = class extends NativeDate { constructor() { super('2026-10-07T12:00:00.000Z'); } };
    process.stdout.write(saveOutput('Même produit', process.argv[3], process.argv[2]));`;
  const run = promisify(execFile);
  const values = ['Piste A', 'Piste B', 'Piste C'];
  const outputs = await Promise.all(values.map(value => run(process.execPath,
    ['--input-type=module', '-e', script, new URL('../concept-engine/output.js', import.meta.url).href, dir, value])));
  assert.equal(new Set(outputs.map(r => r.stdout)).size, 3);
  assert.deepEqual(outputs.map(r => readFileSync(r.stdout, 'utf8')), values);
});
