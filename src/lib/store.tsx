/**
 * Etat applicatif unique, avec deux implantations derriere la meme interface.
 *
 * - Hors ligne (aucune variable d'environnement) : jeu de demonstration
 *   conserve dans le navigateur. L'outil s'essaie sans compte ni installation.
 * - En ligne : base Supabase partagee par les deux equipes, avec temps reel.
 *
 * Les pages ne savent pas laquelle des deux tourne.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import * as api from './api'
import {
  chercherDoublons,
  differences,
  normaliser,
  resumerDifferences,
  type ChampsFiche,
  type Doublon,
} from './fiche'
import { enLigne, supabase } from './supabase'
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

const CLE_STOCKAGE = 'echange-septodont:v2'

/**
 * Champs saisis a la creation d'un lead. `origine` n'y figure pas : elle se
 * deduit de l'equipe de l'apporteur.
 */
export type NouveauLead = Omit<Lead, 'id' | 'statut' | 'fil' | 'transmisLe' | 'origine'> & {
  transmisLe?: string
}

/** Un lead a creer, avec son mot d'accompagnement facultatif. */
export interface LeadASaisir {
  lead: NouveauLead
  message?: string
}

interface Donnees {
  leads: Lead[]
  regions: Region[]
  membres: Membre[]
  membreId: string
  /** Date de derniere lecture du fil, par lead : sert a compter les non-lus. */
  lectures: Record<string, string>
}

export interface Contexte extends Donnees {
  /** Membre connecte, ou undefined tant que personne ne s'est identifie. */
  moi: Membre | undefined
  /** Maison du membre connecte : toute la lecture de l'echange en depend. */
  maMaison: Organisation
  /** La base partagee est-elle branchee ? */
  enLigne: boolean
  chargement: boolean
  erreur: string | null
  regionDe: (id: string) => string
  leadDe: (id: string) => Lead | undefined
  membreDe: (id: string) => Membre | undefined
  /** Cree un lot de leads en une fois : une validation, une seule notification. */
  ajouterLeads: (lots: LeadASaisir[]) => void
  /** Corrige une fiche. Tout membre peut corriger n'importe quel lead. */
  modifierLead: (id: string, champs: ChampsFiche) => void
  /** Les fiches deja presentes qui ressemblent a celle qu'on saisit. */
  doublons: (
    candidat: Pick<ChampsFiche, 'structure' | 'contact' | 'telephone' | 'email'>,
    ignorer?: string,
  ) => Doublon[]
  changerStatut: (id: string, statut: Statut) => void
  envoyerMessage: (id: string, texte: string) => void
  marquerLu: (id: string) => void
  supprimerLead: (id: string) => void
  /** Bascule de persona — mode démonstration uniquement. */
  seConnecter: (membreId: string) => void
  /** Création d'un profil local — mode démonstration uniquement. */
  creerMembre: (nom: string, organisation: Organisation) => void
  reinitialiser: () => void
  seDeconnecter: () => Promise<void>
}

const Ctx = createContext<Contexte | null>(null)

export function useStore(): Contexte {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore doit être utilisé dans <Fournisseur>')
  return ctx
}

/** L'equipe du membre apporteur, qui fixe l'origine du lead. */
function origineDe(membres: Membre[], apporteParId: string): Organisation {
  return membres.find((m) => m.id === apporteParId)?.organisation ?? 'alyxa'
}

