import { AlertTriangle } from 'lucide-react'
import { Avatar, Bouton, EtiquetteStatut, Modale } from '@/components/ui'
import { useStore } from '@/lib/store'
import { formatDate } from '@/lib/dates'
import type { Doublon } from '@/lib/fiche'
import { LIBELLE_ORGANISATION } from '@/lib/types'

/**
 * Signale qu'une fiche tres proche existe deja — et montre laquelle.
 *
 * Elle n'interdit rien : un cabinet peut tres bien revenir avec un second
 * praticien, c'est meme le modele d'Alyxa. On informe, la personne tranche.
 */
export default function AlerteDoublons({
  doublons,
  onVoirFiche,
  onCreerQuandMeme,
  onAnnuler,
}: {
  doublons: Doublon[]
  onVoirFiche: (leadId: string) => void
  onCreerQuandMeme: () => void
  onAnnuler: () => void
}) {
  const { membreDe, regionDe } = useStore()
  const plusieurs = doublons.length > 1

  return (
    <Modale
      titre={
        <span className="flex items-center gap-2">
          <AlertTriangle size={18} className="shrink-0 text-[var(--color-attention)]" />
          {plusieurs ? 'Ces leads existent peut-être déjà' : 'Ce lead existe peut-être déjà'}
        </span>
      }
      sous={`Vérifiez avant de créer. Si ce n’est pas le même praticien, continuez.`}
      onFermer={onAnnuler}
    >
      <div className="space-y-3 px-6 py-5">
        {doublons.map(({ lead, raison, certain }) => {
          const apporteur = membreDe(lead.apporteParId)
          return (
            <div key={lead.id} className="rounded-lg border border-bord bg-fond px-4 py-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${
                    certain
                      ? 'bg-[var(--color-critique-fond)] text-[var(--color-critique-fonce)]'
                      : 'bg-[var(--color-attention-fond)] text-[var(--color-attention-fonce)]'
                  }`}
                >
                  {raison}
                </span>
                <EtiquetteStatut statut={lead.statut} />
              </div>

              <div className="mt-2.5 text-[14px] font-semibold">{lead.structure}</div>
              <div className="text-[13px] text-encre-2">{lead.contact}</div>
              <div className="mt-0.5 text-[12.5px] text-encre-3">
                {[lead.ville, lead.codePostal].filter(Boolean).join(' ') || regionDe(lead.regionId)}
                {lead.telephone && ` · ${lead.telephone}`}
              </div>

              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-bord pt-2.5 text-[12.5px] text-encre-3">
                <span className="flex items-center gap-1.5">
                  <Avatar membre={apporteur} taille={20} />
                  Apporté par {apporteur?.nom ?? '—'}
                  {apporteur && ` (${LIBELLE_ORGANISATION[apporteur.organisation]})`} le{' '}
                  {formatDate(lead.transmisLe)}
                </span>
                <button
                  type="button"
                  onClick={() => onVoirFiche(lead.id)}
                  className="font-medium text-[var(--color-marque)] hover:underline"
                >
                  Voir la fiche
                </button>
              </div>
            </div>
          )
        })}

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Bouton type="button" onClick={onAnnuler}>
            Annuler
          </Bouton>
          <Bouton type="button" variante="primaire" onClick={onCreerQuandMeme}>
            Créer quand même
          </Bouton>
        </div>
      </div>
    </Modale>
  )
}
