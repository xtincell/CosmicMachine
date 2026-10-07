import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server.js';
import { saveOutput } from '../concept-engine/output.js';

async function sandbox(t, { failProvider = false, failSave = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'cosmic-http-'));
  const prompts = [];
  const blocked = join(dir, 'not-a-directory');
  if (failSave) writeFileSync(blocked, 'À conserver');
  const client = { messages: { async *stream(request) {
    prompts.push(request.messages[0].content);
    yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Piste synthétique' } };
    if (failProvider) throw new Error('Fournisseur de recette indisponible');
  } } };
  const app = createApp({ client, save: (product, content) => saveOutput(product, content, failSave ? blocked : dir) });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    rmSync(dir, { recursive: true, force: true });
  });
  async function post(route, body) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${route}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/event-stream/);
    return (await response.text()).split('\n').filter(line => line.startsWith('data: ')).map(line => JSON.parse(line.slice(6)));
  }
  return { dir, prompts, post };
}

test('real HTTP generation/refinement/variations acknowledge existing distinct artifacts', async t => {
  const s = await sandbox(t);
  const requests = [
    ['/api/generate', { product: 'Recette', message: 'Partage', target: 'Familles' }],
    ['/api/generate', { product: 'Recette', message: 'Partage', target: 'Familles' }],
    ['/api/refine', { product: 'Recette', concept: 'Concept retenu exact', feedback: 'Plus sobre' }],
    ['/api/variations', { product: 'Recette', concept: 'Concept retenu exact', nbVariations: 2 }],
  ];
  const events = await Promise.all(requests.map(([route, body]) => s.post(route, body)));
  const files = events.map(stream => {
    assert.deepEqual(stream.filter(e => e.text).map(e => e.text), ['Piste synthétique']);
    assert.equal(stream.filter(e => e.done).length, 1);
    assert.equal(stream.filter(e => e.error).length, 0);
    const file = stream.find(e => e.done).file;
    assert.equal(readFileSync(file, 'utf8'), 'Piste synthétique');
    return file;
  });
  assert.equal(new Set(files).size, 4);
  assert.equal(readdirSync(s.dir).length, 4);
  assert.ok(s.prompts.some(prompt => prompt.includes('Concept retenu exact') && prompt.includes('Plus sobre')));
  assert.ok(s.prompts.some(prompt => prompt.includes('Concept retenu exact') && prompt.includes('Génère 2 variations')));
});

test('real HTTP save failure emits an error and never completion', async t => {
  const s = await sandbox(t, { failSave: true });
  const events = await s.post('/api/generate', { product: 'Recette' });
  assert.equal(events.filter(e => e.done).length, 0);
  assert.equal(events.filter(e => e.error).length, 1);
  assert.equal(readFileSync(join(s.dir, 'not-a-directory'), 'utf8'), 'À conserver');
});

test('real HTTP provider failure retains partial transport without a save receipt', async t => {
  const s = await sandbox(t, { failProvider: true });
  const events = await s.post('/api/generate', { product: 'Recette' });
  assert.equal(events[0].text, 'Piste synthétique');
  assert.equal(events.filter(e => e.done).length, 0);
  assert.match(events.find(e => e.error).error, /indisponible/);
  assert.deepEqual(readdirSync(s.dir), []);
});
