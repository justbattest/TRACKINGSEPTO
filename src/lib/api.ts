/**
 * Acces a la base. Toute lecture et toute ecriture distante passe par ici.
 *
 * Les lignes de la base sont en snake_case, le modele de l'application en
 * camelCase : la traduction se fait dans ce fichier et nulle part ailleurs.
 */
import { client } from './supabase'
import type {
  Evenement,
  Lead,
  Membre,
  Organisation,
  Region,
  Statut,
} from './types'

interface LigneMembre {
  id: string
  nom: string
  organisation: Organisation
  couleur: string
}

interface LigneLead {
  id: string
  origine: Organisation
  structure: string
  contact: string
  telephone: string | null
  email: string | null
  ville: string | null
  code_postal: string | null
  region_id: string | null
  motif: string
  transmis_par: string
  transmis_le: string
  statut: Statut
}

interface LigneEvenement {
  id: string
  lead_id: string
  auteur_id: string
  type: 'statut' | 'message'
  statut: Statut | null
  texte: string | null
  survenu_le: string
}

export interface Instantane {
  regions: Region[]
  membres: Membre[]
  leads: Lead[]
  lectures: Record<string, string>
}

/** Le membre correspondant a la session, ou null si le profil n'existe pas encore. */
export async function monMembre(): Promise<Membre | null> {
  const { data: session } = await client().auth.getUser()
  if (!session.user) return null
  const { data, error } = await client()
    .from('membres')
    .select('id, nom, organisation, couleur')
    .eq('utilisateur_id', session.user.id)
    .maybeSingle()
  if (error) throw error
  return data ?? null
}

/**
 * Cree le profil du compte connecte.
 *
 * La maison est choisie par la personne : les deux equipes voient les memes
 * donnees, elle ne decide que du point de vue d'affichage. Ce qui est
 * verrouille, c'est l'entree — domaine reconnu, ou code d'acces partage.
 */
export async function creerMonMembre(
  nom: string,
  organisation: Organisation,
  code?: string,
): Promise<Membre> {
  const { data, error } = await client().rpc('creer_mon_membre', {
    nom_complet: nom,
    organisation_choisie: organisation,
    code: code?.trim() || null,
  })
  if (error) throw error
  const ligne = (Array.isArray(data) ? data[0] : data) as LigneMembre
  return {
    id: ligne.id,
    nom: ligne.nom,
    organisation: ligne.organisation,
    couleur: ligne.couleur,
  }
}

/**
 * Charge tout ce dont l'application a besoin, en une passe.
 *
 * Le volume reste petit — quelques centaines de leads — donc un chargement
 * complet est plus simple et plus sur qu'une synchronisation incrementale.
 */
export async function charger(membreId: string): Promise<Instantane> {
  const db = client()
  const [regions, membres, leads, evenements, lectures] = await Promise.all([
    db.from('regions').select('id, nom').order('nom'),
    db.from('membres').select('id, nom, organisation, couleur').eq('actif', true).order('nom'),
    db.from('leads').select('*').order('dernier_mouvement', { ascending: false }),
    db.from('evenements').select('*').order('survenu_le'),
    db.from('lectures').select('lead_id, lu_jusqua').eq('membre_id', membreId),
  ])

  for (const r of [regions, membres, leads, evenements, lectures]) {
    if (r.error) throw r.error
  }

  // Les evenements arrivent tries : on les range par lead sans retrier.
  const filsParLead = new Map<string, Evenement[]>()
  for (const e of (evenements.data ?? []) as LigneEvenement[]) {
    const fil = filsParLead.get(e.lead_id) ?? []
    fil.push({
      id: e.id,
      date: e.survenu_le,
      auteurId: e.auteur_id,
      type: e.type,
      ...(e.statut ? { statut: e.statut } : {}),
      ...(e.texte ? { texte: e.texte } : {}),
    })
    filsParLead.set(e.lead_id, fil)
  }

  return {
    regions: (regions.data ?? []) as Region[],
    membres: (membres.data ?? []) as Membre[],
    leads: ((leads.data ?? []) as LigneLead[]).map((l) => ({
      id: l.id,
      origine: l.origine,
      structure: l.structure,
      contact: l.contact,
      telephone: l.telephone ?? '',
      email: l.email ?? '',
      ville: l.ville ?? '',
      codePostal: l.code_postal ?? '',
      regionId: l.region_id ?? '',
      motif: l.motif,
      transmisParId: l.transmis_par,
      transmisLe: l.transmis_le,
      statut: l.statut,
      fil: filsParLead.get(l.id) ?? [],
    })),
    lectures: Object.fromEntries(
      ((lectures.data ?? []) as { lead_id: string; lu_jusqua: string }[]).map((l) => [
        l.lead_id,
        l.lu_jusqua,
      ]),
    ),
  }
}

export interface NouveauLeadDistant {
  origine: Organisation
  structure: string
  contact: string
  telephone: string
  email: string
  ville: string
  codePostal: string
  regionId: string
  motif: string
  transmisParId: string
}

/** Cree le lead, son entree « transmis », et le mot d'accompagnement s'il y en a un. */
export async function creerLead(lead: NouveauLeadDistant, message?: string): Promise<void> {
  const db = client()
  const { data, error } = await db
    .from('leads')
    .insert({
      origine: lead.origine,
      structure: lead.structure,
      contact: lead.contact,
      telephone: lead.telephone || null,
      email: lead.email || null,
      ville: lead.ville || null,
      code_postal: lead.codePostal || null,
      region_id: lead.regionId || null,
      motif: lead.motif,
      transmis_par: lead.transmisParId,
    })
    .select('id')
    .single()
  if (error) throw error

  const entrees: Record<string, unknown>[] = [
    { lead_id: data.id, auteur_id: lead.transmisParId, type: 'statut', statut: 'transmis' },
  ]
  if (message?.trim()) {
    entrees.push({
      lead_id: data.id,
      auteur_id: lead.transmisParId,
      type: 'message',
      texte: message.trim(),
    })
  }
  const { error: erreurFil } = await db.from('evenements').insert(entrees)
  if (erreurFil) throw erreurFil
}

/** Le declencheur en base reporte le statut sur le lead : on n'ecrit que le fil. */
export async function changerStatut(leadId: string, auteurId: string, statut: Statut): Promise<void> {
  const { error } = await client()
    .from('evenements')
    .insert({ lead_id: leadId, auteur_id: auteurId, type: 'statut', statut })
  if (error) throw error
}

export async function envoyerMessage(leadId: string, auteurId: string, texte: string): Promise<void> {
  const { error } = await client()
    .from('evenements')
    .insert({ lead_id: leadId, auteur_id: auteurId, type: 'message', texte: texte.trim() })
  if (error) throw error
}

export async function marquerLu(leadId: string, membreId: string, jusqua: string): Promise<void> {
  const { error } = await client()
    .from('lectures')
    .upsert({ membre_id: membreId, lead_id: leadId, lu_jusqua: jusqua })
  if (error) throw error
}

export async function supprimerLead(leadId: string): Promise<void> {
  const { error } = await client().from('leads').delete().eq('id', leadId)
  if (error) throw error
}

/**
 * Rappelle `onChangement` des qu'un lead ou un fil bouge, chez soi comme chez
 * l'autre equipe. Renvoie la fonction de desabonnement.
 */
export function ecouter(onChangement: () => void): () => void {
  const canal = client()
    .channel('echange')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, onChangement)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'evenements' }, onChangement)
    .subscribe()
  return () => {
    void client().removeChannel(canal)
  }
}
