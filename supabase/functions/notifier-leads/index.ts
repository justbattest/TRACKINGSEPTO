/**
 * Previent l'equipe destinataire qu'un ou plusieurs leads viennent d'arriver.
 *
 * Appelee par le client juste apres la creation : un appel = un email, quel
 * que soit le nombre de leads. C'est ce qui donne le groupement voulu — quatre
 * leads saisis d'un coup font un seul message, quatre leads saisis un par un
 * en font quatre.
 *
 * Aucune dependance : le jeton est deja verifie par la plateforme
 * (verify_jwt), le reste tient en quelques appels PostgREST.
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const URL_BASE = Deno.env.get('SUPABASE_URL')!
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND = Deno.env.get('RESEND_API_KEY')!
const EXPEDITEUR = Deno.env.get('EXPEDITEUR') ?? 'Alyxa × Septodont <echange@alyxa.fr>'
const APPLICATION = Deno.env.get('URL_APPLICATION') ?? 'https://septotracking.netlify.app'

const enTetes = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const reponse = (charge: unknown, statut = 200): Response =>
  new Response(JSON.stringify(charge), { status: statut, headers: enTetes })

type Organisation = 'alyxa' | 'septodont'

const LIBELLE: Record<Organisation, string> = { alyxa: 'Alyxa', septodont: 'Septodont' }
const AUTRE: Record<Organisation, Organisation> = { alyxa: 'septodont', septodont: 'alyxa' }

interface Lead {
  id: string
  origine: Organisation
  structure: string
  contact: string
  telephone: string | null
  email: string | null
  ville: string | null
  code_postal: string | null
  motif: string
  apporte_par: string
}

/** Appel PostgREST avec les droits de service. */
async function base(chemin: string, options: RequestInit = {}): Promise<unknown> {
  const retour = await fetch(`${URL_BASE}/rest/v1/${chemin}`, {
    ...options,
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!retour.ok) throw new Error(`Base (${chemin}) : ${retour.status} ${await retour.text()}`)
  return retour.json()
}

/**
 * Les identifiants viennent du client et finissent dans un filtre PostgREST.
 * On n'accepte que des UUID : rien d'autre ne doit pouvoir s'y glisser.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * L'identifiant du compte appelant. Le jeton a deja ete verifie par la
 * plateforme avant d'arriver ici : on ne fait que lire ce qu'il contient.
 */
function compteAppelant(requete: Request): string | null {
  const entete = requete.headers.get('Authorization') ?? ''
  const jeton = entete.replace(/^Bearer\s+/i, '')
  const charge = jeton.split('.')[1]
  if (!charge) return null
  try {
    const json = atob(charge.replace(/-/g, '+').replace(/_/g, '/'))
    return (JSON.parse(json) as { sub?: string }).sub ?? null
  } catch {
    return null
  }
}

const echapper = (v: string): string =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Une ligne de detail, omise quand la valeur est vide. */
const ligne = (etiquette: string, valeur: string | null | undefined): string =>
  valeur?.trim()
    ? `<tr><td style="padding:2px 12px 2px 0;color:#8b909c;font-size:13px;white-space:nowrap">${etiquette}</td>
         <td style="padding:2px 0;color:#16181d;font-size:13px">${echapper(valeur)}</td></tr>`
    : ''

function corps(leads: Lead[], apporteurs: Map<string, string>, mots: Map<string, string>): string {
  const origine = leads[0].origine
  const cible = AUTRE[origine]
  const fiches = leads
    .map((l) => {
      const mot = mots.get(l.id)
      return `
      <div style="border:1px solid #e5e7eb;border-radius:10px;padding:16px 18px;margin:0 0 12px">
        <div style="font-size:16px;font-weight:600;color:#16181d">${echapper(l.structure)}</div>
        <div style="font-size:14px;color:#565b66;margin-top:2px">${echapper(l.contact)}</div>
        <table style="border-collapse:collapse;margin-top:10px">
          ${ligne('Ville', [l.ville, l.code_postal].filter(Boolean).join(' '))}
          ${ligne('Téléphone', l.telephone)}
          ${ligne('Email', l.email)}
          ${ligne('Motif', l.motif)}
          ${ligne('Apporté par', apporteurs.get(l.apporte_par))}
        </table>
        ${
          mot
            ? `<div style="margin-top:12px;padding:10px 12px;background:#f6f7f9;border-radius:8px;
                 font-size:13.5px;color:#16181d;white-space:pre-wrap">${echapper(mot)}</div>`
            : ''
        }
        <div style="margin-top:12px">
          <a href="${APPLICATION}/#/leads/${l.id}"
             style="display:inline-block;background:#2a78d6;color:#fff;text-decoration:none;
                    font-size:13px;font-weight:500;padding:8px 14px;border-radius:8px">
            Ouvrir la fiche
          </a>
        </div>
      </div>`
    })
    .join('')

  const titre =
    leads.length > 1
      ? `${leads.length} nouveaux leads ${origine === 'alyxa' ? "d’Alyxa" : 'de Septodont'}`
      : `Nouveau lead ${origine === 'alyxa' ? "d’Alyxa" : 'de Septodont'}`

  return `<!doctype html>
<html lang="fr"><body style="margin:0;background:#f6f7f9;padding:24px 16px;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;
              border-radius:14px;padding:24px">
    <div style="font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#8b909c">
      Alyxa × Septodont
    </div>
    <h1 style="margin:6px 0 4px;font-size:19px;color:#16181d">${titre}</h1>
    <p style="margin:0 0 18px;font-size:13.5px;color:#565b66">
      C’est à ${LIBELLE[cible]} de prendre le contact en charge et de tenir le statut à jour.
    </p>
    ${fiches}
    <p style="margin:18px 0 0;font-size:12px;color:#8b909c">
      Vous recevez ce message parce que vous avez un compte sur l’échange de leads
      Alyxa × Septodont. <a href="${APPLICATION}" style="color:#2a78d6">Ouvrir l’outil</a>
    </p>
  </div>
</body></html>`
}

function texte(leads: Lead[], apporteurs: Map<string, string>, mots: Map<string, string>): string {
  return leads
    .map((l) =>
      [
        l.structure,
        l.contact,
        [l.ville, l.code_postal].filter(Boolean).join(' '),
        l.telephone,
        l.email,
        `Motif : ${l.motif}`,
        `Apporté par ${apporteurs.get(l.apporte_par) ?? '—'}`,
        mots.get(l.id),
        `${APPLICATION}/#/leads/${l.id}`,
      ]
        .filter((v) => v && String(v).trim())
        .join('\n'),
    )
    .join('\n\n———\n\n')
}

