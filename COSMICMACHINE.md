# COSMICMACHINE — Capacités & Modes d'emploi

> **Règle d'or :** Higgsfield consomme des tokens. Ne jamais déclencher sans autorisation explicite d'Alexandre.

---

## Vue d'ensemble

COSMICMACHINE est un studio de production publicitaire augmenté par l'IA. Il couvre la chaîne complète : **brief → concept → copy → visuel → production**.

---

## 1. CONCEPT ENGINE *(disponible maintenant)*

**Ce que ça fait :** À partir d'un brief (produit, cible, message, ton), génère plusieurs angles créatifs complets.

**Chaque concept inclut :**
- Titre de campagne + claim
- Insight consommateur
- Idée créative centrale (Big Idea)
- Copy headline + body
- Direction artistique décrite (couleurs, typographie, ambiance)
- Suggestions de formats (social, affichage, vidéo)
- Variantes A/B

**Commande :**
```bash
node concept-engine/generate.js --brief "votre brief"
# ou mode interactif
node concept-engine/generate.js
```

---

## 2. HIGGSFIELD — Génération Vidéo *(autorisation requise)*

**Ce que ça fait :** Transforme un concept ou une image en vidéo publicitaire IA.

**Modes disponibles :**
| Mode | Usage | Coût estimé |
|------|-------|-------------|
| `text-to-video` | Brief texte → vidéo | ●●●○○ |
| `image-to-video` | Photo produit → vidéo animée | ●●○○○ |
| `UGC ads` | Contenu style utilisateur | ●●●○○ |

**Commande (après autorisation) :**
```bash
node higgsfield/video.js --concept "concept-001"
```

---

## 3. HIGGSFIELD — Product Photoshoot *(autorisation requise)*

**Ce que ça fait :** Génère des photos produit professionnelles à partir d'une image source.

**Cas d'usage :**
- Packshots sur fond neutre ou lifestyle
- Déclinaisons de contextes (cuisine, sport, luxe...)
- Variantes coloris/ambiances

**Commande (après autorisation) :**
```bash
node higgsfield/photoshoot.js --product ./assets/produit.jpg
```

---

## 4. HIGGSFIELD — Marketplace Cards *(autorisation requise)*

**Ce que ça fait :** Crée les visuels complets d'une fiche produit e-commerce (Amazon, Shopify, Cdiscount...).

**Ce qui est généré :**
- Image principale conforme marketplace
- 4–6 images secondaires (bénéfices, détails, contexte)
- Modules A+ / contenu enrichi
- Infographies produit

**Commande (après autorisation) :**
```bash
node higgsfield/marketplace.js --product-name "Nom" --category "Catégorie"
```

---

## 5. HIGGSFIELD — Soul ID / Character Training *(autorisation requise)*

**Ce que ça fait :** Entraîne un personnage IA (égérie, mascotte, spokesperson) pour cohérence visuelle sur toutes les campagnes.

**Cas d'usage :**
- Égérie de marque reproductible
- Personnage récurrent sur une série de pubs
- Porte-parole virtuel

**Commande (après autorisation) :**
```bash
node higgsfield/soul-id.js --character-name "Nom" --reference ./assets/ref.jpg
```

---

## Pipeline type d'une campagne complète

```
Brief
  └─▶ [1] Concept Engine     → angles créatifs + copy
         └─▶ [3] Photoshoot  → visuel produit
               └─▶ [2] Video → spot animé
                     └─▶ [4] Marketplace Cards → fiche e-commerce
```

---

## Structure du projet

```
COSMICMACHINE/
├── concept-engine/       ← Machine à concepts (Claude AI)
│   ├── generate.js
│   ├── prompts/
│   └── outputs/
├── higgsfield/           ← Wrappers Higgsfield (autorisation requise)
│   ├── video.js
│   ├── photoshoot.js
│   ├── marketplace.js
│   └── soul-id.js
├── assets/               ← Fichiers source (images, briefs)
├── outputs/              ← Résultats générés
└── COSMICMACHINE.md      ← Ce fichier
```

---

## Variables d'environnement requises

```bash
# .env
ANTHROPIC_API_KEY=sk-ant-...    # Pour Concept Engine
HIGGSFIELD_API_KEY=...          # Pour modules Higgsfield (optionnel)
```

---

*COSMICMACHINE — by Xtincell*
