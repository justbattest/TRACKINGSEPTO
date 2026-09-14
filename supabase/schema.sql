-- ============================================================================
-- Échange de leads Alyxa <-> Septodont — schema complet
--
-- A executer d'un bloc dans l'editeur SQL du projet Supabase.
-- Idempotent : on peut le rejouer sans casser une base existante.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Referentiel
-- ----------------------------------------------------------------------------

create table if not exists regions (
  id  text primary key,
  nom text not null
);

do $$ begin
  create type organisation as enum ('alyxa', 'septodont');
exception when duplicate_object then null; end $$;

/*
 * Qui a le droit de creer un compte, et dans quelle maison.
 *
 * L'organisation n'est PAS choisie par la personne qui s'inscrit : elle est
 * deduite du domaine de son adresse professionnelle. Personne ne peut se
 * declarer Alyxa avec une adresse Septodont, ni l'inverse, ni entrer avec une
 * adresse personnelle.
 */
create table if not exists domaines_autorises (
  domaine      text primary key,
  organisation organisation not null
);

insert into domaines_autorises (domaine, organisation) values
  ('alyxa.fr', 'alyxa'),
  ('septodont.com', 'septodont'),
  ('septodont.fr', 'septodont')
on conflict (domaine) do nothing;

/*
 * Une personne qui utilise l'outil, des deux cotes du partenariat.
 * Une ligne par compte authentifie ; sans elle, on ne voit rien.
 */
create table if not exists membres (
  id             uuid primary key default gen_random_uuid(),
  utilisateur_id uuid not null unique references auth.users(id) on delete cascade,
  nom            text not null check (length(trim(nom)) > 0),
  organisation   organisation not null,
  -- Couleur d'avatar : elle identifie l'auteur dans les discussions.
  couleur        text not null,
  actif          boolean not null default true,
  cree_le        timestamptz not null default now()
);

create index if not exists membres_organisation_idx on membres(organisation);

-- ----------------------------------------------------------------------------
-- Apporteurs
--
-- Qui a AMENE le lead, par opposition a qui l'a SAISI. Ces deux notions
-- divergent en permanence dans un echange entre deux societes : une equipe
-- saisit regulierement pour l'autre. Les confondre revient a dire a un
-- partenaire que ses leads ne sont pas les siens.
--
-- Un apporteur n'a PAS besoin d'un compte : un commercial terrain doit pouvoir
-- etre credite de ses leads sans jamais ouvrir l'outil.
-- ----------------------------------------------------------------------------

create table if not exists apporteurs (
  id           uuid primary key default gen_random_uuid(),
  nom          text not null check (length(trim(nom)) > 0),
  organisation organisation not null,
  membre_id    uuid references membres(id) on delete set null,
  actif        boolean not null default true,
  cree_le      timestamptz not null default now()
);

-- Deux « Jerome » chez Septodont sont impossibles ; un chez chaque maison, oui.
create unique index if not exists apporteurs_nom_unique
  on apporteurs (lower(trim(nom)), organisation);
create index if not exists apporteurs_organisation_idx on apporteurs(organisation);

alter table apporteurs enable row level security;

drop policy if exists "apporteurs lisibles par les deux maisons" on apporteurs;
create policy "apporteurs lisibles par les deux maisons" on apporteurs
  for select to authenticated using (mon_membre() is not null);

drop policy if exists "apporteurs modifiables par un membre" on apporteurs;
create policy "apporteurs modifiables par un membre" on apporteurs
  for update to authenticated using (mon_membre() is not null);

-- Creation a la volee depuis le formulaire : on tape un nom, il existe.
create or replace function creer_apporteur(nom_complet text, organisation_choisie text)
returns apporteurs
language plpgsql security definer set search_path = public as $$
declare
  v_org       organisation;
  v_apporteur apporteurs;
