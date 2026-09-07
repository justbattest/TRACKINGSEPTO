-- ============================================================================
-- Tracking Septodont — schema de base
--
-- A executer tel quel dans l'editeur SQL d'un projet Supabase.
-- L'application fonctionne sans lui (mode demo, stockage navigateur) ; ce
-- schema est la cible pour passer en base reelle, multi-utilisateurs.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Referentiel
-- ----------------------------------------------------------------------------

create table regions (
  id    text primary key,
  nom   text not null
);

create table partenaires (
  id            uuid primary key default gen_random_uuid(),
  nom           text not null,
  cree_le       timestamptz not null default now()
);

create table commerciaux (
  id            uuid primary key default gen_random_uuid(),
  partenaire_id uuid not null references partenaires(id) on delete cascade,
  nom           text not null,
  email         text not null,
  region_id     text references regions(id),
  -- Identifiant public du lien de captation : /l/<slug>
  slug          text not null unique,
  actif         boolean not null default true,
  cree_le       timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Leads
-- ----------------------------------------------------------------------------

create type etape_lead as enum (
  'nouveau', 'contacte', 'demo_planifiee', 'demo_faite', 'signe', 'churn', 'perdu'
);

create table leads (
  id            uuid primary key default gen_random_uuid(),
  cabinet       text not null,
  praticien     text not null,
  email         text,
  telephone     text,
  ville         text,
  code_postal   text,
  region_id     text references regions(id),
  commercial_id uuid not null references commerciaux(id),
  etape         etape_lead not null default 'nouveau',
  -- Horodatage de reception : c'est la piece qui fait foi en cas de litige.
  recu_le       timestamptz not null default now(),
  notes         text
);

create index leads_commercial_idx on leads(commercial_id);
create index leads_region_idx     on leads(region_id);
create index leads_recu_idx       on leads(recu_le desc);

-- Journal immuable des changements d'etape. On n'ecrit jamais dans le passe.
create table evenements_lead (
  id       bigserial primary key,
  lead_id  uuid not null references leads(id) on delete cascade,
  etape    etape_lead not null,
  auteur   text not null,
  survenu_le timestamptz not null default now()
);

create index evenements_lead_idx on evenements_lead(lead_id, survenu_le);

-- ----------------------------------------------------------------------------
-- Contrats
--
-- Les taux sont figes a la signature (snapshot) : changer la grille demain ne
-- doit jamais reecrire l'historique des contrats deja signes.
-- ----------------------------------------------------------------------------

create type formule as enum ('mensuel', 'annuel');

create table contrats (
  id               uuid primary key default gen_random_uuid(),
  lead_id          uuid not null unique references leads(id) on delete cascade,
  plan             formule not null,
  prix_catalogue   numeric(10,2) not null,
  taux_remise      numeric(5,4) not null default 0.1000,
  taux_commission  numeric(5,4) not null default 0.1500,
  mois_engagement  int not null,
  debut_le         timestamptz not null,
  churn_le         timestamptz,
  constraint duree_positive check (mois_engagement > 0),
  constraint churn_apres_debut check (churn_le is null or churn_le >= debut_le)
);

-- Colonnes calculees : la cascade de prix ne se recalcule jamais a la main.
alter table contrats
  add column prix_paye numeric(10,2)
    generated always as (round(prix_catalogue * (1 - taux_remise), 2)) stored,
  add column commission_mensuelle numeric(10,2)
    generated always as (round(round(prix_catalogue * (1 - taux_remise), 2) * taux_commission, 2)) stored;

-- ----------------------------------------------------------------------------
-- Commissions
--
-- Une ligne par mois du. Generee a la signature, jamais recalculee derriere :
-- une echeance payee reste payee quoi qu'il arrive ensuite.
-- ----------------------------------------------------------------------------

create type statut_commission as enum ('prevue', 'a_payer', 'payee', 'annulee');

create table commissions (
  id            uuid primary key default gen_random_uuid(),
  contrat_id    uuid not null references contrats(id) on delete cascade,
  commercial_id uuid not null references commerciaux(id),
  -- Mois de rattachement, au format AAAA-MM.
  periode       text not null check (periode ~ '^\d{4}-\d{2}$'),
  montant       numeric(10,2) not null,
  statut        statut_commission not null default 'prevue',
  payee_le      timestamptz,
  unique (contrat_id, periode)
);

create index commissions_commercial_idx on commissions(commercial_id);
create index commissions_periode_idx    on commissions(periode);
create index commissions_statut_idx     on commissions(statut);

-- Genere tout l'echeancier d'un contrat : une ligne par mois commissionne,
-- plafonne a 12 mois, coupe a la resiliation.
create or replace function generer_echeancier(p_contrat_id uuid, p_plafond int default 12)
returns void
language plpgsql
as $$
declare
  c contrats%rowtype;
  v_commercial uuid;
  v_mois int;
  i int;
  v_debut_periode timestamptz;
begin
  select * into c from contrats where id = p_contrat_id;
  if not found then
    raise exception 'contrat % introuvable', p_contrat_id;
  end if;

  select commercial_id into v_commercial from leads where id = c.lead_id;
  v_mois := least(c.mois_engagement, p_plafond);

  for i in 0 .. v_mois - 1 loop
    v_debut_periode := c.debut_le + (i || ' months')::interval;

    insert into commissions (contrat_id, commercial_id, periode, montant, statut)
    values (
      c.id,
      v_commercial,
      to_char(v_debut_periode, 'YYYY-MM'),
      c.commission_mensuelle,
      case
        when c.churn_le is not null and v_debut_periode >= c.churn_le then 'annulee'
        when v_debut_periode > now() then 'prevue'
        else 'a_payer'
      end
    )
    -- Une echeance deja payee n'est jamais remise en cause.
    on conflict (contrat_id, periode) do update
      set montant = excluded.montant,
          statut  = case when commissions.statut = 'payee' then 'payee' else excluded.statut end;
  end loop;
end;
$$;

-- Toute creation ou modification de contrat resynchronise son echeancier.
create or replace function sync_echeancier() returns trigger
language plpgsql as $$
begin
  perform generer_echeancier(new.id);
  return new;
end;
$$;

create trigger contrats_sync_echeancier
  after insert or update of churn_le, mois_engagement, prix_catalogue, taux_remise, taux_commission
  on contrats
  for each row execute function sync_echeancier();

-- ----------------------------------------------------------------------------
-- Securite
--
-- RLS active partout. Deux profils :
--   - l'equipe Alyxa voit tout ;
--   - un utilisateur Septodont ne voit que les donnees de son partenaire.
-- C'est ce qui permet d'ouvrir un portail a Septodont sans jamais exposer
-- le reste de la base.
-- ----------------------------------------------------------------------------

create table profils (
  utilisateur_id uuid primary key references auth.users(id) on delete cascade,
  role           text not null check (role in ('alyxa', 'partenaire')),
  partenaire_id  uuid references partenaires(id)
);

alter table regions        enable row level security;
alter table partenaires    enable row level security;
alter table commerciaux    enable row level security;
alter table leads          enable row level security;
alter table evenements_lead enable row level security;
alter table contrats       enable row level security;
alter table commissions    enable row level security;
alter table profils        enable row level security;

create or replace function est_alyxa() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profils where utilisateur_id = auth.uid() and role = 'alyxa');
$$;

