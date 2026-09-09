/**
 * Modele de l'echange de leads Alyxa <-> Septodont.
 *
 * Un seul objet : le lead. Il porte un sens (qui l'envoie a qui) et suit le
 * meme parcours des deux cotes. Pas de contrat, pas de commission : c'est un
 * echange, on compte ce qui circule et ce que ca donne.
 */

/** Sens de circulation, vu depuis Alyxa. */
export type Sens = 'recu' | 'envoye'

export const SENS: Sens[] = ['recu', 'envoye']

export const LIBELLE_SENS: Record<Sens, string> = {
  recu: 'Reçu de Septodont',
  envoye: 'Envoyé à Septodont',
}

/** Formulation courte pour les tableaux et les filtres. */
export const LIBELLE_SENS_COURT: Record<Sens, string> = {
  recu: 'Reçu',
  envoye: 'Envoyé',
}

/** Qui prend le lead en charge une fois transmis. */
export const RESPONSABLE: Record<Sens, string> = {
  recu: 'Alyxa',
  envoye: 'Septodont',
}

/** Parcours commun aux deux sens, dans l'ordre. */
export const STATUTS = ['transmis', 'contacte', 'rdv', 'converti', 'sans_suite'] as const
export type Statut = (typeof STATUTS)[number]

export const LIBELLE_STATUT: Record<Statut, string> = {
  transmis: 'Transmis',
  contacte: 'Contacté',
  rdv: 'RDV planifié',
  converti: 'Converti',
  sans_suite: 'Sans suite',
}

/** Les etapes qui composent l'entonnoir (sans_suite en sort). */
export const STATUTS_ENTONNOIR: Statut[] = ['transmis', 'contacte', 'rdv', 'converti']

/** Un lead est clos quand plus personne n'a d'action a mener. */
export const estClos = (statut: Statut): boolean => statut === 'converti' || statut === 'sans_suite'

/**
 * Motifs proposes selon le sens. Liste courte et fermee : c'est ce qui rend
 * les statistiques exploitables. « Autre » laisse la porte ouverte.
 */
export const MOTIFS: Record<Sens, string[]> = {
  envoye: [
    'Division chirurgie',
    'Implantologie',
    'Anesthésie',
    'Consommables',
    'Équipement',
    'Autre',
  ],
  recu: [
    'Intéressé par Alyxa',
    'Démo demandée',
    'Recommandation praticien',
    'Suite à un salon',
    'Autre',
  ],
}

export interface Region {
  id: string
  nom: string
}

/** Les deux maisons qui echangent des leads. */
export type Organisation = 'alyxa' | 'septodont'

export const LIBELLE_ORGANISATION: Record<Organisation, string> = {
  alyxa: 'Alyxa',
  septodont: 'Septodont',
}

/**
 * Une personne qui utilise l'outil. Sa couleur l'identifie dans les
 * discussions : on reconnait qui parle avant meme d'avoir lu le nom.
 */
export interface Membre {
  id: string
  nom: string
  organisation: Organisation
  couleur: string
}

/**
 * Palette des avatars. Volontairement distincte des couleurs de sens pour
 * qu'un rond de personne ne se confonde jamais avec un badge de direction.
 * Toutes ces teintes portent du texte blanc lisible.
 */
export const COULEURS_MEMBRE = [
  '#4a3aa7', // violet
  '#0f7a55', // vert profond
  '#b8461c', // terracotta
  '#1c5cab', // bleu profond
  '#96407a', // magenta profond
  '#2f6f7d', // sarcelle
  '#8a6d1f', // ocre
  '#a33a3a', // brique
]

/** Initiales affichees dans l'avatar. */
export const initiales = (nom: string): string =>
  nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase() ?? '')
    .join('')

/**
 * Une entree du fil d'un lead : un message de la discussion, ou un changement
 * de statut. Les deux vivent dans le meme fil chronologique — c'est ce qui
 * permet de relire l'histoire complete du lead en un seul coup d'oeil.
 */
export interface Evenement {
  id: string
  date: string
  auteurId: string
  type: 'statut' | 'message'
  /** Renseigne pour un changement de statut. */
  statut?: Statut
  /** Renseigne pour un message. */
  texte?: string
}

export interface Lead {
  id: string
  sens: Sens
  /** Cabinet, clinique ou structure concernee. */
  structure: string
  /** Praticien ou interlocuteur principal. */
  contact: string
  telephone: string
  email: string
  ville: string
  codePostal: string
  regionId: string
  /** Pourquoi ce lead a ete transmis. */
  motif: string
  /** Membre qui a fait passer le lead, d'un cote comme de l'autre. */
  transmisParId: string
  /** Horodatage de transmission : la reference en cas de desaccord sur un volume. */
  transmisLe: string
  statut: Statut
  /** Fil complet du lead — messages et changements de statut — du plus ancien au plus recent. */
  fil: Evenement[]
}

/** Derniere activite connue sur un lead, quel qu'en soit le type. */
export const dernierMouvement = (lead: Lead): string =>
  lead.fil.length ? lead.fil[lead.fil.length - 1].date : lead.transmisLe

/** Messages seuls, sans les changements de statut. */
export const messages = (lead: Lead): Evenement[] => lead.fil.filter((e) => e.type === 'message')

/** Messages postes apres la date de lecture, hors messages de la personne elle-meme. */
export function nonLus(lead: Lead, luJusqua: string | undefined, membreId: string): number {
  return lead.fil.filter(
    (e) => e.type === 'message' && e.auteurId !== membreId && (!luJusqua || e.date > luJusqua),
  ).length
}