begin
  if mon_membre() is null then
    raise exception 'Vous devez avoir un profil pour ajouter un apporteur.';
  end if;

  begin
    v_org := lower(trim(organisation_choisie))::organisation;
  exception when others then
    raise exception 'Équipe inconnue : choisissez Alyxa ou Septodont.';
  end;

  -- Un nom deja connu dans cette equipe est reutilise, jamais duplique.
  select * into v_apporteur
    from apporteurs
   where lower(trim(nom)) = lower(trim(nom_complet)) and organisation = v_org;
  if found then
    return v_apporteur;
  end if;

  insert into apporteurs (nom, organisation)
  values (trim(nom_complet), v_org)
  returning * into v_apporteur;
  return v_apporteur;
end;
$$;

revoke execute on function creer_apporteur(text, text) from public, anon;
grant  execute on function creer_apporteur(text, text) to authenticated;

-- ----------------------------------------------------------------------------
-- Leads
-- ----------------------------------------------------------------------------

do $$ begin
  create type statut_lead as enum ('transmis', 'contacte', 'rdv', 'converti', 'sans_suite');
exception when duplicate_object then null; end $$;

create table if not exists leads (
  id                uuid primary key default gen_random_uuid(),
  -- Maison qui a transmis le lead. Absolu : le sens « envoyé » ou « reçu » se
  -- deduit de qui regarde, jamais stocke.
  origine           organisation not null,
  structure         text not null check (length(trim(structure)) > 0),
  contact           text not null check (length(trim(contact)) > 0),
  telephone         text,
  email             text,
  ville             text,
  code_postal       text,
  region_id         text references regions(id),
  motif             text not null,
  -- Qui a AMENE le lead. C'est lui qui fixe `origine`, donc l'equipe a qui le
  -- lead est compte.
  apporte_par       uuid references apporteurs(id),
  -- Qui a SAISI le lead dans l'outil. Tracabilite seule, jamais modifiable.
  transmis_par      uuid not null references membres(id),
  -- Horodatage de transmission : la reference en cas de desaccord sur un volume.
  transmis_le       timestamptz not null default now(),
  statut            statut_lead not null default 'transmis',
  -- Denormalise pour trier la liste sans agreger le fil a chaque affichage.
  dernier_mouvement timestamptz not null default now()
);

create index if not exists leads_origine_idx   on leads(origine);
create index if not exists leads_apporteur_idx on leads(apporte_par);

-- L'origine suit l'apporteur, toujours. Une seule source de verite.
create or replace function origine_suit_apporteur() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.apporte_par is not null then
    select organisation into new.origine from apporteurs where id = new.apporte_par;
  end if;
  return new;
end;
$$;

drop trigger if exists leads_origine_suit_apporteur on leads;
create trigger leads_origine_suit_apporteur
  before insert or update of apporte_par on leads
  for each row execute function origine_suit_apporteur();

revoke execute on function origine_suit_apporteur() from public, anon, authenticated;
create index if not exists leads_statut_idx    on leads(statut);
create index if not exists leads_region_idx    on leads(region_id);
create index if not exists leads_transmis_idx  on leads(transmis_le desc);
create index if not exists leads_mouvement_idx on leads(dernier_mouvement desc);

-- ----------------------------------------------------------------------------
-- Le fil de chaque lead
--
-- Messages et changements de statut vivent dans la meme table : c'est ce qui
-- permet de relire l'histoire complete d'un lead dans l'ordre.
-- ----------------------------------------------------------------------------

do $$ begin
  create type type_evenement as enum ('statut', 'message');
exception when duplicate_object then null; end $$;

create table if not exists evenements (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references leads(id) on delete cascade,
  auteur_id  uuid not null references membres(id),
  type       type_evenement not null,
  -- Renseigne pour un changement de statut.
  statut     statut_lead,
  -- Renseigne pour un message.
  texte      text,
  survenu_le timestamptz not null default now(),
  constraint contenu_coherent check (
    (type = 'statut'  and statut is not null) or
    (type = 'message' and texte  is not null and length(trim(texte)) > 0)
  )
);

