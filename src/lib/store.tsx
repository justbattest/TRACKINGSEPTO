/**
 * Etat applicatif unique.
 *
 * En mode demonstration, tout vit dans le navigateur (localStorage) : l'outil
 * fonctionne sans compte ni installation. Quand la base sera branchee, seules
 * les fonctions de ce fichier changeront — les pages resteront identiques.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { genererDemo, MEMBRES } from '@/data/seed'
import {
  COULEURS_MEMBRE,
  dernierMouvement,
  type Evenement,
  type Lead,
  type Membre,
  type Organisation,
  type Region,
  type Statut,
} from './types'

const CLE_STOCKAGE = 'echange-septodont:v1'

/** Champs saisis a la creation d'un lead. */
export type NouveauLead = Omit<Lead, 'id' | 'statut' | 'fil' | 'transmisLe'> & {
  transmisLe?: string
}

interface EtatPersiste {
  leads: Lead[]
  regions: Region[]
  membres: Membre[]
  /** Membre connecte. Vide tant que personne ne s'est identifie. */
  membreId: string
  /** Date de derniere lecture du fil, par lead : sert a compter les non-lus. */
  lectures: Record<string, string>
}

function etatInitial(): EtatPersiste {
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE)
    if (brut) return JSON.parse(brut) as EtatPersiste
  } catch {
    // Stockage indisponible (navigation privee) : on repart de la demo.
  }
  return { ...genererDemo(), membreId: '', lectures: {} }
}

/**
 * Etat de lecture a la connexion : tout ce qui date de plus de trois jours est
 * considere comme deja vu, le reste apparait comme nouveau. C'est ce qui se
 * passe quand on revient sur l'outil apres quelques jours d'absence.
 */
const FENETRE_NON_LUS = 3 * 86400000

function lecturesAJour(leads: Lead[], maintenant: Date = new Date()): Record<string, string> {
  const seuil = new Date(+maintenant - FENETRE_NON_LUS).toISOString()
  const lectures: Record<string, string> = {}
  for (const lead of leads) {
    const dernierVu = [...lead.fil].reverse().find((e) => e.date <= seuil)
    // Sans evenement anterieur au seuil, tout le fil est nouveau.
    if (dernierVu) lectures[lead.id] = dernierVu.date
  }
  return lectures
}

function persister(etat: EtatPersiste) {
  try {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(etat))
  } catch {
    // Echec silencieux : l'app reste utilisable pour la session en cours.
  }
}

export interface Contexte extends EtatPersiste {
  /** Membre connecte, ou undefined tant que personne ne s'est identifie. */
  moi: Membre | undefined
  regionDe: (id: string) => string
  leadDe: (id: string) => Lead | undefined
  membreDe: (id: string) => Membre | undefined
  membresDe: (organisation: Organisation) => Membre[]
  ajouterLead: (lead: NouveauLead, message?: string) => void
  modifierLead: (id: string, champs: Partial<NouveauLead>) => void
  changerStatut: (id: string, statut: Statut) => void
  envoyerMessage: (id: string, texte: string) => void
  marquerLu: (id: string) => void
  supprimerLead: (id: string) => void
  seConnecter: (membreId: string) => void
  creerMembre: (nom: string, organisation: Organisation) => void
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

  /** Ajoute une entree au fil d'un lead sans jamais toucher aux precedentes. */
  const ajouterAuFil = useCallback(
    (etatCourant: EtatPersiste, id: string, entree: Omit<Evenement, 'id' | 'date' | 'auteurId'>, statut?: Statut): Lead[] =>
      etatCourant.leads.map((l) =>
        l.id === id
          ? {
              ...l,
              statut: statut ?? l.statut,
              fil: [
                ...l.fil,
                {
                  ...entree,
                  id: `e${Date.now()}-${l.fil.length}`,
                  date: new Date().toISOString(),
                  auteurId: etatCourant.membreId,
                },
              ],
            }
          : l,
      ),
    [],
  )

