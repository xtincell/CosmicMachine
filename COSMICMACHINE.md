# COSMICMACHINE — concepts, affinage et variations

Le produit implémenté transforme un brief en pistes argumentées, puis permet
leur affinage ou leurs variations. Il prépare un arbitrage humain ; il ne
reçoit ni l'accord client, ni la production de médias, ni leur livraison.

## Utilisation actuelle

Node.js 22 est la cible de vérification. Installer avec `npm ci`, copier
`.env.example` en `.env` et renseigner l'accès fournisseur uniquement pour une
génération voulue. `npm start` ouvre l'interface locale sur le port 3000.
`npm run concept` lance le questionnaire interactif en terminal. Le programme
ne possède ni argument `--brief`, ni script batch implémenté.

Chaque piste demande insight, big idea, headline, claim, body copy, direction
artistique, formats et variante A/B. Le résultat texte reste une proposition à
juger ; la précision du prompt ne prouve pas sa valeur créative ou stratégique.

Après génération en terminal, choisir le numéro présent dans les titres
`## CONCEPT N — NOM` ou `## CONCEPT [N] — NOM`. L'affinage transmet le contenu
réel de cette piste, le retour et le brief d'origine. Les variations transmettent
également la piste et ce brief. Numéro absent ou ambigu : aucune requête ne part.
Les fichiers CLI conservent le brief et la sélection source dans leur Markdown.

Les fichiers de `concept-engine/outputs/` sont créés avec une identité propre,
un nom de produit sans séparateur de chemin et une ouverture exclusive.
L'écrivain partagé HTTP/CLI ne remplace pas un résultat existant. Le contenu est
écrit et synchronisé avant de retourner son chemin. Une sauvegarde échouée ne
produit aucun reçu de succès ; les fichiers historiques ne sont pas renommés.
Cela ne reçoit pas une sauvegarde externe ou une restauration après sinistre.

## Interface HTTP existante

- `/api/generate` reçoit le brief.
- `/api/refine` reçoit le texte du concept et le retour.
- `/api/variations` reçoit le texte du concept et le nombre de variantes.

Les trois routes émettent le texte en SSE, puis le reçu de fichier après écriture.
En cas d'échec fournisseur ou de sauvegarde, elles émettent une erreur sans
complétion. Un fragment transporté n'est pas un dossier partiel restaurable.
`createApp` permet de recevoir ces routes avec des fournisseurs de recette ;
le lancement normal garde l'accès configuré. Aucun appel payant n'est exécuté
par les tests.

## Capacités documentées mais absentes du dépôt

Vidéo Higgsfield, Product Photoshoot, Marketplace Cards et Soul ID étaient
présentés comme des wrappers exécutables. Les quatre programmes ne sont pas
présents. Une compétence installée ailleurs ne crée pas ces commandes ici.
Leur raccord éventuel doit réutiliser la fabrication gouvernée existante,
avec autorisation explicite avant tout appel consommant des tokens Higgsfield.
Aucun wrapper supplémentaire n'est créé pour rendre cette ancienne prose vraie.

## Vérifications et maturité encore ouverte

`npm run check` contrôle la syntaxe ; `npm test` reçoit conservation de sorties
au même instant, processus concurrents, chemins, sélection et contexte réels,
ainsi que les trois routes HTTP sur réseau local avec fournisseur simulé.
Les tests reproduisent l'écrasement et le concept de substitution avant correction.

Ces contrôles ne reçoivent pas une génération vivante ni une UX native. Le modèle
est fixé dans le code et sa disponibilité n'est pas reçue. Authentification,
autorisation, quotas et budgets ne sont pas qualifiés pour une exposition
partagée. Relecture des sorties, reprise dans l'interface, interruption du flux,
statut partiel, import et remise au dossier destinataire restent ouverts.
Ne pas exposer ce prototype comme un service TPE reçu sur la seule base de ces tests.

COSMICMACHINE — by Xtincell
