# IRO 色

Casse-tête de couleurs : videz les tubes les uns dans les autres jusqu'à ce que
chaque tube ne contienne plus qu'une seule couleur. PWA installable, jouable
hors-ligne, avec classement mondial.

**En prod : https://iro-tubes.vercel.app**

## Les règles

- On ne verse que **le bloc du dessus**, et seulement sur une couleur
  **identique** ou dans un tube **vide**.
- Tout le bloc part d'un coup, dans la limite de la place à l'arrivée.
- Gagné quand chaque tube est vide ou plein d'une seule couleur.

## Ce qui n'est pas évident

**Aucun niveau n'est impossible.** Mélanger au hasard et servir est le piège du
genre : mesuré ici, **62 plateaux sur 300** tirés au hasard sont insolubles. Tous
les niveaux passent donc devant un solveur avant d'exister, et
`npm run test-niveaux` rejoue une solution complète pour chacun.

**Le « minimum » affiché est prouvé**, pas estimé. Une recherche IDA* avec un
minorant admissible donne la solution la plus courte ; un parcours en largeur
indépendant recalcule la distance exacte sur des centaines de petits plateaux
pour vérifier qu'IDA* ne se trompe pas (`npm run test-solveur`).

**Le classement est rejoué, pas déclaré.** Le client envoie sa suite de coups ;
le serveur la déroule sur le plateau officiel et n'accepte que si elle mène
vraiment à la victoire. On ne peut pas s'inscrire au classement sans avoir résolu
le casse-tête.

**Le verre dessiné et la zone touchée sont deux choses différentes.** Les tubes
sont dessinés à la moitié de leur case pour que le plateau respire ; le bouton,
lui, occupe toute la case. Sans cette séparation, un verre de 18 px au niveau 60
serait invisable au pouce.

**La palette est mesurée, pas choisie à l'œil.** `npm run test-palette` calcule
l'écart perceptuel (CIEDE2000) entre toutes les paires et refuse en dessous de
ΔE 22. La roue des teintes boucle : la première et la dernière couleur sont
voisines, ce qui avait donné « deux rouges » séparés de ΔE 7 seulement.

**La difficulté ne monte pas comme on croit.** Avec des tubes tous pleins au
départ, ne laisser qu'un seul tube libre rend le plateau insoluble dans 120 cas
sur 120. Deux axes seulement fonctionnent : le nombre de couleurs (3 → 12,
plafonné par la palette) puis la **hauteur des tubes** — mesuré, 12 couleurs
donnent ~50 coups à 5 unités, ~61 à 6, ~71 à 7. Au-delà, c'est l'écran d'un
iPhone SE qui plafonne.

**Deux générateurs, pas un.** Le tirage au hasard produit les plateaux les plus
emmêlés, mais il ne sait pas fabriquer les formats à un seul tube libre. Pour
ceux-là on part de l'état RÉSOLU et on joue des coups à l'envers : le plateau est
alors soluble par construction. ⚠️ Une marche arrière *au hasard* sature autour
de 26 coups — l'état résolu est un attracteur ; il faut choisir à chaque pas le
coup qui éparpille le plus.

**Trois moteurs de recherche, pour trois usages.** IDA* prouve le minimum mais
coûte des dizaines de secondes au-delà de 5 unités ; la descente en profondeur
répond en millisecondes mais rend des solutions très lâches (90 coups pour 71) ;
la **recherche en faisceau** tombe à +0,20 coup du minimum prouvé en 84 ms. C'est
elle qui donne l'objectif des grands plateaux — annoncé « connu » et non
« minimum », parce qu'il ne l'est pas.

## Commandes

| commande | ce qu'elle fait |
| --- | --- |
| `npm run dev` | développement |
| `npm run local` | le jeu **avec son API**, sur un Postgres en mémoire (PGlite) |
| `npm run niveaux 60` | refabrique `src/niveaux.json` (long : le solveur prouve chaque « par ») |
| `npm run migrate` | applique le schéma sur Neon |
| `npm run test` | logique, solveur, niveaux, classement, bout en bout |
| `npm run verifie [url]` | garde-fou : mise en page sur 4 appareils, **réseau coupé**, zéro requête tierce |
| `npm run test-parcours [url]` | résout le niveau 1 en cliquant, dans un vrai navigateur |

## Pièges déjà payés

- **`navigateFallbackDenylist: [/^\/api\//]`** dans workbox. Sans ça le service
  worker sert la page HTML à la place du JSON : le classement casse en silence,
  et seulement une fois l'app installée.
- **Une fonction ne voit que les variables présentes quand son déploiement a été
  construit.** Après avoir provisionné la base ou changé `IRO_SEL`, il FAUT
  redéployer.
- **Sans `IRO_SEL`, l'API répond 503** au lieu de retomber sur une valeur en dur.
  Échouer fermé.
- **La protection « Vercel Authentication »** est activée par défaut sur un
  nouveau projet et renvoie tout le monde vers une page de connexion.
- **Ne pas mettre d'effets de bord dans un `setState(fonction)`** : React les
  rejoue deux fois en développement et le compteur de coups se met à mentir.
- **Trois couleurs voisines de la roue sont indépartageables.** Les teintes d'un
  niveau sont réparties sur toute la palette, pas prises dans l'ordre.

## Structure

```
src/logique.js      les règles, pures, sans dépendance
src/solveur.js      IDA* (optimal) + recherche en profondeur (rapide)
src/generateur.js   fabrication des niveaux, tirage déterministe
src/niveaux.json    les 60 niveaux livrés, avec leur « par »
api/                compte, résultat, classement (Neon)
```
