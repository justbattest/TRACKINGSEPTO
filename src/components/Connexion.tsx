import { useEffect, useState } from 'react'
import { AlertCircle, Loader2, Repeat2 } from 'lucide-react'
import { Bouton, Champ, classesSaisie } from '@/components/ui'
import { creerMonMembre } from '@/lib/api'
import { client } from '@/lib/supabase'
import { LIBELLE_ORGANISATION, type Organisation } from '@/lib/types'

type Ecran = 'chargement' | 'inscription' | 'connexion' | 'profil'

/**
 * Porte d'entree de l'outil.
 *
 * Un seul ecran : nom, adresse, mot de passe, equipe. Pas de confirmation par
 * mail, pas de code d'acces. L'ecran « profil » ne sert qu'au cas de repli ou
 * une session existe deja sans identite associee.
 */
export default function Connexion() {
  const [ecran, setEcran] = useState<Ecran>('chargement')
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [maison, setMaison] = useState<Organisation>('alyxa')
  const [erreur, setErreur] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)

  useEffect(() => {
    let vivant = true
    void client()
      .auth.getSession()
      .then(({ data }) => {
        if (vivant) setEcran(data.session ? 'profil' : 'inscription')
      })
    return () => {
      vivant = false
    }
  }, [])

  async function tenter(action: () => Promise<void>) {
    setOccupe(true)
    setErreur(null)
    try {
      await action()
    } catch (e) {
      setErreur(lisible(e))
    } finally {
      setOccupe(false)
    }
  }

  /** Cree le profil puis laisse le magasin recharger sur le changement de session. */
  async function finaliser() {
    await creerMonMembre(nom, maison)
    await client().auth.refreshSession()
  }

  const sInscrire = () =>
    tenter(async () => {
      const identifiants = { email: email.trim(), password: motDePasse }
      const { data, error } = await client().auth.signUp(identifiants)
      if (error) throw error

      // Le compte est confirme d'office cote base. Si l'inscription n'ouvre pas
      // la session elle-meme, on enchaine simplement sur une connexion.
      if (!data.session) {
        const { error: erreurConnexion } = await client().auth.signInWithPassword(identifiants)
        if (erreurConnexion) throw erreurConnexion
      }
      await finaliser()
    })

  const seConnecter = () =>
    tenter(async () => {
      const { error } = await client().auth.signInWithPassword({
        email: email.trim(),
        password: motDePasse,
      })
      if (error) throw error
      // Le magasin prend le relais si le profil existe ; sinon on le demande.
      setEcran('profil')
    })

  if (ecran === 'chargement') {
    return (
      <Cadre>
        <div className="flex items-center justify-center gap-2 py-6 text-[13.5px] text-encre-2">
          <Loader2 size={17} className="animate-spin" /> Chargement…
        </div>
      </Cadre>
    )
  }

  const inscription = ecran === 'inscription'
  const profil = ecran === 'profil'
  const demandeIdentite = inscription || profil

  return (
    <Cadre>
      <h1 className="text-[19px] font-semibold tracking-tight">
        {profil ? 'Votre profil' : inscription ? 'Créer votre compte' : 'Connexion'}
      </h1>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-encre-2">
        {profil
          ? 'Votre nom et votre équipe, et c’est parti.'
          : inscription
            ? 'Le registre des leads échangés entre Alyxa et Septodont.'
            : 'Content de vous revoir.'}
      </p>

      <form
        className="mt-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void (profil ? tenter(finaliser) : inscription ? sInscrire() : seConnecter())
        }}
      >
        {demandeIdentite && (
          <Champ label="Votre nom">
            <input
              autoFocus
              required
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Prénom Nom"
              className={classesSaisie}
            />
          </Champ>
        )}

        {!profil && (
          <>
            <Champ label="Adresse email">
              <input
                autoFocus={!demandeIdentite}
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prenom.nom@exemple.fr"
                className={classesSaisie}
              />
            </Champ>
            <Champ label="Mot de passe" aide={inscription ? '8 caractères minimum.' : undefined}>
              <input
                required
                type="password"
                minLength={8}
                autoComplete={inscription ? 'new-password' : 'current-password'}
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                className={classesSaisie}
              />
            </Champ>
          </>
        )}

        {demandeIdentite && (
          <Champ
            label="Votre équipe"
            aide="Elle détermine le sens de lecture : ce que vous envoyez, ce que vous recevez."
          >
            <div className="flex gap-2">
              {(['alyxa', 'septodont'] as Organisation[]).map((org) => (
                <button
                  key={org}
                  type="button"
                  onClick={() => setMaison(org)}
                  aria-pressed={maison === org}
                  className={`flex-1 rounded-lg border px-3 py-2.5 text-[13.5px] font-medium transition-colors ${
                    maison === org
                      ? 'border-[var(--color-marque)] bg-[var(--color-marque-clair)] text-[var(--color-marque-fonce)]'
                      : 'border-bord-fort text-encre-2 hover:bg-fond'
                  }`}
                >
                  {LIBELLE_ORGANISATION[org]}
                </button>
              ))}
            </div>
          </Champ>
        )}

        <Erreur message={erreur} />
        <Bouton
          type="submit"
          variante="primaire"
          disabled={occupe || (demandeIdentite && !nom.trim())}
          className="w-full justify-center py-2.5"
        >
          {occupe ? (
            <Loader2 size={16} className="animate-spin" />
          ) : profil ? (
            'Entrer'
          ) : inscription ? (
            'Créer mon compte'
          ) : (
            'Se connecter'
          )}
        </Bouton>
      </form>

      <button
        onClick={() => {
          setErreur(null)
          if (profil) void client().auth.signOut().then(() => setEcran('connexion'))
          else setEcran(inscription ? 'connexion' : 'inscription')
        }}
        className="mt-4 w-full text-center text-[12.5px] text-encre-2 hover:underline"
      >
        {profil
          ? 'Utiliser une autre adresse'
          : inscription
            ? 'J’ai déjà un compte'
            : 'Créer un compte'}
      </button>
    </Cadre>
  )
}

function Erreur({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="flex gap-2 rounded-lg bg-[var(--color-critique-fond)] px-3.5 py-3 text-[13px] leading-relaxed text-[#b02a2a]">
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

function Cadre({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-fond px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-5 flex items-center justify-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-marque)] text-white">
            <Repeat2 size={18} />
          </span>
          <span className="leading-tight">
            <span className="block text-[14px] font-semibold">Alyxa × Septodont</span>
            <span className="block text-[12px] text-encre-3">Échange de leads</span>
          </span>
        </div>
        <div className="rounded-xl border border-bord bg-carte px-6 py-7 shadow-sm">{children}</div>
      </div>
    </div>
  )
}

/** Traduit les messages techniques de Supabase en phrases utilisables. */
function lisible(e: unknown): string {
  const brut =
    e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : ''
  if (/invalid login credentials/i.test(brut)) return 'Adresse ou mot de passe incorrect.'
  if (/user already registered/i.test(brut))
    return 'Un compte existe déjà avec cette adresse. Connectez-vous.'
  if (/password should be at least/i.test(brut))
    return 'Le mot de passe doit faire au moins 8 caractères.'
  if (/rate limit|too many/i.test(brut))
    return 'Trop de tentatives. Réessayez dans quelques minutes.'
  return brut || 'Une erreur est survenue.'
}
