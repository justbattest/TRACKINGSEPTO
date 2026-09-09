import { useEffect, useState } from 'react'
import { AlertCircle, Loader2, MailCheck, Repeat2 } from 'lucide-react'
import { Bouton, Champ, classesSaisie } from '@/components/ui'
import { creerMonMembre } from '@/lib/api'
import { client } from '@/lib/supabase'

type Ecran = 'chargement' | 'connexion' | 'inscription' | 'verifiez' | 'profil'

/**
 * Porte d'entree de l'outil partage.
 *
 * Trois etats : pas de session, session sans profil (premiere venue), ou en
 * attente de confirmation d'adresse. La maison — Alyxa ou Septodont — n'est
 * jamais choisie ici : elle est deduite du domaine de l'adresse au moment de
 * creer le profil.
 */
export default function Connexion() {
  const [ecran, setEcran] = useState<Ecran>('chargement')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [nom, setNom] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)

  // Une session sans profil signifie : premiere venue, on demande le nom.
  useEffect(() => {
    let vivant = true
    void client()
      .auth.getSession()
      .then(({ data }) => {
        if (vivant) setEcran(data.session ? 'profil' : 'connexion')
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

  const seConnecter = () =>
    tenter(async () => {
      const { error } = await client().auth.signInWithPassword({ email: email.trim(), password: motDePasse })
      if (error) throw error
      setEcran('profil')
    })

  const sInscrire = () =>
    tenter(async () => {
      const { data, error } = await client().auth.signUp({ email: email.trim(), password: motDePasse })
      if (error) throw error
      // Sans confirmation d'adresse, la session est ouverte immediatement.
      setEcran(data.session ? 'profil' : 'verifiez')
    })

  const creerProfil = () =>
    tenter(async () => {
      await creerMonMembre(nom)
      // Le store recharge sur le changement d'etat d'authentification.
      await client().auth.refreshSession()
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
          revenez ici pour vous connecter.
        </p>
        <Bouton onClick={() => setEcran('connexion')} className="mt-5 w-full justify-center">
          Retour à la connexion
        </Bouton>
      </Cadre>
    )
  }

  if (ecran === 'profil') {
    return (
      <Cadre>
        <h1 className="text-[19px] font-semibold tracking-tight">Bienvenue</h1>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-encre-2">
          Dernière étape : votre nom, tel qu’il apparaîtra à côté de vos messages. Votre maison —
          Alyxa ou Septodont — est reconnue automatiquement à partir de votre adresse
          professionnelle.
        </p>
        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void creerProfil()
          }}
        >
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
          <Erreur message={erreur} />
          <Bouton
            type="submit"
            variante="primaire"
            disabled={occupe || !nom.trim()}
            className="w-full justify-center py-2.5"
          >
            {occupe ? <Loader2 size={16} className="animate-spin" /> : 'Entrer'}
          </Bouton>
        </form>
        <button
          onClick={() => void client().auth.signOut().then(() => setEcran('connexion'))}
          className="mt-4 w-full text-center text-[12.5px] text-encre-3 hover:text-encre-2 hover:underline"
        >
          Utiliser une autre adresse
        </button>
      </Cadre>
    )
  }

  const inscription = ecran === 'inscription'

  return (
    <Cadre>
      <h1 className="text-[19px] font-semibold tracking-tight">
        {inscription ? 'Créer votre compte' : 'Connexion'}
      </h1>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-encre-2">
        {inscription
          ? 'Utilisez votre adresse professionnelle Alyxa ou Septodont : c’est elle qui détermine votre maison.'
          : 'Le registre des leads échangés entre Alyxa et Septodont.'}
      </p>

      <form
        className="mt-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void (inscription ? sInscrire() : seConnecter())
        }}
      >
        <Champ label="Adresse professionnelle">
          <input
            autoFocus
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="prenom.nom@alyxa.fr"
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
        <Erreur message={erreur} />
        <Bouton
          type="submit"
          variante="primaire"
          disabled={occupe}
          className="w-full justify-center py-2.5"
        >
          {occupe ? <Loader2 size={16} className="animate-spin" /> : inscription ? 'Créer mon compte' : 'Se connecter'}
        </Bouton>
      </form>

      <button
        onClick={() => {
          setErreur(null)
          setEcran(inscription ? 'connexion' : 'inscription')
        }}
        className="mt-4 w-full text-center text-[12.5px] text-encre-2 hover:underline"
      >
        {inscription ? 'J’ai déjà un compte' : 'Première venue ? Créer mon compte'}
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
  const brut = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : ''
  if (/invalid login credentials/i.test(brut)) return 'Adresse ou mot de passe incorrect.'
  if (/user already registered/i.test(brut)) return 'Un compte existe déjà avec cette adresse. Connectez-vous.'
  if (/password should be at least/i.test(brut)) return 'Le mot de passe doit faire au moins 8 caractères.'
  if (/email not confirmed/i.test(brut)) return 'Confirmez d’abord votre adresse via le lien reçu par mail.'
  if (/n’est pas autorisé|n'est pas autorisé/i.test(brut)) return brut
  if (/rate limit|too many/i.test(brut)) return 'Trop de tentatives. Réessayez dans quelques minutes.'
  return brut || 'Une erreur est survenue.'
}
