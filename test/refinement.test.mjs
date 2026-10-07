import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { saveOutput as saveFile } from '../concept-engine/output.js';
import { buildRefinementPrompt, buildVariationsPrompt } from '../concept-engine/prompts/concept.js';

const source = readFileSync(new URL('../concept-engine/generate.js', import.meta.url), 'utf8');
const exactPostActions = source.slice(source.indexOf('async function postActions('), source.indexOf('async function main('));
const concepts = '## CONCEPT 1 — MATIN\n\nPremier insight.\n\n---\n\n## CONCEPT 2 — SOIR\n\nDeuxième insight précis.\n\n---';
const brief = { product: 'Marque de recette', target: 'Familles', message: 'Partage', constraints: 'Sans comparaison', tone: 'Chaleureux', formats: 'OOH' };

async function run(answers, input = concepts) {
  const prompts = [], saved = [], errors = [];
  const context = vm.createContext({
    ask: async () => { assert.ok(answers.length, 'unexpected question'); return answers.shift(); },
    streamConcept: async prompt => { prompts.push(prompt); return 'Résultat synthétique'; },
    saveOutput: (b, c) => { saved.push({ brief: b, content: c }); return 'fixture.md'; },
    buildRefinementPrompt, buildVariationsPrompt,
    console: { log() {}, error: text => errors.push(text) },
  });
  // Executes the production function verbatim; only terminal/provider/disk are fixtures.
  vm.runInContext(exactPostActions + '\nthis.postActions = postActions;', context);
  await context.postActions(input, brief);
  return { prompts, saved, errors };
}

test('CLI refinement receives the selected actual concept and original brief', async () => {
  const r = await run(['1', '2', 'Plus sobre', 'q']);
  assert.equal(r.prompts.length, 1);
  assert.match(r.prompts[0], /Deuxième insight précis/);
  assert.doesNotMatch(r.prompts[0], /Premier insight/);
  assert.match(r.prompts[0], /Sans comparaison/);
  assert.match(r.prompts[0], /Plus sobre/);
  assert.equal(r.saved[0].brief.constraints, brief.constraints);
});

test('CLI variations receive the selected concept and retain the brief', async () => {
  const r = await run(['2', '1', '2', 'q']);
  assert.match(r.prompts[0], /Premier insight/);
  assert.doesNotMatch(r.prompts[0], /Deuxième insight/);
  assert.match(r.prompts[0], /Sans comparaison/);
  assert.match(r.prompts[0], /Génère 2 variations/);
  assert.equal(r.saved[0].brief.target, brief.target);
});

test('an unknown concept never starts a provider request', async () => {
  const r = await run(['1', '99', 'feedback', 'q']);
  assert.equal(r.prompts.length, 0);
  assert.equal(r.saved.length, 0);
  assert.equal(r.errors.length, 1);
});

test('bracketed concept numbers from the prescribed format remain selectable', async () => {
  const r = await run(['1', '2', 'Retour', 'q'], concepts.replace('CONCEPT 2', 'CONCEPT [2]'));
  assert.match(r.prompts[0], /Deuxième insight/);
  assert.equal(r.saved[0].brief.product, brief.product);
});

test('ambiguous duplicate numbering never starts a provider request', async () => {
  const r = await run(['2', '1', 'q'], concepts.replace('CONCEPT 2', 'CONCEPT 1'));
  assert.equal(r.prompts.length, 0);
  assert.equal(r.saved.length, 0);
  assert.equal(r.errors.length, 1);
});

test('CLI artifact retains the actual brief and source selection in readable Markdown', t => {
  const dir = mkdtempSync(join(tmpdir(), 'cosmic-cli-artifact-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const exactSave = source.slice(source.indexOf('function saveOutput('), source.indexOf('async function streamConcept('));
  const context = vm.createContext({ saveFile: (product, content) => saveFile(product, content, dir) });
  vm.runInContext(exactSave + '\nthis.save = saveOutput;', context);
  const file = context.save(brief, 'Piste affinée synthétique', { kind: 'refined', selectedConcept: '2' });
  const markdown = readFileSync(file, 'utf8');
  const encodedBrief = markdown.match(/```json\n([\s\S]*?)\n```/);
  assert.ok(encodedBrief);
  assert.deepEqual(JSON.parse(encodedBrief[1]), brief);
  assert.match(markdown, /Concept source : 2/);
  assert.match(markdown, /Piste affinée synthétique/);
});

test('real CLI without a key exits before asking or contacting a provider', () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../concept-engine/generate.js', import.meta.url))], {
    encoding: 'utf8', input: '', env: { ...process.env, ANTHROPIC_API_KEY: '' }, timeout: 5000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /ANTHROPIC_API_KEY manquant/);
  assert.doesNotMatch(result.stdout, /Produit \/ Service/);
});
