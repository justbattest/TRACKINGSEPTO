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

## Les deux modes

L'application tourne dans l'un ou l'autre, selon la présence des variables
d'environnement. Le code des pages est identique dans les deux cas.

| | Démonstration | Partagé |
|---|---|---|
| Déclenché par | aucune variable d'environnement | `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` |
| Données | jeu d'exemple, dans le navigateur | base Supabase commune |
| Identité | on choisit un personnage | compte email + mot de passe |
| Temps réel | non | oui, les messages arrivent seuls |

## Mise en service

### 1. Créer le projet Supabase

Sur [supabase.com](https://supabase.com), créer un projet en région **Europe
(Paris ou Francfort)** — les leads sont des données professionnelles de
praticiens français.

### 2. Poser le schéma

Coller `supabase/schema.sql` dans l'éditeur SQL du projet et exécuter. Il crée
les tables, les règles d'accès, la fonction de création de compte et le temps
réel. Il est réexécutable sans risque.

### 3. Ouvrir les bons domaines

Le schéma amorce `alyxa.fr`, `septodont.com` et `septodont.fr`. Pour en ajouter
un :

```sql
insert into domaines_autorises (domaine, organisation)
values ('mondomaine.fr', 'septodont');
```

**C'est le seul contrôle d'accès.** Une adresse hors de cette liste peut créer
un compte, mais ne peut pas créer de profil : elle ne voit rien.

### 4. Déployer sur Netlify

Connecter le dépôt GitHub à Netlify. `netlify.toml` fournit déjà la commande de
build et le dossier de publication. Il reste à renseigner, dans
**Site settings > Environment variables** :

| Variable | Où la trouver |
|---|---|
| `VITE_SUPABASE_URL` | Supabase > Settings > API > Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase > Settings > API > clé publique `anon` |

La clé `anon` est publique par nature : elle ne donne accès à rien sans compte,
la sécurité repose entièrement sur les règles au niveau des lignes.

### 5. Autoriser l'adresse du site

Dans Supabase > Authentication > URL Configuration, mettre l'URL Netlify en
**Site URL** et en **Redirect URL**, sinon les liens de confirmation d'adresse
renvoient vers `localhost`.

## Sécurité

Le schéma pose la sécurité au niveau des lignes :

- **L'organisation n'est jamais déclarée par l'utilisateur.** Elle est déduite du
  domaine de son adresse au moment de créer son profil. Personne ne peut se
  présenter comme Alyxa avec une adresse Septodont, ni l'inverse.
- **Tout membre voit tous les leads et toutes les discussions.** C'est le principe
  du partenariat : chacun doit savoir ce que son contact est devenu.
- **On n'écrit qu'en son propre nom**, et le fil est en insertion seule : aucune
  règle ne permet de modifier ou d'effacer un message déjà posté.
- **Les états de lecture sont privés** à chaque personne.

## Déploiement statique ailleurs

`npm run build` produit un site statique dans `dist/`, publiable tel quel. Le
routage passe par le fragment d'URL, donc aucune règle de réécriture n'est
nécessaire côté serveur.

`npm run build:page` produit en plus `dist/page-autonome.html` : l'application
entière dans un seul fichier, sans aucune ressource externe.
