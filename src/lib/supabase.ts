/**
 * Client Supabase.
 *
 * Sans variables d'environnement, l'application tourne en mode demonstration :
 * les donnees vivent dans le navigateur et rien n'est envoye nulle part.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const cle = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

/** La base reelle est-elle configuree ? */
export const enLigne = Boolean(url && cle)

export const supabase: SupabaseClient | null = enLigne
  ? createClient(url!, cle!, { auth: { persistSession: true, autoRefreshToken: true } })
  : null

/** Client garanti non nul, pour les chemins qui ne s'executent qu'en ligne. */
export function client(): SupabaseClient {
  if (!supabase) throw new Error('Supabase n’est pas configuré')
  return supabase
}
