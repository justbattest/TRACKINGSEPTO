/**
 * Statistiques de l'echange. Fonctions pures, aucun effet de bord.
 *
 * La question centrale n'est pas « combien de leads », c'est « est-ce que
 * l'echange est equilibre et est-ce qu'il produit quelque chose des deux
 * cotes ». Tout ici sert a repondre a ca.
 */
import { dernieresPeriodes, periodeDe, type Periode } from './dates'
import {
  AUTRE,
  dernierMouvement,
  estClos,
  nonLus,
  STATUTS_ENTONNOIR,
  type Lead,
  type Organisation,
  type Statut,
} from './types'

/** Bilan des leads transmis par une maison donnee. */
export interface Bilan {
  /** Maison qui a transmis ces leads. */
  origine: Organisation
  total: number
  /** Transmis pendant le mois en cours. */
  ceMois: number
  /** Transmis pendant le mois precedent, pour comparer. */
  moisPrecedent: number
  convertis: number
  tauxConversion: number
  /** Leads encore au statut « transmis », donc non pris en charge. */
  enAttente: number
  /** Leads en cours de traitement, ni convertis ni abandonnes. */
  enCours: number
  sansSuite: number
  /** Delai median entre transmission et premiere prise de contact, en jours. */
  delaiMedianContact: number | null
}

function median(valeurs: number[]): number | null {
  if (!valeurs.length) return null
  const tries = [...valeurs].sort((a, b) => a - b)
  const milieu = Math.floor(tries.length / 2)
  return tries.length % 2 ? tries[milieu] : Math.round((tries[milieu - 1] + tries[milieu]) / 2)
}

/** Delai, en jours, entre la transmission et la sortie du statut « transmis ». */
export function delaiPriseEnCharge(lead: Lead): number | null {
  const priseEnCharge = lead.fil.find((e) => e.type === 'statut' && e.statut !== 'transmis')
  if (!priseEnCharge) return null
  return Math.max(0, Math.round((+new Date(priseEnCharge.date) - +new Date(lead.transmisLe)) / 86400000))
}

export function bilan(leads: Lead[], origine: Organisation, maintenant: Date = new Date()): Bilan {
  const lot = leads.filter((l) => l.origine === origine)
  const moisCourant = periodeDe(maintenant)
  const [moisPrecedent] = dernieresPeriodes(2, moisCourant)
  const convertis = lot.filter((l) => l.statut === 'converti').length
  const delais = lot.map(delaiPriseEnCharge).filter((d): d is number => d !== null)

  return {
    origine,
    total: lot.length,
    ceMois: lot.filter((l) => periodeDe(l.transmisLe) === moisCourant).length,
    moisPrecedent: lot.filter((l) => periodeDe(l.transmisLe) === moisPrecedent).length,
    convertis,
    tauxConversion: lot.length ? convertis / lot.length : 0,
    enAttente: lot.filter((l) => l.statut === 'transmis').length,
    enCours: lot.filter((l) => !estClos(l.statut)).length,
    sansSuite: lot.filter((l) => l.statut === 'sans_suite').length,
    delaiMedianContact: median(delais),
  }
}

/** Etat de la reciprocite, vu depuis la maison `mienne`. */
export interface Equilibre {
  envoyes: number
  recus: number
  /** Positif quand `mienne` envoie plus qu'elle ne recoit. */
  ecart: number
  /** Part des leads envoyes par `mienne` dans le total echange, entre 0 et 1. */
  partEnvoyee: number
}

export function equilibre(leads: Lead[], mienne: Organisation): Equilibre {
  const envoyes = leads.filter((l) => l.origine === mienne).length
  const recus = leads.filter((l) => l.origine === AUTRE[mienne]).length
  const total = envoyes + recus
  return {
    envoyes,
    recus,
    ecart: envoyes - recus,
    partEnvoyee: total ? envoyes / total : 0.5,
  }
}

export interface LigneMois {
  periode: Periode
  envoyes: number
  recus: number
}

export function serieMensuelle(
  leads: Lead[],
  mienne: Organisation,
  nbMois = 6,
  fin: Date = new Date(),
): LigneMois[] {
  return dernieresPeriodes(nbMois, periodeDe(fin)).map((periode) => {
    const duMois = leads.filter((l) => periodeDe(l.transmisLe) === periode)
    return {
      periode,
      envoyes: duMois.filter((l) => l.origine === mienne).length,
      recus: duMois.filter((l) => l.origine !== mienne).length,
    }
  })
}

export interface EtapeEntonnoir {
  statut: Statut
  atteint: number
  taux: number
}

/** Entonnoir cumulatif : un lead converti compte aussi dans « contacté ». */
export function entonnoir(leads: Lead[]): EtapeEntonnoir[] {
  const entres = leads.length || 1
  return STATUTS_ENTONNOIR.map((statut) => {
    const atteint = leads.filter((l) => l.fil.some((e) => e.statut === statut)).length
    return { statut, atteint, taux: atteint / entres }
  })
}

export interface Repartition {
  cle: string
  total: number
  convertis: number
}

/** Regroupe des leads par une de leurs proprietes textuelles. */
export function repartir(leads: Lead[], cle: (l: Lead) => string): Repartition[] {
  const map = new Map<string, Repartition>()
  for (const lead of leads) {
    const valeur = cle(lead) || '—'
    const ligne = map.get(valeur) ?? { cle: valeur, total: 0, convertis: 0 }
    ligne.total += 1
    if (lead.statut === 'converti') ligne.convertis += 1
    map.set(valeur, ligne)
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
}

/**
 * Leads sans mouvement depuis plus de `jours` jours et non clos.
 * Les plus anciens d'abord : c'est la liste a traiter en premier.
 */
export function leadsDormants(leads: Lead[], jours = 7, maintenant: Date = new Date()): Lead[] {
  const limite = +maintenant - jours * 86400000
  return leads
    .filter((l) => !estClos(l.statut) && +new Date(dernierMouvement(l)) < limite)
    .sort((a, b) => +new Date(dernierMouvement(a)) - +new Date(dernierMouvement(b)))
}

/** Nombre de jours depuis le dernier mouvement. */
export const joursDepuis = (date: string, maintenant: Date = new Date()): number =>
  Math.floor((+maintenant - +new Date(date)) / 86400000)

/** Leads portant au moins un message non lu, les plus recents d'abord. */
export function leadsNonLus(
  leads: Lead[],
  lectures: Record<string, string>,
  membreId: string,
): { lead: Lead; nonLus: number }[] {
  return leads
    .map((lead) => ({ lead, nonLus: nonLus(lead, lectures[lead.id], membreId) }))
    .filter((l) => l.nonLus > 0)
    .sort((a, b) => +new Date(dernierMouvement(b.lead)) - +new Date(dernierMouvement(a.lead)))
}