  const valeur = useMemo<Contexte>(() => {
    const parRegion = new Map(etat.regions.map((r) => [r.id, r.nom]))
    const parLead = new Map(etat.leads.map((l) => [l.id, l]))
    const parMembre = new Map(etat.membres.map((m) => [m.id, m]))

    return {
      ...etat,
      moi: parMembre.get(etat.membreId),
      regionDe: (id) => parRegion.get(id) ?? '—',
      leadDe: (id) => parLead.get(id),
      membreDe: (id) => parMembre.get(id),
      membresDe: (organisation) => etat.membres.filter((m) => m.organisation === organisation),

      ajouterLead: (lead, message) =>
        modifier((e) => {
          const transmisLe = lead.transmisLe ?? new Date().toISOString()
          const fil: Evenement[] = [
            { id: `e${Date.now()}-0`, date: transmisLe, type: 'statut', statut: 'transmis', auteurId: e.membreId },
          ]
          // Le mot d'accompagnement ouvre la discussion des la transmission.
          if (message?.trim()) {
            fil.push({
              id: `e${Date.now()}-1`,
              date: new Date(+new Date(transmisLe) + 1000).toISOString(),
              type: 'message',
              texte: message.trim(),
              auteurId: e.membreId,
            })
          }
          const nouveau: Lead = { ...lead, transmisLe, id: `l${Date.now()}`, statut: 'transmis', fil }
          return { ...e, leads: [nouveau, ...e.leads] }
        }),

      modifierLead: (id, champs) =>
        modifier((e) => ({
          ...e,
          leads: e.leads.map((l) => (l.id === id ? { ...l, ...champs } : l)),
        })),

      changerStatut: (id, statut) =>
        modifier((e) => ({ ...e, leads: ajouterAuFil(e, id, { type: 'statut', statut }, statut) })),

      envoyerMessage: (id, texte) =>
        modifier((e) => {
          const leads = ajouterAuFil(e, id, { type: 'message', texte: texte.trim() })
          // Ecrire vaut lecture : on ne se signale pas ses propres messages.
          const lead = leads.find((l) => l.id === id)
          return {
            ...e,
            leads,
            lectures: lead ? { ...e.lectures, [id]: dernierMouvement(lead) } : e.lectures,
          }
        }),

      marquerLu: (id) =>
        modifier((e) => {
          const lead = e.leads.find((l) => l.id === id)
          if (!lead) return e
          const jusqua = dernierMouvement(lead)
          if (e.lectures[id] === jusqua) return e
          return { ...e, lectures: { ...e.lectures, [id]: jusqua } }
        }),

      supprimerLead: (id) => modifier((e) => ({ ...e, leads: e.leads.filter((l) => l.id !== id) })),

      // On arrive a jour : seuls les messages postes apres la connexion sont signales.
      seConnecter: (membreId) =>
        modifier((e) => ({ ...e, membreId, lectures: lecturesAJour(e.leads) })),

      creerMembre: (nom, organisation) =>
        modifier((e) => {
          // Couleur suivante non utilisee, pour que deux personnes ne se ressemblent pas.
          const prises = new Set(e.membres.map((m) => m.couleur))
          const couleur =
            COULEURS_MEMBRE.find((c) => !prises.has(c)) ?? COULEURS_MEMBRE[e.membres.length % COULEURS_MEMBRE.length]
          const membre: Membre = { id: `m${Date.now()}`, nom: nom.trim(), organisation, couleur }
          return {
            ...e,
            membres: [...e.membres, membre],
            membreId: membre.id,
            lectures: lecturesAJour(e.leads),
          }
        }),

      reinitialiser: () =>
        modifier((e) => {
          const demo = genererDemo()
          return { ...demo, membreId: e.membreId || MEMBRES[0].id, lectures: lecturesAJour(demo.leads) }
        }),
    }
  }, [etat, modifier, ajouterAuFil])

  return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>
}

export function useStore(): Contexte {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore doit être utilisé dans <Fournisseur>')
  return ctx
}
