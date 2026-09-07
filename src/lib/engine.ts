/**
 * Moteur financier : c'est le seul endroit ou l'argent se calcule.
 *
 * Regle metier Septodont :
 *   1. Le cabinet qui souscrit via Septodont beneficie de -10% sur le prix catalogue.
 *   2. Le commercial Septodont qui a apporte le lead touche 15% du prix REELLEMENT
 *      paye par le cabinet, chaque mois.
 *   3. La commission court sur la duree d'engagement souscrite (1 mois pour un
 *      abonnement mensuel, 12 mois pour un annuel), plafonnee a 12 mois, et
 *      s'arrete immediatement si le cabinet resilie.
 */
import type { Commission, Contrat, Plan, Reglages } from './types'
import { REGLAGES_DEFAUT } from './types'
import { ajouterMois, moisEcoules, periodeDe, type Periode } from './dates'

/** Arrondi au centime, pour que les totaux affiches soient les totaux payes. */
export const centimes = (n: number): number => Math.round(n * 100) / 100

/** Cascade de prix d'un contrat : catalogue -> remise -> commission -> net Alyxa. */
export interface Cascade {
  prixCatalogue: number
  remise: number
  prixPaye: number
  commission: number
  netAlyxa: number
  moisCommissionnes: number
  /** Cout d'acquisition total (remise + commission) sur la duree commissionnee. */
  coutTotal: number
  /** Encaissement total sur la duree commissionnee. */
  revenuTotal: number
}

export function cascade(contrat: Contrat, plafondMois = REGLAGES_DEFAUT.plafondMois): Cascade {
  const prixCatalogue = contrat.prixCatalogue
  const remise = centimes(prixCatalogue * contrat.tauxRemise)
  const prixPaye = centimes(prixCatalogue - remise)
  const commission = centimes(prixPaye * contrat.tauxCommission)
  const moisCommissionnes = Math.min(contrat.moisEngagement, plafondMois)
  return {
    prixCatalogue,
    remise,
    prixPaye,
    commission,
    netAlyxa: centimes(prixPaye - commission),
    moisCommissionnes,
    coutTotal: centimes((remise + commission) * moisCommissionnes),
    revenuTotal: centimes(prixPaye * moisCommissionnes),
  }
}

/** Simulation a la volee, sans contrat existant (utilisee par le simulateur). */
export function simuler(plan: Plan, reglages: Reglages = REGLAGES_DEFAUT): Cascade {
  return cascade(
    {
      id: 'sim',
      leadId: 'sim',
      plan,
      prixCatalogue: reglages.prixCatalogue[plan],
      tauxRemise: reglages.tauxRemise,
      tauxCommission: reglages.tauxCommission,
      moisEngagement: plan === 'annuel' ? 12 : 1,
      debutLe: new Date().toISOString(),
    },
    reglages.plafondMois,
  )
}

/**
 * Genere l'echeancier complet des commissions d'un contrat.
 *
 * Une ligne par mois commissionne. Une echeance posterieure a la resiliation est
 * marquee `annulee` : elle reste visible (tracabilite) mais ne compte dans aucun
 * total a payer.
 */
export function echeancier(
  contrat: Contrat,
  commercialId: string,
  reglages: Reglages = REGLAGES_DEFAUT,
  deja: Commission[] = [],
  maintenant: Date = new Date(),
): Commission[] {
  const { commission, moisCommissionnes } = cascade(contrat, reglages.plafondMois)
  const payees = new Map(deja.filter((c) => c.statut === 'payee').map((c) => [c.periode, c]))

  return Array.from({ length: moisCommissionnes }, (_, i) => {
    const debutPeriode = ajouterMois(contrat.debutLe, i)
    const periode = periodeDe(debutPeriode)
    const dejaPayee = payees.get(periode)

    let statut: Commission['statut']
    if (dejaPayee) {
      statut = 'payee'
    } else if (contrat.churnLe && debutPeriode >= new Date(contrat.churnLe)) {
      statut = 'annulee'
    } else if (debutPeriode > maintenant) {
      statut = 'prevue'
    } else {
      statut = 'a_payer'
    }

    return {
      id: `${contrat.id}-${periode}`,
      contratId: contrat.id,
      commercialId,
      periode,
      montant: commission,
      statut,
      payeeLe: dejaPayee?.payeeLe ?? null,
    }
  })
}

/** Le contrat est-il encore actif a la date donnee ? */
export function estActif(contrat: Contrat, maintenant: Date = new Date()): boolean {
  if (contrat.churnLe && new Date(contrat.churnLe) <= maintenant) return false
  return new Date(contrat.debutLe) <= maintenant
}

/** Nombre de mois de vie du contrat, borne a la resiliation ou a aujourd'hui. */
export function dureeDeVie(contrat: Contrat, maintenant: Date = new Date()): number {
  const fin = contrat.churnLe ? new Date(contrat.churnLe) : maintenant
  return Math.max(0, moisEcoules(contrat.debutLe, fin))
}

/** Revenu recurrent mensuel encaisse, hors contrats resilies. */
export function mrr(contrats: Contrat[], maintenant: Date = new Date()): number {
  return centimes(
    contrats
      .filter((c) => estActif(c, maintenant))
      .reduce((total, c) => total + cascade(c).prixPaye, 0),
  )
}

/** Marge recurrente mensuelle : ce qui reste a Alyxa apres commission. */
export function margeMensuelle(contrats: Contrat[], maintenant: Date = new Date()): number {
  return centimes(
    contrats.filter((c) => estActif(c, maintenant)).reduce((t, c) => t + cascade(c).netAlyxa, 0),
  )
}

/** Total des commissions d'un lot, filtre sur un ou plusieurs statuts. */
export function total(commissions: Commission[], statuts: Commission['statut'][]): number {
  return centimes(
    commissions.filter((c) => statuts.includes(c.statut)).reduce((t, c) => t + c.montant, 0),
  )
}

/** Regroupe les commissions par periode (AAAA-MM). */
export function parPeriode(commissions: Commission[]): Map<Periode, Commission[]> {
  const map = new Map<Periode, Commission[]>()
  for (const c of commissions) {
    const lot = map.get(c.periode)
    if (lot) lot.push(c)
    else map.set(c.periode, [c])
  }
  return map
}

export const euros = (n: number): string =>
  n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })

export const eurosCourt = (n: number): string =>
  n >= 10000
    ? `${(n / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} k€`
    : n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

export const pourcent = (n: number, decimales = 0): string =>
  `${(n * 100).toLocaleString('fr-FR', { maximumFractionDigits: decimales })} %`
