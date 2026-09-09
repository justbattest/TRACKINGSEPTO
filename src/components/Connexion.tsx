import { useEffect, useState } from 'react'
import { AlertCircle, KeyRound, Loader2, MailCheck, Repeat2 } from 'lucide-react'
import { Bouton, Champ, classesSaisie } from '@/components/ui'
import { creerMonMembre } from '@/lib/api'
import { client } from '@/lib/supabase'
import { LIBELLE_ORGANISATION, type Organisation } from '@/lib/types'

type Ecran = 'chargement' | 'inscription' | 'connexion' | 'verifiez' | 'profil'

/** Ce qu'on retient entre l'inscription et le retour depuis le mail de confirmation. */
const CLE_BROUILLON = 'echange-septodont:inscription'

interface Brouillon {
  nom: string
  maison: Organisation
}

function lireBrouillon(): Brouillon | null {
  try {
    const brut = localStorage.getItem(CLE_BROUILLON)
    return brut ? (JSON.parse(brut) as Brouillon) : null
  } catch {
    return null
  }
}

/**
 * Porte d'entree de l'outil.
 *
 * Tout se demande sur un seul ecran : adresse, mot de passe, nom et equipe.
 * Quand la confirmation d'adresse est desactivee — le cas normal pour un outil
 * interne — on entre directement, sans deuxieme etape.
 */
export default function Connexion() {
  const [ecran, setEcran] = useState<Ecran>('chargement')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [nom, setNom] = useState('')
  const [maison, setMaison] = useState<Organisation>('alyxa')
  const [code, setCode] = useState('')
  const [codeDemande, setCodeDemande] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)

  // Une session deja ouverte mais sans profil : il ne manque que l'identite.
  useEffect(() => {
    let vivant = true
    void client()
      .auth.getSession()
      .then(({ data }) => {
        if (!vivant) return
        const brouillon = lireBrouillon()
        if (brouillon) {
          setNom(brouillon.nom)
          setMaison(brouillon.maison)
        }
        setEcran(data.session ? 'profil' : 'inscription')
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
      const message = lisible(e)
      setErreur(message)
      // Une adresse hors des domaines reconnus : on propose le code d'acces.
      if (/pas reconnue|Accès refusé/i.test(message)) setCodeDemande(true)
    } finally {
      setOccupe(false)
    }
  }

  /** Cree le profil puis laisse le magasin recharger sur le changement de session. */
  async function finaliser() {
    await creerMonMembre(nom, maison, code)
    localStorage.removeItem(CLE_BROUILLON)
    await client().auth.refreshSession()
  }

  const sInscrire = () =>
    tenter(async () => {
      const { data, error } = await client().auth.signUp({
        email: email.trim(),
        password: motDePasse,
      })
      if (error) throw error

      if (data.session) {
        // Confirmation d'adresse desactivee : on enchaine sans rien redemander.
        await finaliser()
        return
      }
      // Sinon on garde le nom et l'equipe pour ne pas les redemander au retour.
      try {
        localStorage.setItem(CLE_BROUILLON, JSON.stringify({ nom, maison }))
      } catch {
        // Stockage indisponible : la personne les ressaisira, sans plus.
      }
      setEcran('verifiez')
    })

  const seConnecter = () =>
    tenter(async () => {
      const { error } = await client().auth.signInWithPassword({
        email: email.trim(),
        password: motDePasse,
      })
      if (error) throw error
      // Le profil existe peut-etre deja : le magasin prendra le relais. Sinon,
      // on le cree avec ce qui a ete saisi a l'inscription.
      const brouillon = lireBrouillon()
      if (brouillon && brouillon.nom.trim()) {
        setNom(brouillon.nom)
        setMaison(brouillon.maison)
        try {
          await creerMonMembre(brouillon.nom, brouillon.maison, code)
          localStorage.removeItem(CLE_BROUILLON)
          await client().auth.refreshSession()
          return
        } catch {
          // Echec silencieux : l'ecran de profil prend le relais.
        }
      }
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

  if (ecran === 'verifiez') {
    return (
      <Cadre>
        <MailCheck size={32} className="mx-auto text-[var(--color-bien)]" />
        <h1 className="mt-3 text-center text-[18px] font-semibold">Vérifiez votre boîte mail</h1>
        <p className="mt-2 text-center text-[13.5px] leading-relaxed text-encre-2">
          Un lien de confirmation vient d’être envoyé à{' '}
          <strong className="font-semibold text-encre">{email}</strong>. Cliquez dessus, puis
          revenez ici pour vous connecter — votre nom et votre équipe sont déjà enregistrés.
        </p>
        <Bouton onClick={() => setEcran('connexion')} className="mt-5 w-full justify-center">
          Retour à la connexion
        </Bouton>
      </Cadre>
    )
  }

  const inscription = ecran === 'inscription'
  const profil = ecran === 'profil'

  return (
    <Cadre>
      <h1 className="text-[19px] font-semibold tracking-tight">
        {profil ? 'Votre profil' : inscription ? 'Créer votre compte' : 'Connexion'}
      </h1>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-encre-2">
        {profil
          ? 'Dernière étape : votre nom et votre équipe.'
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
        {!profil && (
          <>
            <Champ label="Adresse email">
              <input
                autoFocus
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

        {/* Nom et equipe : demandes des l'inscription, jamais deux fois. */}
        {(inscription || profil) && (
          <>
            <Champ label="Votre nom">
              <input
                autoFocus={profil}
                required
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Prénom Nom"
                className={classesSaisie}
              />
            </Champ>

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

            {codeDemande && (
              <Champ
                label="Code d’accès"
                aide="Votre adresse n’est pas sur un domaine reconnu. Demandez le code à votre contact."
              >
                <div className="relative">
                  <KeyRound
                    size={15}
                    className="absolute top-1/2 left-3 -translate-y-1/2 text-encre-3"
                  />
                  <input
                    autoFocus
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="ALYXA-SEPTO-XXXXXX"
                    className={`${classesSaisie} pl-9 uppercase`}
                  />
                </div>
              </Champ>
            )}
          </>
        )}

        <Erreur message={erreur} />
        <Bouton
          type="submit"
          variante="primaire"
          disabled={occupe || ((inscription || profil) && !nom.trim())}
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
  if (/email not confirmed/i.test(brut))
    return 'Confirmez d’abord votre adresse via le lien reçu par mail.'
  if (/rate limit|too many/i.test(brut))
    return 'Trop de tentatives. Réessayez dans quelques minutes.'
  return brut || 'Une erreur est survenue.'
}
