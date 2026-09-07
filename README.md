# Tracking Septodont

Outil de suivi du partenariat **Alyxa × Septodont** : centraliser les leads
transmis par Septodont, suivre ce qu'ils deviennent, et calculer
automatiquement la remise accordée au cabinet, la commission due au commercial
Septodont, et la marge qui reste à Alyxa.

## Démarrer

```bash
npm install
npm run dev
```

L'application s'ouvre sur `http://localhost:5173` avec un jeu de données de
démonstration (94 leads, 8 commerciaux, 9 mois d'historique). Aucune
installation ni compte n'est nécessaire pour l'essayer.

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production dans `dist/` |
| `npm test` | Tests du moteur financier |
| `npm run lint` | Vérification des types |

## Les règles du partenariat

Elles sont implémentées à un seul endroit, `src/lib/engine.ts`, et couvertes
par des tests.

0. **Vente au poste** — une licence équipe un praticien. Un cabinet de 3
   dentistes souscrit 3 licences : un seul lead, un seul contrat, trois fois le
   montant. Tous les calculs ci-dessous portent sur le contrat entier.
1. **Remise cabinet −10 %** — tout cabinet qui souscrit via Septodont paie 10 %
   de moins que le tarif public Alyxa.
2. **Commission commerciale 15 %** — le commercial Septodont qui a apporté le
   lead touche 15 % de ce que le cabinet paie réellement, chaque mois.
3. **Plafond 12 mois** — la commission court sur la durée d'engagement souscrite
   (1 mois pour un abonnement mensuel, 12 mois pour un annuel), plafonnée à
   12 mois, et s'arrête immédiatement en cas de résiliation.

Appliqué à la grille tarifaire Alyxa, pour **une licence** :

| | Mensuel | Annuel |
|---|---|---|
| Prix catalogue / licence | 224,00 € | 179,00 € |
| Remise Septodont | − 22,40 € | − 17,90 € |
| **Payé par le cabinet** | **201,60 €** | **161,10 €** |
| Commission commerciale | − 30,24 € | − 24,17 € |
| **Reste à Alyxa** | **171,36 €** | **136,93 €** |
| Durée commissionnée | 1 mois | 12 mois |
| **Commission totale** | **30,24 €** | **290,04 €** |

Le même cabinet avec **3 licences en annuel** paie 483,30 €/mois (537 € − 10 %),
dont 72,50 € de commission mensuelle, soit 870,00 € versés au commercial sur les
12 mois. L'arrondi se fait une seule fois, sur le total du contrat : c'est le
montant réellement facturé, pas une somme d'arrondis par licence.

## Architecture

```
src/
  lib/
    types.ts      Modèle de données
    engine.ts     Moteur financier — le seul endroit où l'argent se calcule
    engine.test.ts
    agregats.ts   Agrégations pour les tableaux de bord
    dates.ts      Utilitaires de dates, sans dépendance
    store.tsx     État applicatif et persistance
  components/     Briques d'interface partagées
  pages/          Une page par écran
  data/seed.ts    Jeu de données de démonstration
supabase/
  schema.sql      Schéma de la base réelle, prêt à exécuter
```

Deux principes tiennent l'ensemble :

**Les taux sont figés à la signature.** Un contrat mémorise le prix catalogue par licence,
le taux de remise et le taux de commission en vigueur le jour où il est signé.
Changer la grille demain ne réécrit jamais l'historique.

**L'historique est immuable.** On ne stocke pas « ce lead est signé » mais « le
12/06 à 14 h 32, ce lead est passé à signé ». C'est ce journal horodaté qui fait
foi le jour où un volume ou un montant est contesté.

## Persistance

L'application tourne aujourd'hui en **mode démonstration** : les données vivent
dans le navigateur (`localStorage`). C'est suffisant pour valider l'outil, pas
pour l'exploiter à plusieurs.

Pour passer en base réelle :

1. Créer un projet Supabase.
2. Exécuter `supabase/schema.sql` dans son éditeur SQL.
3. Renseigner `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (voir
   `.env.example`).
4. Brancher les fonctions de `src/lib/store.tsx` sur le client Supabase — les
   pages et le moteur de calcul restent inchangés.

Le schéma inclut la sécurité au niveau des lignes (RLS) avec deux profils :
l'équipe Alyxa voit tout, un utilisateur Septodont ne voit que les données de
son propre partenaire. C'est ce qui permettra d'ouvrir un portail en lecture
seule à Septodont sans exposer le reste de la base.

## Attribution des leads

Chaque commercial Septodont dispose d'un lien personnel, `/l/<son-slug>`, qui
ouvre un formulaire public. Un cabinet qui le remplit entre dans la base déjà
rattaché au bon commercial et horodaté, sans aucune saisie interne. C'est le
mécanisme d'attribution recommandé : il supprime les erreurs de rattachement et
les contestations de volume.
