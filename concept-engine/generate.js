#!/usr/bin/env node
import Anthropic from '@anthropic-ai/sdk';
import { createInterface } from 'readline';
import 'dotenv/config';
import { saveOutput as saveFile } from './output.js';
import { buildConceptPrompt, buildRefinementPrompt, buildVariationsPrompt } from './prompts/concept.js';

let client;

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(r => rl.question(q, r));

function saveOutput(brief, content, { kind = 'concepts', selectedConcept } = {}) {
  const suffix = kind === 'concepts' ? '' : `-${kind}`;
  const selection = selectedConcept ? `Concept source : ${selectedConcept}\n\n` : '';
  const header = `# Concepts — ${brief.product}\n_Généré le ${new Date().toLocaleDateString('fr-FR')}_\n\n`
    + `## Brief d'origine\n\n\`\`\`json\n${JSON.stringify(brief, null, 2)}\n\`\`\`\n\n`
    + selection + '---\n\n';
  return saveFile(brief.product + suffix, header + content);
}

async function streamConcept(prompt) {
  process.stdout.write('\n');
  let full = '';
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
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
  const choose = (number) => {
    if (!/^[1-9]\d*$/.test(number.trim())) return null;
    const headings = [...concepts.matchAll(/^##\s+CONCEPT\s+\[?(\d+)\]?\s*[—–:-].*$/gmi)];
    const matches = headings.map((h, index) => ({ h, index }))
      .filter(({ h }) => Number(h[1]) === Number(number));
    if (matches.length !== 1) return null;
    const { h, index } = matches[0];
    return concepts.slice(h.index, headings[index + 1]?.index ?? concepts.length).trim();
  };
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
      const concept = choose(num);
      if (!concept) { console.error('Concept introuvable ou numéro ambigu : reprends un numéro présent dans le résultat.'); continue; }
      const feedback = await ask('Feedback / direction : ');
      const refined = await streamConcept(buildRefinementPrompt(concept, feedback, brief));
      saveOutput(brief, refined, { kind: 'refined', selectedConcept: num });

    } else if (choice === '2') {
      const num = await ask('Numéro du concept à décliner : ');
      const concept = choose(num);
      if (!concept) { console.error('Concept introuvable ou numéro ambigu : reprends un numéro présent dans le résultat.'); continue; }
      const nb = await ask('Nombre de variations [3] : ');
      const vars = await streamConcept(buildVariationsPrompt(concept, parseInt(nb) || 3, brief));
      saveOutput(brief, vars, { kind: 'variations', selectedConcept: num });

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