create index if not exists evenements_lead_idx on evenements(lead_id, survenu_le);

-- Toute entree au fil met a jour le statut du lead et sa date de mouvement.
create or replace function refleter_evenement() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update leads
     set dernier_mouvement = greatest(dernier_mouvement, new.survenu_le),
         statut = coalesce(new.statut, statut)
   where id = new.lead_id;
  return new;
end;
$$;

drop trigger if exists evenements_refletent_le_lead on evenements;
create trigger evenements_refletent_le_lead
  after insert on evenements
  for each row execute function refleter_evenement();

-- ----------------------------------------------------------------------------
-- Lecture des discussions
--
-- Une ligne par membre et par lead : jusqu'ou cette personne a lu le fil.
-- C'est ce qui alimente les pastilles de messages non lus.
-- ----------------------------------------------------------------------------

create table if not exists lectures (
  membre_id uuid not null references membres(id) on delete cascade,
  lead_id   uuid not null references leads(id) on delete cascade,
  lu_jusqua timestamptz not null default now(),
  primary key (membre_id, lead_id)
);

-- ----------------------------------------------------------------------------
-- Creation de compte
--
-- A la premiere connexion, l'application appelle creer_mon_membre(nom).
-- L'organisation vient du domaine de l'adresse, jamais du formulaire, et la
-- couleur est prise dans la palette en evitant celles deja utilisees.
-- ----------------------------------------------------------------------------

create or replace function creer_mon_membre(nom_complet text)
returns membres
language plpgsql security definer set search_path = public as $$
declare
  v_email   text;
  v_domaine text;
  v_org     organisation;
  v_couleur text;
  v_membre  membres;
  palette   text[] := array[
    '#4a3aa7', '#0f7a55', '#b8461c', '#1c5cab',
    '#96407a', '#2f6f7d', '#8a6d1f', '#a33a3a'
  ];
begin
  if auth.uid() is null then
    raise exception 'Vous devez être connecté.';
  end if;

  select email into v_email from auth.users where id = auth.uid();
  v_domaine := lower(split_part(v_email, '@', 2));

  select organisation into v_org from domaines_autorises where domaine = v_domaine;
  if v_org is null then
    raise exception 'Le domaine % n''est pas autorisé sur cet outil.', v_domaine
      using hint = 'Demandez à un administrateur d''ajouter votre domaine.';
  end if;

  -- Premiere couleur libre ; on boucle sur la palette si tout est pris.
  select p into v_couleur
    from unnest(palette) as p
   where p not in (select couleur from membres)
   limit 1;
  if v_couleur is null then
    v_couleur := palette[1 + (select count(*) from membres) % array_length(palette, 1)];
  end if;

  insert into membres (utilisateur_id, nom, organisation, couleur)
  values (auth.uid(), trim(nom_complet), v_org, v_couleur)
  on conflict (utilisateur_id) do update set nom = excluded.nom
  returning * into v_membre;

  return v_membre;
end;
$$;

-- ----------------------------------------------------------------------------
-- Securite
--
-- L'echange est un espace partage entre les deux maisons : tout membre voit
-- tous les leads et toutes les discussions. C'est le principe meme du
-- partenariat — chacun doit savoir ce que son contact est devenu. Ce qui reste
-- prive, ce sont les etats de lecture de chacun.
-- ----------------------------------------------------------------------------

alter table regions             enable row level security;
alter table domaines_autorises  enable row level security;
alter table membres             enable row level security;
alter table leads               enable row level security;
alter table evenements          enable row level security;
alter table lectures            enable row level security;

-- Le membre correspondant a la session en cours.
create or replace function mon_membre() returns uuid
language sql stable security definer set search_path = public as $$
  select id from membres where utilisateur_id = auth.uid() and actif;
$$;

