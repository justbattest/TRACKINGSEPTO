import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Bouton, Champ, classesSaisie, Modale } from '@/components/ui'
import ChoixApporteur from '@/components/ChoixApporteur'
import { useStore, type LeadASaisir } from '@/lib/store'
import { AUTRE, LIBELLE_ORGANISATION, MOTIFS, type Organisation } from '@/lib/types'

/** Les champs d'un lead en cours de saisie. */
export interface Brouillon {
  structure: string
  contact: string
  telephone: string
  email: string
  ville: string
  codePostal: string
  regionId: string
  motif: string
  message: string
}

export const brouillonVide = (regionId: string): Brouillon => ({
  structure: '',
  contact: '',
  telephone: '',
  email: '',
  ville: '',
  codePostal: '',
  regionId,
  motif: '',
  message: '',
})

/** Un lead est saisissable des qu'on sait de quelle structure et de qui il parle. */
export const brouillonComplet = (b: Brouillon): boolean =>
  b.structure.trim().length > 0 && b.contact.trim().length > 0

export default function FormulaireLead({ onFermer }: { onFermer: () => void }) {
  const { regions, ajouterLeads, moi, membreDe } = useStore()

  // Par defaut, on se designe soi-meme : c'est le cas le plus frequent.
  const [apporteParId, setApporteParId] = useState(moi?.id ?? '')
  const [brouillon, setBrouillon] = useState<Brouillon>(() => brouillonVide(regions[0]?.id ?? ''))

  const apporteur = membreDe(apporteParId)
  const cible: Organisation | undefined = apporteur && AUTRE[apporteur.organisation]
  const pret = Boolean(apporteur) && brouillonComplet(brouillon) && Boolean(moi)

  function valider() {
    if (!pret || !moi || !apporteur) return
    const lots: LeadASaisir[] = [
      {
        lead: {
          apporteParId: apporteur.id,
          transmisParId: moi.id,
          structure: brouillon.structure,
          contact: brouillon.contact,
          telephone: brouillon.telephone,
          email: brouillon.email,
          ville: brouillon.ville,
          codePostal: brouillon.codePostal,
          regionId: brouillon.regionId,
          motif: brouillon.motif || MOTIFS[AUTRE[apporteur.organisation]][0],
        },
        message: brouillon.message,
      },
    ]
    ajouterLeads(lots)
    onFermer()
  }

  return (
    <Modale titre="Nouveau lead" onFermer={onFermer} large>
      <form
        className="space-y-5 px-6 py-5"
        onSubmit={(e) => {
          e.preventDefault()
          valider()
        }}
      >
        {/* L'apporteur d'abord : c'est lui qui decide a qui le lead est compte. */}
        <Champ label="Apporté par *" sansLiaison>
          <ChoixApporteur valeur={apporteParId} onChange={setApporteParId} autoFocus />
        </Champ>

        {apporteur && cible && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-fond px-3.5 py-2.5 text-[12.5px] text-encre-2">
            <span>
              Compté pour{' '}
              <strong className="font-semibold text-encre">
                {LIBELLE_ORGANISATION[apporteur.organisation]}
              </strong>
            </span>
            <ArrowRight size={13} className="text-encre-3" />
            <span>
              suivi par{' '}
              <strong className="font-semibold text-encre">{LIBELLE_ORGANISATION[cible]}</strong>
            </span>
          </div>
        )}

        <BlocLead
          valeur={brouillon}
          onChange={setBrouillon}
          cible={cible}
          regions={regions}
        />

        <div className="flex justify-end gap-2">
          <Bouton type="button" onClick={onFermer}>
            Annuler
          </Bouton>
          <Bouton type="submit" variante="primaire" disabled={!pret}>
            Enregistrer le lead
          </Bouton>
        </div>
      </form>
    </Modale>
  )
}

/** Les champs d'un seul lead. Rendu une fois aujourd'hui, N fois demain. */
export function BlocLead({
  valeur,
  onChange,
  cible,
  regions,
}: {
  valeur: Brouillon
  onChange: (b: Brouillon) => void
  cible: Organisation | undefined
  regions: { id: string; nom: string }[]
}) {
  const maj =
    (cle: keyof Brouillon) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      onChange({ ...valeur, [cle]: e.target.value })

  // Les motifs sont ceux de l'equipe qui recoit le lead.
  const motifs = cible ? MOTIFS[cible] : []
  const motif = motifs.includes(valeur.motif) ? valeur.motif : (motifs[0] ?? '')

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Champ label="Structure *">
          <input
            required
            value={valeur.structure}
            onChange={maj('structure')}
            placeholder="Cabinet dentaire du Port"
            className={classesSaisie}
          />
        </Champ>
        <Champ label="Praticien ou contact *">
          <input
            required
            value={valeur.contact}
            onChange={maj('contact')}
            placeholder="Dr Claire Lambert"
            className={classesSaisie}
          />
        </Champ>
        <Champ label="Téléphone">
          <input value={valeur.telephone} onChange={maj('telephone')} placeholder="04 91 00 00 00" className={classesSaisie} />
        </Champ>
        <Champ label="Email">
          <input type="email" value={valeur.email} onChange={maj('email')} placeholder="contact@cabinet.fr" className={classesSaisie} />
        </Champ>
        <Champ label="Ville">
          <input value={valeur.ville} onChange={maj('ville')} placeholder="Marseille" className={classesSaisie} />
        </Champ>
        <Champ label="Code postal">
          <input value={valeur.codePostal} onChange={maj('codePostal')} placeholder="13008" className={classesSaisie} />
        </Champ>
        <Champ label="Région">
          <select value={valeur.regionId} onChange={maj('regionId')} className={classesSaisie}>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.nom}</option>
            ))}
          </select>
        </Champ>
        <Champ label="Motif">
          <select
            value={motif}
            onChange={maj('motif')}
            disabled={!cible}
            className={classesSaisie}
          >
            {motifs.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </Champ>
      </div>

      <Champ
        label="Mot d’accompagnement"
        aide={
          cible
            ? `Il ouvre la discussion. C’est ce que l’équipe ${LIBELLE_ORGANISATION[cible]} lira en premier.`
            : 'Il ouvre la discussion sur le lead.'
        }
      >
        <textarea
          value={valeur.message}
          onChange={maj('message')}
          rows={3}
          placeholder="Le praticien pose beaucoup d’implants, il est ouvert à être recontacté."
          className={`${classesSaisie} resize-y`}
        />
      </Champ>
    </div>
  )
}
