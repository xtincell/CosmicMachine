export function buildConceptPrompt(brief) {
  return `Tu es un directeur de création senior avec 20 ans d'expérience en publicité.
Tu travailles pour les plus grandes agences mondiales (BBDO, Ogilvy, BETC).

Génère ${brief.nbConcepts || 3} concepts publicitaires distincts et percutants pour ce brief :

PRODUIT / SERVICE : ${brief.product}
CIBLE : ${brief.target}
MESSAGE CLÉ : ${brief.message}
TON : ${brief.tone || 'à définir selon le concept'}
FORMATS CIBLES : ${brief.formats || 'tous formats'}
CONTRAINTES : ${brief.constraints || 'aucune'}
BUDGET INDICATIF : ${brief.budget || 'non précisé'}

---

Pour CHAQUE concept, fournis EXACTEMENT cette structure :

## CONCEPT [N] — [NOM DU CONCEPT EN MAJUSCULES]

**INSIGHT**
L'observation humaine vraie qui fonde le concept (1–2 phrases).

**BIG IDEA**
L'idée créative centrale en 1 phrase mémorable.

**HEADLINE**
Le titre principal de la campagne.

**CLAIM / TAGLINE**
La signature de la campagne (court, mémorable).

**BODY COPY**
Le texte publicitaire principal (2–4 phrases, ton calibré à la cible).

**DIRECTION ARTISTIQUE**
- Ambiance visuelle : [décris en 2 lignes]
- Palette couleurs : [couleurs précises]
- Typographie : [style typo]
- Style photo/illustration : [décris]

**FORMATS RECOMMANDÉS**
- Social media : [format + ratio + description du visuel]
- Affichage : [format + description]
- Vidéo : [durée + description du spot]
- Digital : [bannières, etc.]

**VARIANTE A/B**
Une variation du concept (angle légèrement différent, même Big Idea).

**POURQUOI ÇA MARCHE**
Analyse créative en 2–3 phrases : pourquoi ce concept va résonner avec la cible.

---

Sépare chaque concept par une ligne de tirets (---).
Sois audacieux, original, mémorable. Évite les clichés publicitaires éculés.`;
}

export function buildRefinementPrompt(concept, feedback) {
  return `Voici un concept publicitaire existant :

${concept}

Retravaille-le en tenant compte de ce feedback :
${feedback}

Conserve la même structure de sortie. Améliore ce qui est demandé sans tout changer.`;
}

export function buildVariationsPrompt(concept, nbVariations = 3) {
  return `À partir de ce concept publicitaire :

${concept}

Génère ${nbVariations} variations créatives qui conservent la Big Idea mais explorent :
- Des tons différents (humour, émotion, provocation...)
- Des cibles secondaires
- Des formats spécifiques (Reels, OOH, print...)

Utilise la même structure de sortie pour chaque variation.`;
}