/** Assemble la partie commune du contexte a partir des donnees chargees. */
function indexer(donnees: Donnees) {
  const parRegion = new Map(donnees.regions.map((r) => [r.id, r.nom]))
  const parLead = new Map(donnees.leads.map((l) => [l.id, l]))
  const parMembre = new Map(donnees.membres.map((m) => [m.id, m]))
  const moi = parMembre.get(donnees.membreId)
  return {
    moi,
    maMaison: moi?.organisation ?? ('alyxa' as Organisation),
    regionDe: (id: string) => parRegion.get(id) ?? '—',
    leadDe: (id: string) => parLead.get(id),
    membreDe: (id: string) => parMembre.get(id),
    // Tous les leads sont deja en memoire : chercher un doublon ne demande
    // aucun aller-retour, et la demonstration se comporte comme la base.
    doublons: (
      candidat: Pick<ChampsFiche, 'structure' | 'contact' | 'telephone' | 'email'>,
      ignorer?: string,
    ) => chercherDoublons(donnees.leads, candidat, ignorer),
  }
}

/** Les champs de fiche d'un lead existant, pour les comparer a une correction. */
export function champsDe(lead: Lead): ChampsFiche {
  return {
    structure: lead.structure,
    contact: lead.contact,
    telephone: lead.telephone,
    email: lead.email,
    ville: lead.ville,
    codePostal: lead.codePostal,
    regionId: lead.regionId,
    motif: lead.motif,
    apporteParId: lead.apporteParId,
  }
}

/**
 * Le resume porte au fil : ce qui a change, en clair, identifiants traduits.
 * Vide quand la correction ne change rien de visible.
 */
function resumerCorrection(
  lead: Lead,
  champs: ChampsFiche,
  regions: Region[],
  membres: Membre[],
): string {
  const nomRegion = (id: string) => regions.find((r) => r.id === id)?.nom ?? id
  const nomMembre = (id: string) => membres.find((m) => m.id === id)?.nom ?? id
  return resumerDifferences(
    differences(champsDe(lead), normaliser(champs), (champ, valeur) =>
      champ === 'regionId' ? nomRegion(valeur) : champ === 'apporteParId' ? nomMembre(valeur) : valeur,
    ),
  )
}

export function Fournisseur({ children }: { children: ReactNode }) {
  return enLigne ? <FournisseurDistant>{children}</FournisseurDistant> : <FournisseurLocal>{children}</FournisseurLocal>
}

// ---------------------------------------------------------------------------
// Mode demonstration : tout vit dans le navigateur.
// ---------------------------------------------------------------------------

function etatLocalInitial(): Donnees {
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE)
    if (brut) return JSON.parse(brut) as Donnees
  } catch {
    // Stockage indisponible (navigation privee) : on repart de la demo.
  }
  const demo = genererDemo()
  return { ...demo, membreId: '', lectures: {} }
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