drop policy if exists "referentiel lisible" on regions;
create policy "referentiel lisible" on regions
  for select to authenticated using (true);

drop policy if exists "annuaire lisible" on membres;
create policy "annuaire lisible" on membres
  for select to authenticated using (true);

drop policy if exists "chacun met a jour son nom" on membres;
create policy "chacun met a jour son nom" on membres
  for update to authenticated using (utilisateur_id = auth.uid());

drop policy if exists "leads lisibles par les deux maisons" on leads;
create policy "leads lisibles par les deux maisons" on leads
  for select to authenticated using (mon_membre() is not null);

drop policy if exists "leads ajoutes par un membre" on leads;
create policy "leads ajoutes par un membre" on leads
  for insert to authenticated with check (transmis_par = mon_membre());

drop policy if exists "leads modifiables par un membre" on leads;
create policy "leads modifiables par un membre" on leads
  for update to authenticated using (mon_membre() is not null);

drop policy if exists "leads supprimables par celui qui les a transmis" on leads;
create policy "leads supprimables par celui qui les a transmis" on leads
  for delete to authenticated using (transmis_par = mon_membre());

drop policy if exists "fil lisible par les deux maisons" on evenements;
create policy "fil lisible par les deux maisons" on evenements
  for select to authenticated using (mon_membre() is not null);

-- On ecrit toujours en son propre nom, et le passe reste intouchable :
-- aucune politique d'update ni de delete sur le fil.
drop policy if exists "on ecrit en son nom" on evenements;
create policy "on ecrit en son nom" on evenements
  for insert to authenticated with check (auteur_id = mon_membre());

drop policy if exists "chacun gere ses lectures" on lectures;
create policy "chacun gere ses lectures" on lectures
  for all to authenticated
  using (membre_id = mon_membre())
  with check (membre_id = mon_membre());

-- ----------------------------------------------------------------------------
-- Droits sur les fonctions
--
-- Postgres accorde l'execution a tout le monde par defaut. On reprend ces
-- droits et on ne rend que le strict necessaire.
-- ----------------------------------------------------------------------------

-- Fonction de declencheur : elle s'execute avec les droits du proprietaire de
-- la table, jamais appelee directement. Personne n'a besoin de l'atteindre.
revoke execute on function public.refleter_evenement() from public, anon, authenticated;

-- Lue par les regles au niveau des lignes : le role authentifie doit pouvoir
-- l'executer, mais un visiteur anonyme n'a rien a y faire.
revoke execute on function public.mon_membre() from public, anon;
grant  execute on function public.mon_membre() to authenticated;

-- Creation de profil : reservee a une session ouverte.
revoke execute on function public.creer_mon_membre(text) from public, anon;
grant  execute on function public.creer_mon_membre(text) to authenticated;

comment on table public.domaines_autorises is
  'Controle d''acces de l''outil. Aucune regle de lecture : deliberement invisible via l''API. Ajouter un domaine ouvre l''inscription a cette maison.';

-- ----------------------------------------------------------------------------
-- Temps reel : les messages arrivent sans rechargement.
-- ----------------------------------------------------------------------------

do $$ begin
  alter publication supabase_realtime add table leads;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table evenements;
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- Amorcage du referentiel
-- ----------------------------------------------------------------------------

insert into regions (id, nom) values
  ('idf', 'Île-de-France'), ('paca', 'PACA'), ('ara', 'Auvergne-Rhône-Alpes'),
  ('occ', 'Occitanie'), ('na', 'Nouvelle-Aquitaine'), ('hdf', 'Hauts-de-France'),
  ('ge', 'Grand Est'), ('bzh', 'Bretagne'), ('pdl', 'Pays de la Loire'),
  ('nor', 'Normandie'), ('cvl', 'Centre-Val de Loire'),
  ('bfc', 'Bourgogne-Franche-Comté'), ('cor', 'Corse')
on conflict (id) do nothing;
