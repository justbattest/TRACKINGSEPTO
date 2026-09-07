/** Calculs d'agregation consommes par les pages. Aucun effet de bord. */
import { cascade, centimes, estActif, licencesActives, total } from './engine'
import { dernieresPeriodes, moisEcoules, periodeDe, type Periode } from './dates'
import { ETAPES_ENTONNOIR, type Commercial, type Commission, type Contrat, type Etape, type Lead } from './types'

export interface LigneMois {
  periode: Periode
  leads: number
  signatures: number
  /** Encaissement du mois, remise deduite. */
  encaisse: number
  /** Part reversee aux commerciaux Septodont sur ce mois. */
  commission: number
  /** Ce qui reste a Alyxa. */
  net: number
}

/** Le contrat genere-t-il du chiffre sur cette periode ? */
function actifSur(contrat: Contrat, periode: Periode): boolean {
  const debut = periodeDe(contrat.debutLe)
  if (periode < debut) return false
  if (contrat.churnLe && periode >= periodeDe(contrat.churnLe)) return false
  return true
}

export function serieMensuelle(
  leads: Lead[],
  contrats: Contrat[],
  commissions: Commission[],
  nbMois = 9,
): LigneMois[] {
  const periodes = dernieresPeriodes(nbMois, periodeDe(new Date()))
  return periodes.map((periode) => {
    const encaisse = centimes(
      contrats.filter((c) => actifSur(c, periode)).reduce((t, c) => t + cascade(c).prixPaye, 0),
    )
    const commission = centimes(
      commissions
        .filter((c) => c.periode === periode && c.statut !== 'annulee')
        .reduce((t, c) => t + c.montant, 0),
    )
    return {
      periode,
      leads: leads.filter((l) => periodeDe(l.recuLe) === periode).length,
      signatures: contrats.filter((c) => periodeDe(c.debutLe) === periode).length,
      encaisse,
      commission,
      net: centimes(encaisse - commission),
    }
  })
}

export interface EtapeEntonnoir {
  etape: Etape
  /** Leads ayant atteint cette etape au moins une fois. */
  atteint: number
  /** Part des leads entres qui ont atteint cette etape. */
  taux: number
}

/**
 * Entonnoir cumulatif : un lead signe compte aussi dans « contacté ».
 * C'est la seule lecture qui permet de voir ou ca decroche.
 */
export function entonnoir(leads: Lead[]): EtapeEntonnoir[] {
  const entres = leads.length || 1
  return ETAPES_ENTONNOIR.map((etape) => {
    const atteint = leads.filter((l) => l.historique.some((h) => h.etape === etape)).length
    return { etape, atteint, taux: atteint / entres }
  })
}

export interface PerfCommercial {
  commercial: Commercial
  leads: number
  signatures: number
  tauxConversion: number
  /** Postes de praticien actuellement equipes grace a lui. */
  licencesApportees: number
  /** Revenu mensuel recurrent apporte, remise deduite. */
  mrrApporte: number
  commissionsDues: number
  commissionsPayees: number
  /** Total qu'il touchera sur toute la duree des contrats en cours. */
  gainTotal: number
  /** Delai median entre reception du lead et signature, en jours. */
  delaiSignature: number | null
}

export function perfCommerciaux(
  commerciaux: Commercial[],
  leads: Lead[],
  contrats: Contrat[],
  commissions: Commission[],
): PerfCommercial[] {
  return commerciaux
    .map((commercial) => {
      const siens = leads.filter((l) => l.commercialId === commercial.id)
      const idsSiens = new Set(siens.map((l) => l.id))
      const contratsSiens = contrats.filter((c) => idsSiens.has(c.leadId))
      const commissionsSiennes = commissions.filter((c) => c.commercialId === commercial.id)

      const delais = contratsSiens
        .map((c) => {
          const lead = siens.find((l) => l.id === c.leadId)
          return lead ? Math.round((+new Date(c.debutLe) - +new Date(lead.recuLe)) / 86400000) : null
        })
        .filter((d): d is number => d !== null)
        .sort((a, b) => a - b)

      return {
        commercial,
        leads: siens.length,
        signatures: contratsSiens.length,
        tauxConversion: siens.length ? contratsSiens.length / siens.length : 0,
        licencesApportees: licencesActives(contratsSiens),
        mrrApporte: centimes(
          contratsSiens.filter((c) => estActif(c)).reduce((t, c) => t + cascade(c).prixPaye, 0),
        ),
        commissionsDues: total(commissionsSiennes, ['a_payer']),
        commissionsPayees: total(commissionsSiennes, ['payee']),
        gainTotal: total(commissionsSiennes, ['a_payer', 'payee', 'prevue']),
        delaiSignature: delais.length ? delais[Math.floor(delais.length / 2)] : null,
      }
    })
    .sort((a, b) => b.mrrApporte - a.mrrApporte || b.signatures - a.signatures)
}

export interface PerfRegion {
  regionId: string
  nom: string
  leads: number
  signatures: number
  tauxConversion: number
  licences: number
  mrrApporte: number
}

export function perfRegions(
  regions: { id: string; nom: string }[],
  leads: Lead[],
  contrats: Contrat[],
): PerfRegion[] {
  return regions
    .map((region) => {
      const siens = leads.filter((l) => l.regionId === region.id)
      const ids = new Set(siens.map((l) => l.id))
      const contratsRegion = contrats.filter((c) => ids.has(c.leadId))
      return {
        regionId: region.id,
        nom: region.nom,
        leads: siens.length,
        signatures: contratsRegion.length,
        tauxConversion: siens.length ? contratsRegion.length / siens.length : 0,
        licences: licencesActives(contratsRegion),
        mrrApporte: centimes(
          contratsRegion.filter((c) => estActif(c)).reduce((t, c) => t + cascade(c).prixPaye, 0),
        ),
      }
    })
    .sort((a, b) => b.leads - a.leads)
}

/** Leads sans mouvement depuis plus de `jours` jours et non clotures. */
export function leadsDormants(leads: Lead[], jours = 7): Lead[] {
  const limite = Date.now() - jours * 86400000
  return leads
    .filter(
      (l) =>
        !['signe', 'perdu', 'churn'].includes(l.etape) &&
        +new Date(l.historique[l.historique.length - 1].date) < limite,
    )
    .sort(
      (a, b) =>
        +new Date(a.historique[a.historique.length - 1].date) -
        +new Date(b.historique[b.historique.length - 1].date),
    )
}

/** Taux de resiliation sur les contrats ayant au moins 3 mois d'anciennete. */
export function tauxChurn(contrats: Contrat[]): number {
  const eligibles = contrats.filter((c) => moisEcoules(c.debutLe, new Date()) >= 3)
  if (!eligibles.length) return 0
  return eligibles.filter((c) => c.churnLe).length / eligibles.length
}
