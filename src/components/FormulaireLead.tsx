import { useState } from 'react'
import { ArrowRight, Plus, X } from 'lucide-react'
import AlerteDoublons, { type GroupeDoublons } from '@/components/AlerteDoublons'
import { Bouton, Champ, classesSaisie, Modale } from '@/components/ui'
import ChoixApporteur from '@/components/ChoixApporteur'
import { useStore, type LeadASaisir } from '@/lib/store'
import { AUTRE, LIBELLE_ORGANISATION, MOTIFS, type Organisation } from '@/lib/types'

/** Les champs d'un lead en cours de saisie. */
export interface Brouillon {
  /** Identite stable du bloc : les leads d'un lot vont et viennent. */
  cle: string
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

let compteur = 0

export const brouillonVide = (regionId: string): Brouillon => ({
  cle: `b${++compteur}`,
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

/**
 * Saisie d'un ou plusieurs leads.
 *
 * Un apporteur commun en haut — c'est le cas reel : quand quelqu'un saisit
 * cinq leads d'affilee, ils viennent tous de lui — puis autant de blocs que
 * de leads. Tout part en une seule validation, donc une seule insertion et,
 * demain, un seul email.
 */
export default function FormulaireLead({
  onFermer,
  onOuvrirLead,
}: {
  onFermer: () => void
  /** Pour aller voir une fiche existante signalee comme doublon. */
  onOuvrirLead?: (id: string) => void
}) {
  const { regions, ajouterLeads, moi, membreDe, doublons } = useStore()
  const regionParDefaut = regions[0]?.id ?? ''

  // Par defaut, on se designe soi-meme : c'est le cas le plus frequent.
  const [apporteParId, setApporteParId] = useState(moi?.id ?? '')
  const [blocs, setBlocs] = useState<Brouillon[]>(() => [brouillonVide(regionParDefaut)])
  /** Un seul bloc deplie a la fois : la page reste lisible a dix leads. */
  const [deplie, setDeplie] = useState(0)
  const [alerte, setAlerte] = useState<GroupeDoublons[] | null>(null)

  const apporteur = membreDe(apporteParId)
  const cible: Organisation | undefined = apporteur && AUTRE[apporteur.organisation]
  const tousComplets = blocs.every(brouillonComplet)
  const pret = Boolean(apporteur) && Boolean(moi) && tousComplets

  function majBloc(i: number, b: Brouillon) {
    setBlocs((actuels) => actuels.map((a, j) => (j === i ? b : a)))
  }

  function ajouterBloc() {
    setBlocs((actuels) => [...actuels, brouillonVide(regionParDefaut)])
    setDeplie(blocs.length)
  }

  function retirerBloc(i: number) {
    setBlocs((actuels) => actuels.filter((_, j) => j !== i))
    // On garde un bloc ouvert, sans jamais sortir de la liste.
    setDeplie((d) => Math.max(0, d > i ? d - 1 : Math.min(d, blocs.length - 2)))
  }

  function enregistrer() {
    if (!pret || !moi || !apporteur) return
    const lots: LeadASaisir[] = blocs.map((b) => ({
      lead: {
        apporteParId: apporteur.id,
        transmisParId: moi.id,
        structure: b.structure,
        contact: b.contact,
        telephone: b.telephone,
        email: b.email,
        ville: b.ville,
        codePostal: b.codePostal,
        regionId: b.regionId,
        motif: b.motif || MOTIFS[AUTRE[apporteur.organisation]][0],
      },
      message: b.message,
    }))
    ajouterLeads(lots)
    onFermer()
  }

  /** On signale les doublons probables avant de creer, jamais apres. */
  function valider() {
    if (!pret) return
    const groupes = blocs
      .map((b, i) => ({
        libelle: blocs.length > 1 ? `Lead ${i + 1} · ${b.structure}` : undefined,
        doublons: doublons(b),
      }))
      .filter((g) => g.doublons.length > 0)

    if (groupes.length > 0) {
      setAlerte(groupes)
      return
    }
    enregistrer()
  }

  if (alerte) {
    return (
      <AlerteDoublons
        groupes={alerte}
        onVoirFiche={(id) => {
          onFermer()
          onOuvrirLead?.(id)
        }}
        onCreerQuandMeme={enregistrer}
        onAnnuler={() => setAlerte(null)}
      />
    )
  }

  return (
    <Modale
      titre={blocs.length > 1 ? `Nouveaux leads (${blocs.length})` : 'Nouveau lead'}
      onFermer={onFermer}
      large
    >
      <form
        className="space-y-5 px-6 py-5"
        onSubmit={(e) => {
          e.preventDefault()
          valider()
        }}
      >
        {/* L'apporteur d'abord, et commun au lot : c'est lui qui decide a qui
            les leads sont comptes. Chacun reste reattribuable depuis sa fiche. */}
        <Champ
          label="Apporté par *"
          aide={blocs.length > 1 ? 'Commun aux leads saisis ici.' : undefined}
          sansLiaison
        >
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

        <div className="space-y-2.5">
          {blocs.map((bloc, i) =>
            i === deplie ? (
              <div
                key={bloc.cle}
                className={
                  blocs.length > 1
                    ? 'rounded-xl border border-bord-fort bg-carte px-4 py-4'
                    : undefined
                }
              >
                {blocs.length > 1 && (
                  <EnteteBloc numero={i + 1} onRetirer={() => retirerBloc(i)} />
                )}
                <BlocLead
                  valeur={bloc}
                  onChange={(b) => majBloc(i, b)}
                  cible={cible}
                  regions={regions}
                />
              </div>
            ) : (
              <LigneRepliee
                key={bloc.cle}
                numero={i + 1}
                bloc={bloc}
                onOuvrir={() => setDeplie(i)}
                onRetirer={() => retirerBloc(i)}
              />
            ),
          )}
        </div>

        <button
          type="button"
          onClick={ajouterBloc}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-bord-fort py-2.5 text-[13px] font-medium text-encre-2 transition-colors hover:border-[var(--color-marque)] hover:bg-fond hover:text-[var(--color-marque)]"
        >
          <Plus size={15} /> Ajouter un autre lead
        </button>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {!tousComplets && (
            <span className="mr-auto text-[12.5px] text-encre-3">
              Structure et praticien sont obligatoires sur chaque lead.
            </span>
          )}
          <Bouton type="button" onClick={onFermer}>
            Annuler
          </Bouton>
          <Bouton type="submit" variante="primaire" disabled={!pret}>
            {blocs.length > 1 ? `Créer les ${blocs.length} leads` : 'Enregistrer le lead'}
          </Bouton>
        </div>
      </form>
    </Modale>
  )
}

function EnteteBloc({ numero, onRetirer }: { numero: number; onRetirer: () => void }) {
  return (
    <div className="mb-3.5 flex items-center justify-between gap-2 border-b border-bord pb-2.5">
      <span className="text-[12px] font-semibold tracking-wide text-encre-3 uppercase">
        Lead {numero}
      </span>
      <button
        type="button"
        onClick={onRetirer}
        aria-label={`Retirer le lead ${numero}`}
        className="rounded-lg p-1 text-encre-3 transition-colors hover:bg-fond hover:text-[var(--color-critique)]"
      >
        <X size={15} />
      </button>
    </div>
  )
}

/** Un lead deja saisi, resume en une ligne. Un clic le rouvre. */
function LigneRepliee({
  numero,
  bloc,
  onOuvrir,
  onRetirer,
}: {
  numero: number
  bloc: Brouillon
  onOuvrir: () => void
  onRetirer: () => void
}) {
  const complet = brouillonComplet(bloc)
  const resume = [bloc.structure, bloc.contact, bloc.ville].map((v) => v.trim()).filter(Boolean)

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3.5 py-2.5 ${
        complet ? 'border-bord bg-fond' : 'border-[var(--color-attention)] bg-[var(--color-attention-fond)]'
      }`}
    >
      <button
        type="button"
        onClick={onOuvrir}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left text-[13px]"
      >
        <span className="shrink-0 text-[12px] font-semibold text-encre-3">Lead {numero}</span>
        <span className="min-w-0 truncate text-encre-2">
          {resume.length ? resume.join(' · ') : 'À compléter'}
        </span>
      </button>
      <button
        type="button"
        onClick={onRetirer}
        aria-label={`Retirer le lead ${numero}`}
        className="shrink-0 rounded-lg p-1 text-encre-3 transition-colors hover:bg-carte hover:text-[var(--color-critique)]"
      >
        <X size={15} />
      </button>
    </div>
  )
}

/** Les champs d'un seul lead. */
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
