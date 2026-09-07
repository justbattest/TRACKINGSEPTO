/**
 * Etat applicatif unique.
 *
 * En mode demo, tout est conserve dans le navigateur (localStorage) : l'outil
 * fonctionne immediatement, sans installation ni compte. Le jour ou la base
 * Supabase est branchee, seules les fonctions de ce fichier changent — les
 * pages et le moteur de calcul restent identiques.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { echeancier } from './engine'
import { genererDemo } from '@/data/seed'
import {
  REGLAGES_DEFAUT,
  type Commercial,
  type Commission,
  type Contrat,
  type Etape,
  type Lead,
  type Region,
  type Reglages,
} from './types'

const CLE_STOCKAGE = 'tracking-septo:v1'

interface EtatPersiste {
  leads: Lead[]
  contrats: Contrat[]
  commerciaux: Commercial[]
  regions: Region[]
  reglages: Reglages
  /** Commissions marquees payees : { "contratId-AAAA-MM": date de paiement }. */
  paiements: Record<string, string>
}

function etatInitial(): EtatPersiste {
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE)
    if (brut) return JSON.parse(brut) as EtatPersiste
  } catch {
    // Stockage indisponible (navigation privee) : on repart des donnees de demo.
  }
  const demo = genererDemo()
  return { ...demo, reglages: REGLAGES_DEFAUT, paiements: {} }
}

function persister(etat: EtatPersiste) {
  try {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(etat))
  } catch {
    // Echec silencieux : l'app reste utilisable pour la session en cours.
  }
}

export interface Contexte extends EtatPersiste {
  /** Toutes les echeances de commission, recalculees a chaque rendu. */
  commissions: Commission[]
  regionDe: (id: string) => string
  commercialDe: (id: string) => Commercial | undefined
  leadDe: (id: string) => Lead | undefined
  contratDuLead: (leadId: string) => Contrat | undefined
  ajouterLead: (lead: Omit<Lead, 'id' | 'historique' | 'etape' | 'recuLe'>) => void
  changerEtape: (leadId: string, etape: Etape, contrat?: { plan: Contrat['plan'] }) => void
  declarerChurn: (contratId: string, date: string) => void
  basculerPaiement: (commission: Commission) => void
  payerPeriode: (periode: string) => void
  majReglages: (reglages: Reglages) => void
  reinitialiser: () => void
}

const Ctx = createContext<Contexte | null>(null)

export function Fournisseur({ children }: { children: ReactNode }) {
  const [etat, setEtat] = useState<EtatPersiste>(etatInitial)

  const modifier = useCallback((suite: (e: EtatPersiste) => EtatPersiste) => {
    setEtat((actuel) => {
      const suivant = suite(actuel)
      persister(suivant)
      return suivant
    })
  }, [])

  const commissions = useMemo(() => {
    const lignes: Commission[] = []
    for (const contrat of etat.contrats) {
      const lead = etat.leads.find((l) => l.id === contrat.leadId)
      if (!lead) continue
      const dejaPayees = Object.entries(etat.paiements)
        .filter(([cle]) => cle.startsWith(`${contrat.id}-`))
        .map(([cle, date]) => ({
          id: cle,
          contratId: contrat.id,
          commercialId: lead.commercialId,
          periode: cle.slice(contrat.id.length + 1),
          montant: 0,
          statut: 'payee' as const,
          payeeLe: date,
        }))
      lignes.push(...echeancier(contrat, lead.commercialId, etat.reglages, dejaPayees))
    }
    return lignes
  }, [etat.contrats, etat.leads, etat.paiements, etat.reglages])

  const valeur = useMemo<Contexte>(() => {
    const parRegion = new Map(etat.regions.map((r) => [r.id, r.nom]))
    const parCommercial = new Map(etat.commerciaux.map((c) => [c.id, c]))
    const parLead = new Map(etat.leads.map((l) => [l.id, l]))

    return {
      ...etat,
      commissions,
      regionDe: (id) => parRegion.get(id) ?? '—',
      commercialDe: (id) => parCommercial.get(id),
      leadDe: (id) => parLead.get(id),
      contratDuLead: (leadId) => etat.contrats.find((c) => c.leadId === leadId),

      ajouterLead: (lead) =>
        modifier((e) => {
          const maintenant = new Date().toISOString()
          const nouveau: Lead = {
            ...lead,
            id: `l${Date.now()}`,
            etape: 'nouveau',
            recuLe: maintenant,
            historique: [{ date: maintenant, etape: 'nouveau', auteur: 'Saisie manuelle' }],
          }
          return { ...e, leads: [nouveau, ...e.leads] }
        }),

      changerEtape: (leadId, etape, options) =>
        modifier((e) => {
          const maintenant = new Date().toISOString()
          const leads = e.leads.map((l) =>
            l.id === leadId
              ? { ...l, etape, historique: [...l.historique, { date: maintenant, etape, auteur: 'Utilisateur' }] }
              : l,
          )
          let contrats = e.contrats
          // Passer un lead en "signé" cree son contrat, et donc son echeancier.
          if (etape === 'signe' && !contrats.some((c) => c.leadId === leadId)) {
            const plan = options?.plan ?? 'annuel'
            contrats = [
              ...contrats,
              {
                id: `k${Date.now()}`,
                leadId,
                plan,
                prixCatalogue: e.reglages.prixCatalogue[plan],
                tauxRemise: e.reglages.tauxRemise,
                tauxCommission: e.reglages.tauxCommission,
                moisEngagement: plan === 'annuel' ? 12 : 1,
                debutLe: maintenant,
                churnLe: null,
              },
            ]
          }
          return { ...e, leads, contrats }
        }),

      declarerChurn: (contratId, date) =>
        modifier((e) => {
          const contrat = e.contrats.find((c) => c.id === contratId)
          return {
            ...e,
            contrats: e.contrats.map((c) => (c.id === contratId ? { ...c, churnLe: date } : c)),
            leads: contrat
              ? e.leads.map((l) =>
                  l.id === contrat.leadId
                    ? { ...l, etape: 'churn' as Etape, historique: [...l.historique, { date, etape: 'churn' as Etape, auteur: 'Utilisateur' }] }
                    : l,
                )
              : e.leads,
          }
        }),

      basculerPaiement: (commission) =>
        modifier((e) => {
          const paiements = { ...e.paiements }
          if (paiements[commission.id]) delete paiements[commission.id]
          else paiements[commission.id] = new Date().toISOString()
          return { ...e, paiements }
        }),

      payerPeriode: (periode) =>
        modifier((e) => {
          const paiements = { ...e.paiements }
          const maintenant = new Date().toISOString()
          for (const c of commissions) {
            if (c.periode === periode && c.statut === 'a_payer') paiements[c.id] = maintenant
          }
          return { ...e, paiements }
        }),

      majReglages: (reglages) => modifier((e) => ({ ...e, reglages })),

      reinitialiser: () =>
        modifier(() => ({ ...genererDemo(), reglages: REGLAGES_DEFAUT, paiements: {} })),
    }
  }, [etat, commissions, modifier])

  return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>
}

export function useStore(): Contexte {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore doit être utilisé dans <Fournisseur>')
  return ctx
}
