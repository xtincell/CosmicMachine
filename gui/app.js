// ── NAV ──────────────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`panel-${btn.dataset.panel}`).classList.add('active');
  });
});

// ── NUMBER CONTROLS ───────────────────────────────────────────────────────────
function makeCounter(minusId, plusId, displayId, min = 1, max = 6) {
  let val = parseInt(document.getElementById(displayId).textContent) || 3;
  document.getElementById(minusId).addEventListener('click', () => {
    if (val > min) { val--; document.getElementById(displayId).textContent = val; }
  });
  document.getElementById(plusId).addEventListener('click', () => {
    if (val < max) { val++; document.getElementById(displayId).textContent = val; }
  });
  return { get: () => val };
}

const briefCounter = makeCounter('nb-minus', 'nb-plus', 'nb-display');
const varCounter   = makeCounter('var-nb-minus', 'var-nb-plus', 'var-nb-display');

// ── STATUS ────────────────────────────────────────────────────────────────────
const statusEl   = document.getElementById('status');
const statusText = statusEl.querySelector('.status-text');

function setStatus(state, text) {
  statusEl.className = 'status ' + state;
  statusText.textContent = text;
}

// ── OUTPUT ────────────────────────────────────────────────────────────────────
const outputEl      = document.getElementById('output');
const outputTitle   = document.getElementById('output-title');
const outputFooter  = document.getElementById('output-footer');
const savedPathEl   = document.getElementById('saved-path');

let rawBuffer = '';
let cursorEl  = null;

function clearOutput(title = 'Résultats') {
  rawBuffer = '';
  outputEl.innerHTML = '';
  outputTitle.textContent = title;
  outputFooter.style.display = 'none';
}

function initOutputStream() {
  outputEl.innerHTML = '<div class="output-md" id="md-render"></div>';
  cursorEl = document.createElement('span');
  cursorEl.className = 'cursor';
  document.getElementById('md-render').appendChild(cursorEl);
}

function appendToken(text) {
  rawBuffer += text;
  const md = document.getElementById('md-render');
  if (!md) return;
  md.innerHTML = renderMarkdown(rawBuffer);
  md.appendChild(cursorEl);
  outputEl.scrollTop = outputEl.scrollHeight;
}

function finalizeOutput(filePath) {
  if (cursorEl && cursorEl.parentNode) cursorEl.parentNode.removeChild(cursorEl);
  if (filePath) {
    outputFooter.style.display = 'block';
    savedPathEl.textContent = '✓ Sauvegardé → ' + filePath;
  }
}

// ── MINIMAL MARKDOWN RENDERER ─────────────────────────────────────────────────
function renderMarkdown(raw) {
  return raw
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // Headings
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // HR
    .replace(/^---$/gm, '<hr>')
    // Lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, m => '<ul>' + m + '</ul>')
    // Paragraphs (lines not already tagged)
    .split('\n').map(line => {
      if (!line.trim()) return '';
      if (/^<(h[12]|hr|ul|li)/.test(line.trim())) return line;
      return '<p>' + line + '</p>';
    }).join('\n');
}

// ── SSE STREAM ────────────────────────────────────────────────────────────────
async function streamRequest(endpoint, body, title) {
  const buttons = document.querySelectorAll('.btn-generate');
  buttons.forEach(b => b.disabled = true);
  setStatus('generating', 'Génération...');
  clearOutput(title);
  initOutputStream();

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.text) appendToken(data.text);
          if (data.done) { finalizeOutput(data.file); setStatus('done', 'Terminé'); }
          if (data.error) { appendToken('\n\n❌ Erreur : ' + data.error); setStatus('error', 'Erreur'); }
        } catch { /* ignore malformed */ }
      }
    }
  } catch (e) {
    outputEl.innerHTML = `<p style="color:var(--error)">❌ ${e.message}</p>`;
    setStatus('error', 'Erreur');
  } finally {
    buttons.forEach(b => b.disabled = false);
  }
}

// ── BRIEF FORM ────────────────────────────────────────────────────────────────
document.getElementById('form-brief').addEventListener('submit', e => {
  e.preventDefault();
  streamRequest('/api/generate', {
    product:     document.getElementById('product').value,
    target:      document.getElementById('target').value,
    message:     document.getElementById('message').value,
    tone:        document.getElementById('tone').value,
    formats:     document.getElementById('formats').value,
    constraints: document.getElementById('constraints').value,
    nbConcepts:  briefCounter.get(),
  }, `Concepts — ${document.getElementById('product').value}`);
});

// ── REFINE FORM ───────────────────────────────────────────────────────────────
document.getElementById('form-refine').addEventListener('submit', e => {
  e.preventDefault();
  streamRequest('/api/refine', {
    concept:  document.getElementById('refine-concept').value,
    feedback: document.getElementById('refine-feedback').value,
    product:  document.getElementById('refine-product').value || 'concept',
  }, 'Concept affiné');
});

// ── VARIATIONS FORM ───────────────────────────────────────────────────────────
document.getElementById('form-variations').addEventListener('submit', e => {
  e.preventDefault();
  streamRequest('/api/variations', {
    concept:      document.getElementById('var-concept').value,
    nbVariations: varCounter.get(),
    product:      document.getElementById('var-product').value || 'concept',
  }, 'Variations');
});

// ── COPY / CLEAR ──────────────────────────────────────────────────────────────
document.getElementById('btn-copy').addEventListener('click', () => {
  if (!rawBuffer) return;
  navigator.clipboard.writeText(rawBuffer).then(() => showToast('Copié dans le presse-papiers'));
});

document.getElementById('btn-clear').addEventListener('click', () => {
  clearOutput();
  outputEl.innerHTML = `<div class="output-placeholder"><div class="placeholder-icon">✦</div><p>Tes concepts apparaîtront ici en temps réel.</p></div>`;
  setStatus('', 'Prêt');
});

// ── TOAST ─────────────────────────────────────────────────────────────────────
function showToast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}