create or replace function mon_partenaire() returns uuid
language sql stable security definer set search_path = public as $$
  select partenaire_id from profils where utilisateur_id = auth.uid();
$$;

create policy "profil visible par son proprietaire"
  on profils for select using (utilisateur_id = auth.uid());

create policy "referentiel lisible par tous les connectes"
  on regions for select to authenticated using (true);

create policy "alyxa gere tout" on commerciaux for all
  using (est_alyxa()) with check (est_alyxa());
create policy "partenaire lit ses commerciaux" on commerciaux for select
  using (partenaire_id = mon_partenaire());

create policy "alyxa gere les leads" on leads for all
  using (est_alyxa()) with check (est_alyxa());
create policy "partenaire lit ses leads" on leads for select
  using (commercial_id in (select id from commerciaux where partenaire_id = mon_partenaire()));

create policy "alyxa gere les contrats" on contrats for all
  using (est_alyxa()) with check (est_alyxa());
create policy "partenaire lit ses contrats" on contrats for select
  using (lead_id in (
    select l.id from leads l
    join commerciaux c on c.id = l.commercial_id
    where c.partenaire_id = mon_partenaire()
  ));

create policy "alyxa gere les commissions" on commissions for all
  using (est_alyxa()) with check (est_alyxa());
create policy "partenaire lit ses commissions" on commissions for select
  using (commercial_id in (select id from commerciaux where partenaire_id = mon_partenaire()));

create policy "alyxa lit le journal" on evenements_lead for select using (est_alyxa());
create policy "alyxa ecrit le journal" on evenements_lead for insert with check (est_alyxa());
create policy "alyxa lit les partenaires" on partenaires for select using (est_alyxa());

-- ----------------------------------------------------------------------------
-- Amorcage
-- ----------------------------------------------------------------------------

insert into regions (id, nom) values
  ('idf', 'Île-de-France'), ('paca', 'PACA'), ('ara', 'Auvergne-Rhône-Alpes'),
  ('occ', 'Occitanie'), ('na', 'Nouvelle-Aquitaine'), ('hdf', 'Hauts-de-France'),
  ('ge', 'Grand Est'), ('bzh', 'Bretagne'), ('nor', 'Normandie'),
  ('cvl', 'Centre-Val de Loire'), ('bfc', 'Bourgogne-Franche-Comté'),
  ('pdl', 'Pays de la Loire'), ('cor', 'Corse')
on conflict do nothing;

insert into partenaires (nom) values ('Septodont') on conflict do nothing;
