-- ============================================================================
-- Échange de leads Alyxa <-> Septodont — schema de base
--
-- A executer tel quel dans l'editeur SQL d'un projet Supabase.
-- L'application fonctionne sans lui (mode demonstration, stockage navigateur) ;
-- ce schema est la cible pour passer en base reelle, partagee entre les deux
-- equipes.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Referentiel
-- ----------------------------------------------------------------------------

create table regions (
  id  text primary key,
  nom text not null
);

create type organisation as enum ('alyxa', 'septodont');

/*
 * Une personne qui utilise l'outil, des deux cotes du partenariat.
 * `utilisateur_id` relie le membre a son compte Supabase ; il reste vide tant
 * que la personne n'a pas ouvert de session.
 */
create table membres (
  id             uuid primary key default gen_random_uuid(),
  utilisateur_id uuid unique references auth.users(id) on delete set null,
  nom            text not null,
  organisation   organisation not null,
  -- Couleur d'avatar : elle identifie l'auteur dans les discussions.
  couleur        text not null,
  actif          boolean not null default true,
  cree_le        timestamptz not null default now()
);

create index membres_organisation_idx on membres(organisation);

-- ----------------------------------------------------------------------------
-- Leads
-- ----------------------------------------------------------------------------

-- Sens de circulation, vu depuis Alyxa.
create type sens_lead as enum ('recu', 'envoye');

create type statut_lead as enum ('transmis', 'contacte', 'rdv', 'converti', 'sans_suite');

create table leads (
  id               uuid primary key default gen_random_uuid(),
  sens             sens_lead not null,
  structure        text not null,
  contact          text not null,
  telephone        text,
  email            text,
  ville            text,
  code_postal      text,
  region_id        text references regions(id),
  motif            text not null,
  transmis_par     uuid not null references membres(id),
  -- Horodatage de transmission : la reference en cas de desaccord sur un volume.
  transmis_le      timestamptz not null default now(),
  statut           statut_lead not null default 'transmis',
  -- Denormalise pour trier la liste sans agreger le fil a chaque affichage.
  dernier_mouvement timestamptz not null default now()
);

create index leads_sens_idx       on leads(sens);
create index leads_statut_idx     on leads(statut);
create index leads_region_idx     on leads(region_id);
create index leads_transmis_idx   on leads(transmis_le desc);
create index leads_mouvement_idx  on leads(dernier_mouvement desc);

-- ----------------------------------------------------------------------------
-- Le fil de chaque lead
--
-- Messages et changements de statut vivent dans la meme table : c'est ce qui
-- permet de relire l'histoire complete d'un lead dans l'ordre.
-- ----------------------------------------------------------------------------

create type type_evenement as enum ('statut', 'message');

create table evenements (
  id        uuid primary key default gen_random_uuid(),
  lead_id   uuid not null references leads(id) on delete cascade,
  auteur_id uuid not null references membres(id),
  type      type_evenement not null,
  -- Renseigne pour un changement de statut.
  statut    statut_lead,
  -- Renseigne pour un message.
  texte     text,
  survenu_le timestamptz not null default now(),
  constraint contenu_coherent check (
    (type = 'statut'  and statut is not null) or
    (type = 'message' and texte  is not null and length(trim(texte)) > 0)
  )
);

create index evenements_lead_idx on evenements(lead_id, survenu_le);

-- Toute entree au fil met a jour le statut et la date de dernier mouvement.
create or replace function refleter_evenement() returns trigger
language plpgsql as $$
begin
  update leads
     set dernier_mouvement = greatest(dernier_mouvement, new.survenu_le),
         statut = coalesce(new.statut, statut)
   where id = new.lead_id;
  return new;
end;
$$;

create trigger evenements_refletent_le_lead
  after insert on evenements
  for each row execute function refleter_evenement();

-- ----------------------------------------------------------------------------
-- Lecture des discussions
--
-- Une ligne par membre et par lead : jusqu'ou cette personne a lu le fil.
-- C'est ce qui alimente les pastilles de messages non lus.
-- ----------------------------------------------------------------------------

create table lectures (
  membre_id  uuid not null references membres(id) on delete cascade,
  lead_id    uuid not null references leads(id) on delete cascade,
  lu_jusqua  timestamptz not null default now(),
  primary key (membre_id, lead_id)
);

-- Nombre de messages non lus par lead, pour le membre connecte.
create or replace view non_lus as
  select m.id as membre_id,
         l.id as lead_id,
         count(e.id) as messages
    from membres m
    cross join leads l
    left join lectures lu on lu.membre_id = m.id and lu.lead_id = l.id
    left join evenements e
           on e.lead_id = l.id
          and e.type = 'message'
          and e.auteur_id <> m.id
          and (lu.lu_jusqua is null or e.survenu_le > lu.lu_jusqua)
   group by m.id, l.id;

-- ----------------------------------------------------------------------------
-- Securite
--
-- L'echange est un espace partage entre les deux maisons : tout membre
-- authentifie voit tous les leads et toutes les discussions. C'est le principe
-- meme du partenariat — chacun doit savoir ce que son contact est devenu.
-- Ce qui reste prive, ce sont les etats de lecture de chacun.
-- ----------------------------------------------------------------------------

alter table regions    enable row level security;
alter table membres    enable row level security;
alter table leads      enable row level security;
alter table evenements enable row level security;
alter table lectures   enable row level security;

-- Le membre correspondant a la session en cours.
create or replace function mon_membre() returns uuid
language sql stable security definer set search_path = public as $$
  select id from membres where utilisateur_id = auth.uid() and actif;
$$;

create policy "referentiel lisible" on regions
  for select to authenticated using (true);

create policy "annuaire lisible" on membres
  for select to authenticated using (true);
create policy "chacun met a jour sa fiche" on membres
  for update to authenticated using (utilisateur_id = auth.uid());

create policy "leads lisibles par les deux maisons" on leads
  for select to authenticated using (mon_membre() is not null);
create policy "leads ajoutes par un membre" on leads
  for insert to authenticated with check (transmis_par = mon_membre());
create policy "leads modifiables par un membre" on leads
  for update to authenticated using (mon_membre() is not null);
create policy "leads supprimables par celui qui les a transmis" on leads
  for delete to authenticated using (transmis_par = mon_membre());

create policy "fil lisible par les deux maisons" on evenements
  for select to authenticated using (mon_membre() is not null);
-- On ne peut ecrire qu'en son propre nom, et le passe reste intouchable.
create policy "on ecrit en son nom" on evenements
  for insert to authenticated with check (auteur_id = mon_membre());

create policy "chacun gere ses lectures" on lectures
  for all to authenticated using (membre_id = mon_membre()) with check (membre_id = mon_membre());

-- ----------------------------------------------------------------------------
-- Amorcage
-- ----------------------------------------------------------------------------

insert into regions (id, nom) values
  ('idf', 'Île-de-France'), ('paca', 'PACA'), ('ara', 'Auvergne-Rhône-Alpes'),
  ('occ', 'Occitanie'), ('na', 'Nouvelle-Aquitaine'), ('hdf', 'Hauts-de-France'),
  ('ge', 'Grand Est'), ('bzh', 'Bretagne'), ('pdl', 'Pays de la Loire'),
  ('nor', 'Normandie'), ('cvl', 'Centre-Val de Loire'),
  ('bfc', 'Bourgogne-Franche-Comté'), ('cor', 'Corse')
on conflict do nothing;
