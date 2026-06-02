import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { buildConceptPrompt, buildRefinementPrompt, buildVariationsPrompt } from './concept-engine/prompts/concept.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(express.json());
app.use(express.static(join(__dirname, 'gui')));

function saveOutput(product, content) {
  const dir = join(__dirname, 'concept-engine/outputs');
  mkdirSync(dir, { recursive: true });
  const ts = new Date().toISOString().slice(0, 16).replace(':', 'h');
  const slug = product.toLowerCase().replace(/\s+/g, '-').slice(0, 20);
  const file = join(dir, `${ts}_${slug}.md`);
  writeFileSync(file, content);
  return file;
}

async function streamToSSE(res, prompt, product) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let full = '';
  try {
    const stream = await client.messages.stream({
      model: 'claude-opus-4-8',
      max_tokens: 4096,
      system: 'Tu es un directeur de création publicitaire de niveau mondial. Tu génères des concepts percutants, originaux et stratégiquement solides.',
      messages: [{ role: 'user', content: prompt }],
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        full += chunk.delta.text;
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
      }
    }

    const file = saveOutput(product, full);
    res.write(`data: ${JSON.stringify({ done: true, file })}\n\n`);
  } catch (e) {
    res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
  }
  res.end();
}

app.post('/api/generate', async (req, res) => {
  const brief = req.body;
  await streamToSSE(res, buildConceptPrompt(brief), brief.product);
});

app.post('/api/refine', async (req, res) => {
  const { concept, feedback, product } = req.body;
  await streamToSSE(res, buildRefinementPrompt(concept, feedback), product + '-refined');
});

app.post('/api/variations', async (req, res) => {
  const { concept, nbVariations, product } = req.body;
  await streamToSSE(res, buildVariationsPrompt(concept, nbVariations || 3), product + '-variations');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║  COSMICMACHINE  →  localhost:${PORT}   ║`);
  console.log(`╚══════════════════════════════════════╝\n`);
});
