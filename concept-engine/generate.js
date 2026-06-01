#!/usr/bin/env node
import Anthropic from '@anthropic-ai/sdk';
import { createInterface } from 'readline';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { buildConceptPrompt, buildRefinementPrompt, buildVariationsPrompt } from './prompts/concept.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(r => rl.question(q, r));

function saveOutput(brief, content) {
  const dir = join(__dirname, 'outputs');
  mkdirSync(dir, { recursive: true });
  const ts = new Date().toISOString().slice(0, 16).replace(':', 'h');
  const slug = brief.product.toLowerCase().replace(/\s+/g, '-').slice(0, 20);
  const file = join(dir, `${ts}_${slug}.md`);
  const header = `# Concepts — ${brief.product}\n_Généré le ${new Date().toLocaleDateString('fr-FR')}_\n\n---\n\n`;
  writeFileSync(file, header + content);
  return file;
}

async function streamConcept(prompt) {
  process.stdout.write('\n');
  let full = '';
  const stream = await client.messages.stream({
    model: 'claude-opus-4-8',
    max_tokens: 4096,
    system: 'Tu es un directeur de création publicitaire de niveau mondial. Tu génères des concepts percutants, originaux et stratégiquement solides.',
    messages: [{ role: 'user', content: prompt }],
  });

  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      process.stdout.write(chunk.delta.text);
      full += chunk.delta.text;
    }
  }
  process.stdout.write('\n');
  return full;
}

async function collectBrief() {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║     COSMICMACHINE — CONCEPT ENGINE   ║');
  console.log('╚══════════════════════════════════════╝\n');

  const brief = {};
  brief.product = await ask('Produit / Service : ');
  brief.target = await ask('Cible (qui ?) : ');
  brief.message = await ask('Message clé (quoi dire ?) : ');
  brief.tone = await ask('Ton (ex: premium, humour, émotion — laisser vide pour libre) : ');
  brief.formats = await ask('Formats cibles (ex: Instagram, OOH, TV — laisser vide) : ');
  brief.constraints = await ask('Contraintes (ex: pas de comparaison, logo visible — laisser vide) : ');

  const nb = await ask('Nombre de concepts à générer [3] : ');
  brief.nbConcepts = parseInt(nb) || 3;

  return brief;
}

async function postActions(concepts, brief) {
  while (true) {
    console.log('\n──────────────────────────────────────');
    console.log('Que faire ensuite ?');
    console.log('  [1] Affiner un concept avec feedback');
    console.log('  [2] Générer des variations');
    console.log('  [3] Nouveau brief');
    console.log('  [q] Quitter');
    const choice = await ask('\nChoix : ');

    if (choice === 'q' || choice === '') break;

    if (choice === '1') {
      const num = await ask('Numéro du concept à affiner : ');
      const feedback = await ask('Feedback / direction : ');
      const refined = await streamConcept(buildRefinementPrompt(`Concept ${num} du brief précédent`, feedback));
      saveOutput({ product: `${brief.product}-refined` }, refined);

    } else if (choice === '2') {
      const num = await ask('Numéro du concept à décliner : ');
      const nb = await ask('Nombre de variations [3] : ');
      const vars = await streamConcept(buildVariationsPrompt(`Concept ${num} du brief précédent`, parseInt(nb) || 3));
      saveOutput({ product: `${brief.product}-variations` }, vars);

    } else if (choice === '3') {
      break;
    }
  }
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌  ANTHROPIC_API_KEY manquant. Copie .env.example en .env et renseigne ta clé.');
    process.exit(1);
  }

  while (true) {
    const brief = await collectBrief();
    const prompt = buildConceptPrompt(brief);

    console.log('\n⚡ Génération en cours...');
    const concepts = await streamConcept(prompt);
    const file = saveOutput(brief, concepts);
    console.log(`\n✅ Sauvegardé → ${file}`);

    await postActions(concepts, brief);

    const again = await ask('\nNouveau brief ? [o/N] : ');
    if (again.toLowerCase() !== 'o') break;
  }

  rl.close();
  console.log('\n👋 COSMICMACHINE hors ligne.\n');
}

main().catch(e => { console.error(e); process.exit(1); });
