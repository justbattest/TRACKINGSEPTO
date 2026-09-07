import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { Bouton, Champ, classesSaisie } from '@/components/ui'
import { useStore } from '@/lib/store'

/**
 * Formulaire public rattache a un commercial via son lien /l/<slug>.
 *
 * C'est le mecanisme d'attribution : le lead entre deja rattache au bon
 * commercial et horodate, sans aucune saisie interne.
 */
export default function Captation() {
  const { slug } = useParams<{ slug: string }>()
  const { commerciaux, ajouterLead } = useStore()
  const commercial = commerciaux.find((c) => c.slug === slug)
  const [envoye, setEnvoye] = useState(false)
  const [valeurs, setValeurs] = useState({
    cabinet: '',
    praticien: '',
    email: '',
    telephone: '',
    ville: '',
    codePostal: '',
  })

  const maj = (cle: keyof typeof valeurs) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValeurs((v) => ({ ...v, [cle]: e.target.value }))

  if (!commercial) {
    return (
      <Cadre>
        <h1 className="text-[17px] font-semibold">Lien invalide</h1>
        <p className="mt-2 text-[13.5px] text-encre-2">
          Ce lien de recommandation n’existe pas ou n’est plus actif. Rapprochez-vous de votre
          contact Septodont.
        </p>
      </Cadre>
    )
  }

  if (envoye) {
    return (
      <Cadre>
        <CheckCircle2 size={34} className="mx-auto text-[var(--color-bien)]" />
        <h1 className="mt-3 text-center text-[18px] font-semibold">Merci, c’est enregistré</h1>
        <p className="mt-2 text-center text-[13.5px] leading-relaxed text-encre-2">
          L’équipe Alyxa vous recontacte sous 24 h ouvrées pour vous présenter l’outil et activer
          votre remise partenaire Septodont de 10 %.
        </p>
      </Cadre>
    )
  }

  return (
    <Cadre>
      <div className="mb-5">
        <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-marque-clair)] px-3 py-1 text-[12px] font-medium text-[var(--color-marque-fonce)]">
          Recommandé par {commercial.nom} · Septodont
        </div>
        <h1 className="mt-3 text-[20px] font-semibold tracking-tight">
          Découvrir Alyxa avec 10 % de remise
        </h1>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-encre-2">
          Laissez vos coordonnées, on vous rappelle pour une démo. La remise partenaire Septodont
          s’applique automatiquement à votre abonnement.
        </p>
      </div>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          ajouterLead({ ...valeurs, commercialId: commercial.id, regionId: commercial.regionId })
          setEnvoye(true)
        }}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Champ label="Nom du cabinet *">
            <input required value={valeurs.cabinet} onChange={maj('cabinet')} className={classesSaisie} />
          </Champ>
          <Champ label="Praticien *">
            <input required value={valeurs.praticien} onChange={maj('praticien')} className={classesSaisie} />
          </Champ>
          <Champ label="Email *">
            <input required type="email" value={valeurs.email} onChange={maj('email')} className={classesSaisie} />
          </Champ>
          <Champ label="Téléphone *">
            <input required value={valeurs.telephone} onChange={maj('telephone')} className={classesSaisie} />
          </Champ>
          <Champ label="Ville">
            <input value={valeurs.ville} onChange={maj('ville')} className={classesSaisie} />
          </Champ>
          <Champ label="Code postal">
            <input value={valeurs.codePostal} onChange={maj('codePostal')} className={classesSaisie} />
          </Champ>
        </div>
        <Bouton type="submit" variante="primaire" className="w-full justify-center py-2.5">
          Être recontacté
        </Bouton>
        <p className="text-center text-[11.5px] leading-relaxed text-encre-3">
          Vos coordonnées professionnelles sont transmises à Alyxa dans le seul but de vous
          recontacter. Vous pouvez demander leur suppression à tout moment.
        </p>
      </form>
    </Cadre>
  )
}

function Cadre({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-fond px-4 py-10">
      <div className="w-full max-w-xl rounded-xl border border-bord bg-carte px-6 py-7 shadow-sm">
        {children}
      </div>
    </div>
  )
}
