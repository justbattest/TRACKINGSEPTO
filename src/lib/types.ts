/**
 * Modele de l'echange de leads Alyxa <-> Septodont.
 *
 * Un seul objet : le lead. Il porte l'apporteur qui l'a amene — d'ou se deduit
 * l'equipe a qui il est compte — et suit le meme parcours des deux cotes. Le sens — envoye ou recu — n'est jamais stocke :
 * il se deduit de qui regarde, pour que les deux equipes voient la meme base
 * depuis leur propre point de vue. Pas de contrat, pas de commission : c'est un
 * echange, on compte ce qui circule et ce que ca donne.
 */

/** Les deux maisons qui echangent des leads. */
export type Organisation = 'alyxa' | 'septodont'

export const LIBELLE_ORGANISATION: Record<Organisation, string> = {
  alyxa: 'Alyxa',
  septodont: 'Septodont',
}

/**
 * Sens de circulation, TOUJOURS relatif a celui qui regarde. Un lead qu'Alyxa
 * envoie est, pour Septodont, un lead recu : c'est le meme lead, lu des deux
 * bouts. On ne stocke donc jamais le sens, seulement son origine.
 */
export type Sens = 'envoye' | 'recu'

export const SENS: Sens[] = ['envoye', 'recu']

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
 * Motifs proposes, ranges par maison DESTINATAIRE : un lead qui part chez
 * Septodont porte un motif Septodont. Liste courte et fermee, c'est ce qui rend
 * les statistiques exploitables ; « Autre » laisse la porte ouverte.
 */
export const MOTIFS: Record<Organisation, string[]> = {
  septodont: [
    'Division chirurgie',
    'Implantologie',
    'Anesthésie',
    'Consommables',
    'Équipement',
    'Autre',
  ],
  alyxa: [
    'Intéressé par Alyxa',
    'Démo demandée',
    'Recommandation praticien',
    'Suite à un salon',
    'Autre',
  ],
}

/** L'autre maison du partenariat. */
export const AUTRE: Record<Organisation, Organisation> = {
  alyxa: 'septodont',
  septodont: 'alyxa',
}

/** Le sens d'un lead, tel que le voit la maison `mienne`. */
export const sensPour = (lead: { origine: Organisation }, mienne: Organisation): Sens =>
  lead.origine === mienne ? 'envoye' : 'recu'

/** La maison qui recoit le lead, et donc qui le prend en charge. */
export const destinataire = (lead: { origine: Organisation }): Organisation => AUTRE[lead.origine]

/** « de Septodont », « d'Alyxa » : elision devant une voyelle. */
export const deLaMaison = (organisation: Organisation): string => {
  const nom = LIBELLE_ORGANISATION[organisation]
  return /^[aeiouyàâéèêîôû]/i.test(nom) ? `d’${nom}` : `de ${nom}`
}

/** Libelle complet du sens, du point de vue de la maison `mienne`. */
export function libelleSens(sens: Sens, mienne: Organisation): string {
  const autre = AUTRE[mienne]
  return sens === 'envoye'
    ? `Envoyé à ${LIBELLE_ORGANISATION[autre]}`
    : `Reçu ${deLaMaison(autre)}`
}

/** Formulation courte pour les tableaux et les filtres. */
export const LIBELLE_SENS_COURT: Record<Sens, string> = {
  envoye: 'Envoyé',
  recu: 'Reçu',
}

export interface Region {
  id: string
  nom: string
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
 * Une entree du fil d'un lead : un message de la discussion, un changement de
 * statut, ou une correction de la fiche. Les trois vivent dans le meme fil
 * chronologique — c'est ce qui permet de relire l'histoire complete du lead en
 * un seul coup d'oeil, et de savoir qui a corrige quoi.
 */
export type TypeEvenement = 'statut' | 'message' | 'modification'

export interface Evenement {
  id: string
  date: string
  auteurId: string
  type: TypeEvenement
  /** Renseigne pour un changement de statut. */
  statut?: Statut
  /** Renseigne pour un message ou le resume d'une correction. */
  texte?: string
}

export interface Lead {
  id: string
  /**
   * Maison d'ou vient le lead. Absolu : le sens s'en deduit par lecteur.
   * Derive de l'equipe de l'apporteur, jamais saisi a la main.
   */
  origine: Organisation
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
  /** Membre qui a AMENE le lead. C'est lui qui fixe `origine`. */
  apporteParId: string
  /** Membre qui a SAISI le lead dans l'outil. Tracabilite seule. */
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

/** Messages seuls, sans les changements de statut ni les corrections. */
export const messages = (lead: Lead): Evenement[] => lead.fil.filter((e) => e.type === 'message')

/** Messages postes apres la date de lecture, hors messages de la personne elle-meme. */
export function nonLus(lead: Lead, luJusqua: string | undefined, membreId: string): number {
  return lead.fil.filter(
    (e) => e.type === 'message' && e.auteurId !== membreId && (!luJusqua || e.date > luJusqua),
  ).length
}
