# Échange de leads Alyxa × Septodont

Registre partagé des leads qui circulent entre Alyxa et Septodont, **dans les
deux sens**, avec une discussion sur chaque lead.

Un cabinet ouvert à être recontacté par la division chirurgie, c'est un lead
pour Septodont. Un praticien rencontré en clientèle et intéressé par Alyxa,
c'est un lead pour nous. L'outil enregistre les deux, suit ce que chacun
devient, et donne aux deux équipes un endroit pour en parler.

Pas de commission, pas de facturation : c'est un échange.

## Démarrer

```bash
npm install
npm run dev
```

L'application s'ouvre sur `http://localhost:5180` avec un jeu de démonstration
(≈ 90 leads sur 6 mois, dans les deux sens, avec leurs discussions). Aucun
compte ni installation n'est nécessaire pour l'essayer.

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production dans `dist/` |
| `npm run build:page` | Page HTML autonome, sans ressource externe |
| `npm test` | Tests des statistiques |
| `npm run lint` | Vérification des types |

## Le modèle

Un seul objet : le **lead**. Il porte un sens, et suit le même parcours des deux
côtés.

| Sens | Qui le transmet | Qui le prend en charge |
|---|---|---|
| **Envoyé** | Alyxa | Septodont |
| **Reçu** | Septodont | Alyxa |

Cinq statuts communs : `Transmis` → `Contacté` → `RDV planifié` → `Converti`, ou
`Sans suite`. La règle : **celui qui reçoit le lead le fait avancer**. C'est ce
qui permet à l'autre de savoir, sans relancer, ce que son contact est devenu.

Chaque lead a un **fil** unique où cohabitent les messages des deux équipes et
les changements de statut, dans l'ordre chronologique. En le relisant, on a
toute l'histoire du lead au même endroit.

Chaque personne a un compte, une maison (Alyxa ou Septodont) et une couleur
d'avatar : on reconnaît qui parle avant même d'avoir lu le nom.

## Ce que l'outil mesure

La question n'est pas « combien de leads » mais **« est-ce que l'échange est
équilibré et est-ce qu'il produit quelque chose des deux côtés »**. Le tableau
de bord répond à ça :

- **L'équilibre** — combien on envoie, combien on reçoit, et l'écart.
- **Le miroir** — le même bilan de chaque côté : volume du mois, taux de
  conversion, délai médian de prise en charge, entonnoir.
- **Le flux** — le rythme mois par mois, dans les deux sens.
- **Ce qui demande une action** — les discussions non lues, et les leads ouverts
  qui n'ont bougé ni d'un côté ni de l'autre depuis plus de 7 jours.

## Architecture

```
src/
  lib/
    types.ts       Modèle : lead, membre, événement du fil
    stats.ts       Agrégations — équilibre, bilans, entonnoirs, dormants
    stats.test.ts
    dates.ts       Utilitaires de dates, sans dépendance
    store.tsx      État applicatif et persistance
    telecharger.ts Export CSV, adapté à l'hôte
  components/      Briques d'interface, fiche du lead, discussion
  pages/           Tableau de bord, Leads, Guide
  data/seed.ts     Jeu de démonstration
supabase/
  schema.sql       Schéma de la base réelle, prêt à exécuter
```

Deux principes tiennent l'ensemble :

**Le fil est immuable.** On n'écrit jamais dans le passé. Un changement de
statut ajoute une entrée, il n'en modifie aucune. C'est ce qui permet de dire,
chiffres en main, combien de temps met chaque camp à prendre un lead en charge.

**Un seul endroit calcule.** Toutes les statistiques vivent dans `stats.ts`, en
fonctions pures couvertes par des tests. Les pages affichent, elles ne calculent
pas.

## Persistance

L'application tourne en **mode démonstration** : les données vivent dans le
navigateur (`localStorage`). C'est suffisant pour valider l'outil, pas pour
travailler à plusieurs.

Pour passer en base réelle :

1. Créer un projet Supabase.
2. Exécuter `supabase/schema.sql` dans son éditeur SQL.
3. Renseigner `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (voir
   `.env.example`).
4. Brancher les fonctions de `src/lib/store.tsx` sur le client Supabase — les
   pages et les statistiques restent inchangées.

Le schéma pose la sécurité au niveau des lignes : tout membre authentifié voit
tous les leads et toutes les discussions — c'est le principe même du partenariat
— mais on n'écrit qu'en son propre nom, et les états de lecture restent privés.

## Déploiement

`npm run build` produit un site statique dans `dist/`, à publier tel quel sur
Netlify ou Vercel. Le routage passe par le fragment d'URL, donc aucune règle de
réécriture n'est nécessaire côté serveur.

`npm run build:page` produit en plus `dist/page-autonome.html` : l'application
entière dans un seul fichier, sans aucune ressource externe.