Deno.serve(async (requete: Request) => {
  if (requete.method === 'OPTIONS') {
    return new Response('ok', { headers: enTetes })
  }

  try {
    const compte = compteAppelant(requete)
    if (!compte) return reponse({ erreur: 'Jeton absent.' }, 401)

    // Seul un membre en exercice declenche un envoi.
    const membres = (await base(
      `membres?utilisateur_id=eq.${compte}&actif=is.true&select=id,nom`,
    )) as { id: string; nom: string }[]
    if (membres.length === 0) return reponse({ erreur: 'Compte sans profil.' }, 403)

    const { leadIds } = (await requete.json()) as { leadIds?: unknown }
    const ids = Array.isArray(leadIds) ? leadIds.filter((v) => typeof v === 'string' && UUID.test(v)) : []
    if (ids.length === 0 || ids.length !== (leadIds as unknown[]).length) {
      return reponse({ erreur: 'Liste de leads invalide.' }, 400)
    }

    const liste = ids.join(',')
    const leads = (await base(
      `leads?id=in.(${liste})&select=id,origine,structure,contact,telephone,email,ville,code_postal,motif,apporte_par`,
    )) as Lead[]
    if (leads.length === 0) return reponse({ erreur: 'Leads introuvables.' }, 404)

    // Les noms des apporteurs, pour que l'email se lise sans ouvrir l'outil.
    const tous = (await base('membres?select=id,nom')) as { id: string; nom: string }[]
    const apporteurs = new Map(tous.map((m) => [m.id, m.nom]))

    // Le mot d'accompagnement : le premier message du fil de chaque lead.
    const messages = (await base(
      `evenements?lead_id=in.(${liste})&type=eq.message&select=lead_id,texte&order=survenu_le.asc`,
    )) as { lead_id: string; texte: string }[]
    const mots = new Map<string, string>()
    for (const m of messages) if (!mots.has(m.lead_id)) mots.set(m.lead_id, m.texte)

    /*
     * Un lot partage son apporteur, donc son equipe destinataire. On regroupe
     * quand meme : une notification par destinataire, jamais une par lead.
     */
    const parCible = new Map<Organisation, Lead[]>()
    for (const l of leads) {
      const cible = AUTRE[l.origine]
      parCible.set(cible, [...(parCible.get(cible) ?? []), l])
    }

    const envois: { equipe: Organisation; destinataires: number; id?: string }[] = []

    for (const [cible, lot] of parCible) {
      const destinataires = (await base('rpc/destinataires_notification', {
        method: 'POST',
        body: JSON.stringify({ equipe: cible }),
      })) as string[]

      if (!destinataires?.length) {
        envois.push({ equipe: cible, destinataires: 0 })
        continue
      }

      const origine = lot[0].origine
      const sujet =
        lot.length > 1
          ? `${lot.length} nouveaux leads ${origine === 'alyxa' ? "d’Alyxa" : 'de Septodont'}`
          : `Nouveau lead ${origine === 'alyxa' ? "d’Alyxa" : 'de Septodont'} — ${lot[0].structure}`

      const envoi = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: EXPEDITEUR,
          to: destinataires,
          subject: sujet,
          html: corps(lot, apporteurs, mots),
          text: texte(lot, apporteurs, mots),
        }),
      })

      if (!envoi.ok) throw new Error(`Resend : ${envoi.status} ${await envoi.text()}`)
      const { id } = (await envoi.json()) as { id: string }
      envois.push({ equipe: cible, destinataires: destinataires.length, id })
    }

    return reponse({ envois })
  } catch (e) {
    console.error(e)
    return reponse({ erreur: e instanceof Error ? e.message : String(e) }, 500)
  }
})
