import { useMemo, useState } from 'react'
import { Check, Copy, Link2 } from 'lucide-react'
import Entete from '@/components/Entete'
import { Carte, Vide } from '@/components/ui'
import { perfCommerciaux } from '@/lib/agregats'
import { euros, pourcent, total } from '@/lib/engine'
import { useStore } from '@/lib/store'

export default function Commerciaux() {
  const { commerciaux, leads, contrats, commissions, regionDe } = useStore()
  const perf = useMemo(
    () => perfCommerciaux(commerciaux, leads, contrats, commissions),
    [commerciaux, leads, contrats, commissions],
  )
  const maxMrr = Math.max(...perf.map((p) => p.mrrApporte), 1)

  return (
    <>
      <Entete
        titre="Commerciaux Septodont"
        sous="Qui apporte quoi, ce que ça nous rapporte, et ce qu’on lui doit."
      >
        <div className="text-right text-[13px] text-encre-2">
          Total dû à ce jour
          <div className="tabulaire text-[19px] font-semibold text-[var(--color-attention)]">
            {euros(total(commissions, ['a_payer']))}
          </div>
        </div>
      </Entete>

      <div className="space-y-4 px-6 py-6 lg:px-8">
        {perf.length === 0 ? (
          <Vide message="Aucun commercial enregistré." />
        ) : (
          perf.map((p) => (
            <Carte key={p.commercial.id}>
              <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <h3 className="text-[15px] font-semibold">{p.commercial.nom}</h3>
                  <p className="mt-0.5 text-[12.5px] text-encre-3">
                    {regionDe(p.commercial.regionId)} · {p.commercial.email}
                  </p>
                  <LienCaptation slug={p.commercial.slug} />
                </div>

                <div className="grid shrink-0 grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
                  <Mesure libelle="Leads envoyés" valeur={String(p.leads)} />
                  <Mesure
                    libelle="Signés"
                    valeur={String(p.signatures)}
                    detail={`${pourcent(p.tauxConversion, 1)} · ${p.licencesApportees} licence${p.licencesApportees > 1 ? 's' : ''}`}
                  />
                  <Mesure libelle="Revenu apporté" valeur={euros(p.mrrApporte)} detail="par mois" />
                  <Mesure
                    libelle="À lui payer"
                    valeur={euros(p.commissionsDues)}
                    detail={`${euros(p.commissionsPayees)} déjà versés`}
                    ton="attention"
                  />
                </div>
              </div>

              {/* Barre de contribution relative au meilleur commercial. */}
              <div className="px-5 pb-4">
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-neutre-fond)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-marque)] transition-[width] duration-500"
                    style={{ width: `${(p.mrrApporte / maxMrr) * 100}%` }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-encre-3">
                  <span>
                    Gain total sur la durée des contrats en cours :{' '}
                    <strong className="font-semibold text-encre-2">{euros(p.gainTotal)}</strong>
                  </span>
                  {p.delaiSignature !== null && (
                    <span>
                      Délai médian lead → signature :{' '}
                      <strong className="font-semibold text-encre-2">{p.delaiSignature} jours</strong>
                    </span>
                  )}
                </div>
              </div>
            </Carte>
          ))
        )}
      </div>
    </>
  )
}

/**
 * Lien personnel du commercial. C'est le mecanisme d'attribution : un lead
 * arrive par ce lien est rattache a son auteur sans aucune saisie manuelle.
 */
function LienCaptation({ slug }: { slug: string }) {
  const [copie, setCopie] = useState(false)
  const lien = `${window.location.origin}${window.location.pathname}#/l/${slug}`

  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(lien)
        setCopie(true)
        setTimeout(() => setCopie(false), 1800)
      }}
      className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-bord bg-fond px-2.5 py-1.5 text-[12px] text-encre-2 transition-colors hover:border-bord-fort hover:text-encre"
    >
      <Link2 size={13} />
      <span className="tabulaire">/l/{slug}</span>
      {copie ? (
        <>
          <Check size={13} className="text-[var(--color-bien)]" />
          <span className="text-[var(--color-bien)]">Copié</span>
        </>
      ) : (
        <Copy size={13} />
      )}
    </button>
  )
}

function Mesure({
  libelle,
  valeur,
  detail,
  ton,
}: {
  libelle: string
  valeur: string
  detail?: string
  ton?: 'attention'
}) {
  return (
    <div>
      <div className="text-[12px] text-encre-3">{libelle}</div>
      <div
        className={`tabulaire mt-0.5 text-[17px] font-semibold ${
          ton === 'attention' ? 'text-[var(--color-attention)]' : 'text-encre'
        }`}
      >
        {valeur}
      </div>
      {detail && <div className="text-[11.5px] text-encre-3">{detail}</div>}
    </div>
  )
}