function FournisseurLocal({ children }: { children: ReactNode }) {
  const [etat, setEtat] = useState<Donnees>(etatLocalInitial)

  const modifier = useCallback((suite: (e: Donnees) => Donnees) => {
    setEtat((actuel) => {
      const suivant = suite(actuel)
      try {
        localStorage.setItem(CLE_STOCKAGE, JSON.stringify(suivant))
      } catch {
        // Echec silencieux : l'app reste utilisable pour la session en cours.
      }
      return suivant
    })
  }, [])

  const ajouterAuFil = useCallback(
    (e: Donnees, id: string, entree: Omit<Evenement, 'id' | 'date' | 'auteurId'>, statut?: Statut): Lead[] =>
      e.leads.map((l) =>
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
                  auteurId: e.membreId,
                },
              ],
            }
          : l,
      ),
    [],
  )

  const valeur = useMemo<Contexte>(
    () => ({
      ...etat,
      ...indexer(etat),
      enLigne: false,
      chargement: false,
      erreur: null,

      ajouterLeads: (lots) =>
        modifier((e) => {
          const nouveaux = lots.map(({ lead, message }, i) => {
            const transmisLe = lead.transmisLe ?? new Date().toISOString()
            const cle = `${Date.now()}-${i}`
            const fil: Evenement[] = [
              { id: `e${cle}-0`, date: transmisLe, type: 'statut', statut: 'transmis', auteurId: e.membreId },
            ]
            if (message?.trim()) {
              fil.push({
                id: `e${cle}-1`,
                date: new Date(+new Date(transmisLe) + 1000).toISOString(),
                type: 'message',
                texte: message.trim(),
                auteurId: e.membreId,
              })
            }
            return {
              ...lead,
              // Comme en base : l'origine suit l'equipe de l'apporteur.
              origine: origineDe(e.membres, lead.apporteParId),
              transmisLe,
              id: `l${cle}`,
              statut: 'transmis' as Statut,
              fil,
            }
          })
          return { ...e, leads: [...nouveaux, ...e.leads] }
        }),

      modifierLead: (id, champs) =>
        modifier((e) => {
          const lead = e.leads.find((l) => l.id === id)
          if (!lead) return e
          const resume = resumerCorrection(lead, champs, e.regions, e.membres)
          if (!resume) return e
          const net = normaliser(champs)
          const leads = e.leads.map((l) =>
            l.id === id
              ? {
                  ...l,
                  ...net,
                  // Comme en base : l'origine suit l'equipe de l'apporteur.
                  origine: origineDe(e.membres, net.apporteParId),
                }
              : l,
          )
          return { ...e, leads: ajouterAuFil({ ...e, leads }, id, { type: 'modification', texte: resume }) }
        }),

      changerStatut: (id, statut) =>
        modifier((e) => ({ ...e, leads: ajouterAuFil(e, id, { type: 'statut', statut }, statut) })),

      envoyerMessage: (id, texte) =>
        modifier((e) => {
          const leads = ajouterAuFil(e, id, { type: 'message', texte: texte.trim() })
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

      seConnecter: (membreId) => modifier((e) => ({ ...e, membreId, lectures: lecturesAJour(e.leads) })),

      creerMembre: (nom, organisation) =>
        modifier((e) => {
          const prises = new Set(e.membres.map((m) => m.couleur))
          const couleur =
            COULEURS_MEMBRE.find((c) => !prises.has(c)) ??
            COULEURS_MEMBRE[e.membres.length % COULEURS_MEMBRE.length]
          const membre: Membre = { id: `m${Date.now()}`, nom: nom.trim(), organisation, couleur }
          return { ...e, membres: [...e.membres, membre], membreId: membre.id, lectures: lecturesAJour(e.leads) }
        }),

      reinitialiser: () =>
        modifier((e) => {
          const demo = genererDemo()
          return { ...demo, membreId: e.membreId || MEMBRES[0].id, lectures: lecturesAJour(demo.leads) }
        }),

      seDeconnecter: async () => modifier((e) => ({ ...e, membreId: '' })),
    }),
    [etat, modifier, ajouterAuFil],
  )

  return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>
}

// ---------------------------------------------------------------------------
// Mode partage : base Supabase, avec temps reel.
// ---------------------------------------------------------------------------

const VIDE: Donnees = { leads: [], regions: [], membres: [], membreId: '', lectures: {} }

function FournisseurDistant({ children }: { children: ReactNode }) {
  const [donnees, setDonnees] = useState<Donnees>(VIDE)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const membreRef = useRef('')
  const attente = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Recharge tout. Les volumes sont petits : c'est plus sur qu'un patch partiel. */
  const rafraichir = useCallback(async () => {
    const membreId = membreRef.current
    if (!membreId) return
    try {
      const instantane = await api.charger(membreId)
      setDonnees({ ...instantane, membreId })
      setErreur(null)
    } catch (e) {
      setErreur(messageErreur(e))
    }
  }, [])

  /** Regroupe les rafraichissements rapproches en un seul appel. */
  const rafraichirBientot = useCallback(() => {
    if (attente.current) clearTimeout(attente.current)
    attente.current = setTimeout(() => void rafraichir(), 250)
  }, [rafraichir])

  // Suit la session : connexion, deconnexion, rafraichissement de jeton.
  useEffect(() => {
    let vivant = true

    async function synchroniser() {
      try {
        const membre = await api.monMembre()
        if (!vivant) return
        membreRef.current = membre?.id ?? ''
        if (!membre) {
          setDonnees(VIDE)
          setChargement(false)
          return
        }
        const instantane = await api.charger(membre.id)
        if (!vivant) return
        setDonnees({ ...instantane, membreId: membre.id })
        setErreur(null)
      } catch (e) {
        if (vivant) setErreur(messageErreur(e))
      } finally {
        if (vivant) setChargement(false)
      }
    }

    void synchroniser()
    const { data } = supabase!.auth.onAuthStateChange(() => {
      setChargement(true)
      void synchroniser()
    })
    return () => {
      vivant = false
      data.subscription.unsubscribe()
    }
  }, [])

  // Temps reel : un message envoye par l'autre equipe arrive sans rechargement.
  useEffect(() => {
    if (!donnees.membreId) return
    return api.ecouter(rafraichirBientot)
  }, [donnees.membreId, rafraichirBientot])

  /** Enchaine une ecriture distante puis un rechargement, en signalant l'echec. */
  const agir = useCallback(
    (operation: () => Promise<void>) => {
      void operation()
        .then(() => rafraichir())
        .catch((e) => setErreur(messageErreur(e)))
    },
    [rafraichir],
  )

  const valeur = useMemo<Contexte>(() => {
    const index = indexer(donnees)
    const moiId = donnees.membreId
    return {
      ...donnees,
      ...index,
      enLigne: true,
      chargement,
      erreur,

      /*
       * Creation puis notification, dans cet ordre et sans les confondre : un
       * email qui ne part pas ne doit jamais faire croire que les leads ne
       * sont pas enregistres. On rafraichit d'abord, on previent ensuite, et
       * seul l'echec de l'envoi remonte comme avertissement.
       */
      ajouterLeads: (lots) => {
        void (async () => {
          try {
            const ids = await api.creerLeads(
              lots.map(({ lead, message }) => ({
                lead: { ...lead, transmisParId: moiId },
                message,
              })),
            )
            await rafraichir()
            const echec = await api.notifierLeads(ids)
            if (echec) {
              setErreur(
                `${ids.length > 1 ? `Les ${ids.length} leads sont enregistrés` : 'Le lead est enregistré'}, ` +
                  `mais la notification par email n’est pas partie (${echec}).`,
              )
            }
          } catch (e) {
            setErreur(messageErreur(e))
          }
        })()
      },

      modifierLead: (id, champs) => {
        const lead = index.leadDe(id)
        if (!lead) return
        const resume = resumerCorrection(lead, champs, donnees.regions, donnees.membres)
        agir(() => api.modifierLead(id, champs, moiId, resume))
      },

      changerStatut: (id, statut) => agir(() => api.changerStatut(id, moiId, statut)),

      envoyerMessage: (id, texte) => agir(() => api.envoyerMessage(id, moiId, texte)),

      marquerLu: (id) => {
        const lead = index.leadDe(id)
        if (!lead) return
        const jusqua = dernierMouvement(lead)
        if (donnees.lectures[id] === jusqua) return
        // Marquage optimiste : la pastille disparait sans attendre le serveur.
        setDonnees((d) => ({ ...d, lectures: { ...d.lectures, [id]: jusqua } }))
        void api.marquerLu(id, moiId, jusqua).catch(() => undefined)
      },

      supprimerLead: (id) => agir(() => api.supprimerLead(id)),

      // Sans objet en ligne : l'identite vient de la session authentifiee.
      seConnecter: () => undefined,
      creerMembre: () => undefined,
      reinitialiser: () => undefined,

      seDeconnecter: async () => {
        await supabase!.auth.signOut()
      },
    }
  }, [donnees, chargement, erreur, agir])

  return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>
}

/** Message lisible pour l'utilisateur a partir d'une erreur Supabase. */
function messageErreur(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return 'Une erreur est survenue.'
}
