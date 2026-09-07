/** Formule d'abonnement Alyxa souscrite par le cabinet. */
export type Plan = 'mensuel' | 'annuel'

/** Etapes du pipeline, dans l'ordre. */
export const ETAPES = [
  'nouveau',
  'contacte',
  'demo_planifiee',
  'demo_faite',
  'signe',
  'churn',
  'perdu',
] as const
export type Etape = (typeof ETAPES)[number]

/** Etat d'une echeance de commission. */
export type StatutCommission = 'prevue' | 'a_payer' | 'payee' | 'annulee'

export interface Region {
  id: string
  nom: string
}

/** Commercial Septodont qui apporte les leads. */
export interface Commercial {
  id: string
  nom: string
  email: string
  regionId: string
  /** Identifiant utilise dans son lien de captation : /l/<slug> */
  slug: string
  actif: boolean
}

/** Un cabinet dentaire transmis par Septodont. */
export interface Lead {
  id: string
  cabinet: string
  praticien: string
  email: string
  telephone: string
  ville: string
  codePostal: string
  regionId: string
  commercialId: string
  etape: Etape
  /** Date de reception du lead (horodatage d'entree). */
  recuLe: string
  /** Historique immuable des changements d'etape. */
  historique: EvenementLead[]
  notes?: string
}

export interface EvenementLead {
  date: string
  etape: Etape
  auteur: string
}

/**
 * Contrat signe. Les taux sont figes a la signature (snapshot) : si on change
 * la remise ou la commission demain, les contrats deja signes ne bougent pas.
 */
export interface Contrat {
  id: string
  leadId: string
  plan: Plan
  /** Prix catalogue mensuel Alyxa au moment de la signature. */
  prixCatalogue: number
  /** Remise Septodont appliquee au cabinet, ex. 0.10 */
  tauxRemise: number
  /** Part reversee au commercial, ex. 0.15 */
  tauxCommission: number
  /** Duree d'engagement souscrite, en mois (1 pour mensuel, 12 pour annuel). */
  moisEngagement: number
  debutLe: string
  /** Renseigne si le cabinet a resilie : coupe les commissions a venir. */
  churnLe?: string | null
}

/** Une echeance mensuelle due a un commercial. */
export interface Commission {
  id: string
  contratId: string
  commercialId: string
  /** Mois de la commission au format AAAA-MM. */
  periode: string
  montant: number
  statut: StatutCommission
  payeeLe?: string | null
}

export interface Reglages {
  tauxRemise: number
  tauxCommission: number
  /** Plafond de duree de commission, en mois. */
  plafondMois: number
  prixCatalogue: Record<Plan, number>
}

export const REGLAGES_DEFAUT: Reglages = {
  tauxRemise: 0.1,
  tauxCommission: 0.15,
  plafondMois: 12,
  prixCatalogue: { mensuel: 224, annuel: 179 },
}

export const LIBELLE_ETAPE: Record<Etape, string> = {
  nouveau: 'Nouveau',
  contacte: 'Contacté',
  demo_planifiee: 'Démo planifiée',
  demo_faite: 'Démo faite',
  signe: 'Signé',
  churn: 'Résilié',
  perdu: 'Perdu',
}

/** Etapes qui composent l'entonnoir de conversion (churn et perdu sont hors entonnoir). */
export const ETAPES_ENTONNOIR: Etape[] = [
  'nouveau',
  'contacte',
  'demo_planifiee',
  'demo_faite',
  'signe',
]
