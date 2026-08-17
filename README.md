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

**La difficulté ne monte pas comme on croit.** Avec des tubes tous pleins au
départ, ne laisser qu'un seul tube libre rend le plateau insoluble dans 120 cas
sur 120 : le « mode difficile » des autres jeux suppose des tubes partiellement
remplis, ce qui est un autre générateur. Ici la difficulté monte par le nombre de
couleurs (3 → 12) puis par la hauteur des tubes (4 → 5).

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
