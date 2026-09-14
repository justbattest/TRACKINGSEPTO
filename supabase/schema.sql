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
  -- lead est compte. Distinct de `transmis_par` : les deux divergent des qu'une
  -- equipe enregistre pour l'autre.
  apporte_par       uuid references membres(id),
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
    select organisation into new.origine from membres where id = new.apporte_par;
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

/*
 * La fiche est modifiable par tout membre — c'est un outil interne, chacun
 * corrige ce qu'il voit. Mais la tracabilite de la saisie, elle, ne se
 * reecrit pas : qui a saisi et quand restent ce qu'ils etaient.
 */
create or replace function tracabilite_figee() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.transmis_par := old.transmis_par;
  new.transmis_le  := old.transmis_le;
  return new;
end;
$$;

drop trigger if exists leads_tracabilite_figee on leads;
create trigger leads_tracabilite_figee
  before update on leads
  for each row execute function tracabilite_figee();

revoke execute on function tracabilite_figee() from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- Le fil de chaque lead
--
-- Messages et changements de statut vivent dans la meme table : c'est ce qui
-- permet de relire l'histoire complete d'un lead dans l'ordre.
-- ----------------------------------------------------------------------------

do $$ begin
  -- Une correction de fiche laisse une trace au meme titre qu'un message.
  create type type_evenement as enum ('statut', 'message', 'modification');
exception when duplicate_object then null; end $$;

-- Rattrapage pour une base anterieure a l'ajout des corrections. A jouer seul,
-- avant le reste : Postgres interdit d'utiliser une valeur d'enum dans la
-- transaction qui la cree.
--   alter type type_evenement add value if not exists 'modification';

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
    (type = 'statut' and statut is not null)
    or (type in ('message', 'modification') and texte is not null and length(trim(texte)) > 0)
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
-- Outil interne entre deux equipes qui se connaissent : on cree un compte avec
-- un nom, une adresse, un mot de passe, et on choisit son equipe. Pas de code
-- d'acces, pas de confirmation par email, rien a demander a personne.
-- ----------------------------------------------------------------------------

-- L'adresse est consideree comme confirmee des l'inscription.
create or replace function confirmer_a_l_inscription() returns trigger
language plpgsql security definer set search_path = auth, public as $$
begin
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists confirmer_a_l_inscription on auth.users;
create trigger confirmer_a_l_inscription
  before insert on auth.users
  for each row execute function confirmer_a_l_inscription();

/*
 * A la premiere connexion, l'application appelle creer_mon_membre(nom, equipe).
 * L'equipe n'est pas un cloisonnement — les deux voient les memes donnees —
 * seulement le sens de lecture : ce qu'une equipe envoie, l'autre le recoit.
 */
create or replace function creer_mon_membre(nom_complet text, organisation_choisie text)
returns membres
language plpgsql security definer set search_path = public as $$
declare
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

  begin
    v_org := lower(trim(organisation_choisie))::organisation;
  exception when others then
    raise exception 'Choisissez Alyxa ou Septodont.';
  end;

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
  on conflict (utilisateur_id) do update
    set nom = excluded.nom, organisation = excluded.organisation
  returning * into v_membre;

  return v_membre;
end;
$$;

-- ----------------------------------------------------------------------------
-- Notifications
--
-- Qui est prevenu quand un lead arrive, par equipe destinataire. Asymetrique a
-- dessein : Septodont veut ses commerciaux nommement, Alyxa a une boite
-- commune que tout le monde lit.
-- ----------------------------------------------------------------------------

create table if not exists notifications_equipe (
  organisation    organisation primary key,
  -- Prendre les adresses des comptes de l'equipe, telles qu'ils se sont inscrits.
  inclure_membres boolean not null default false,
  -- Adresses en supplement, pour les gens sans compte ou les boites communes.
  adresses        text[] not null default '{}'
);

alter table notifications_equipe enable row level security;

insert into notifications_equipe (organisation, inclure_membres, adresses) values
  ('septodont', true,  '{}'),
  ('alyxa',     false, '{getalyxa@gmail.com}')
on conflict (organisation) do nothing;

comment on table notifications_equipe is
  'Destinataires des notifications de leads. Aucune regle de lecture : deliberement invisible via l''API, seule la fonction d''envoi la lit.';

/*
 * Les adresses a prevenir pour une equipe, dedoublonnees.
 *
 * Passe par auth.users : personne n'a a ressaisir une adresse deja donnee a
 * l'inscription, et un depart se repercute en desactivant le compte.
 */
create or replace function destinataires_notification(equipe organisation)
returns text[]
language plpgsql security definer set search_path = public, auth as $$
declare
  v_conf  notifications_equipe;
  v_liste text[];
begin
  select * into v_conf from notifications_equipe where organisation = equipe;
  if not found then return '{}'; end if;

  v_liste := v_conf.adresses;

  if v_conf.inclure_membres then
    select v_liste || coalesce(array_agg(u.email::text), '{}')
      into v_liste
      from membres m
      join auth.users u on u.id = m.utilisateur_id
     where m.organisation = equipe and m.actif and u.email is not null;
  end if;

  select array_agg(distinct lower(btrim(a)))
    into v_liste
    from unnest(v_liste) as a
   where btrim(a) <> '';

  return coalesce(v_liste, '{}');
end;
$$;

-- Reservee a la fonction d'envoi : personne ne doit pouvoir lister les
-- adresses de l'autre equipe depuis le navigateur.
revoke execute on function public.destinataires_notification(organisation)
  from public, anon, authenticated;
grant execute on function public.destinataires_notification(organisation) to service_role;

-- ----------------------------------------------------------------------------
-- Securite
--
-- L'echange est un espace partage entre les deux maisons : tout membre voit
-- tous les leads et toutes les discussions. C'est le principe meme du
-- partenariat — chacun doit savoir ce que son contact est devenu. Ce qui reste
-- prive, ce sont les etats de lecture de chacun.
-- ----------------------------------------------------------------------------

alter table regions             enable row level security;
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
revoke execute on function public.creer_mon_membre(text, text) from public, anon;
grant  execute on function public.creer_mon_membre(text, text) to authenticated;

-- Declencheurs : ils s'executent avec les droits du proprietaire, jamais
-- appeles directement.
revoke execute on function public.origine_suit_apporteur() from public, anon, authenticated;
revoke execute on function public.tracabilite_figee()      from public, anon, authenticated;
revoke execute on function public.confirmer_a_l_inscription() from public, anon, authenticated;

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
