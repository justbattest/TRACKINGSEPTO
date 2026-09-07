import { useState } from 'react'
import { Check, Mail, MapPin, Phone, User } from 'lucide-react'
import { Bouton, EtiquetteStatut, Modale } from '@/components/ui'
import { useStore } from '@/lib/store'
import { cascade, euros, pourcent } from '@/lib/engine'
import { formatDate, libellePeriode } from '@/lib/dates'
import { ETAPES_ENTONNOIR, LIBELLE_ETAPE, type Etape, type Plan } from '@/lib/types'

/** Fiche complete d'un lead : coordonnees, parcours, contrat et echeancier. */
export default function FicheLead({ leadId, onFermer }: { leadId: string; onFermer: () => void }) {
  const { leadDe, commercialDe, regionDe, contratDuLead, commissions, changerEtape, declarerChurn } =
    useStore()
  const lead = leadDe(leadId)
  const [plan, setPlan] = useState<Plan>('annuel')

  if (!lead) return null

  const contrat = contratDuLead(lead.id)
  const detail = contrat ? cascade(contrat) : null
  const echeances = commissions.filter((c) => c.contratId === contrat?.id)
  const commercial = commercialDe(lead.commercialId)
  const clos = lead.etape === 'perdu' || lead.etape === 'churn'

  /** Etapes encore proposables : on n'avance jamais en arriere. */
  const indexActuel = ETAPES_ENTONNOIR.indexOf(lead.etape)
  const suivantes = ETAPES_ENTONNOIR.filter((_, i) => i > indexActuel)

  return (
    <Modale titre={lead.cabinet} onFermer={onFermer} large>
      <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
        <div className="grid grid-cols-1 gap-x-6 gap-y-2.5 text-[13.5px] sm:grid-cols-2">
          <Info icone={<User size={14} />} valeur={lead.praticien} />
          <Info icone={<MapPin size={14} />} valeur={`${lead.ville} ${lead.codePostal} · ${regionDe(lead.regionId)}`} />
          <Info icone={<Mail size={14} />} valeur={lead.email || '—'} />
          <Info icone={<Phone size={14} />} valeur={lead.telephone || '—'} />
        </div>

        <div className="rounded-lg bg-fond px-4 py-3 text-[13px]">
          Apporté par <strong className="font-semibold">{commercial?.nom}</strong> le{' '}
          <strong className="font-semibold">{formatDate(lead.recuLe)}</strong>
          {commercial && (
            <span className="text-encre-3"> · lien de captation /l/{commercial.slug}</span>
          )}
        </div>

        {/* Parcours horodate : c'est la piece justificative en cas de litige. */}
        <section>
          <h3 className="mb-3 text-[13px] font-semibold text-encre-2">Parcours</h3>
          <ol className="space-y-0">
            {lead.historique.map((h, i) => (
              <li key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-marque)]" />
                  {i < lead.historique.length - 1 && <span className="w-px flex-1 bg-bord" />}
                </div>
                <div className="pb-3.5">
                  <div className="text-[13.5px] font-medium">{LIBELLE_ETAPE[h.etape]}</div>
                  <div className="text-[12px] text-encre-3">
                    {formatDate(h.date)} · {h.auteur}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {contrat && detail ? (
          <section className="rounded-xl border border-bord">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-bord px-4 py-3">
              <h3 className="text-[13.5px] font-semibold">
                Contrat {contrat.plan} · démarré le {formatDate(contrat.debutLe)}
              </h3>
              {contrat.churnLe ? (
                <span className="rounded-full bg-[var(--color-critique-fond)] px-2.5 py-1 text-[12px] font-medium text-[#b02a2a]">
                  Résilié le {formatDate(contrat.churnLe)}
                </span>
              ) : (
                <Bouton
                  variante="discret"
                  onClick={() => declarerChurn(contrat.id, new Date().toISOString())}
                >
                  Déclarer une résiliation
                </Bouton>
              )}
            </header>

            {/* Cascade de prix : d'ou vient chaque euro et ou il va. */}
            <div className="divide-y divide-bord text-[13.5px]">
              <Ligne libelle="Prix catalogue Alyxa" valeur={euros(detail.prixCatalogue)} suffixe="/ mois" />
              <Ligne
                libelle={`Remise Septodont (${pourcent(contrat.tauxRemise)})`}
                valeur={`− ${euros(detail.remise)}`}
                suffixe="/ mois"
                ton="critique"
              />
              <Ligne libelle="Payé par le cabinet" valeur={euros(detail.prixPaye)} suffixe="/ mois" fort />
              <Ligne
                libelle={`Commission ${commercial?.nom ?? 'commercial'} (${pourcent(contrat.tauxCommission)})`}
                valeur={`− ${euros(detail.commission)}`}
                suffixe="/ mois"
                ton="critique"
              />
              <Ligne libelle="Reste à Alyxa" valeur={euros(detail.netAlyxa)} suffixe="/ mois" fort ton="bien" />
            </div>

            <div className="border-t border-bord px-4 py-3">
              <div className="mb-2.5 text-[13px] font-semibold text-encre-2">
                Échéancier de commission · {echeances.length} mois
              </div>
              <div className="flex flex-wrap gap-1.5">
                {echeances.map((e) => (
                  <span
                    key={e.id}
                    title={`${libellePeriode(e.periode)} — ${euros(e.montant)}`}
                    className="rounded-md border border-bord px-2 py-1 text-[11.5px]"
                  >
                    <span className="text-encre-2">{libellePeriode(e.periode)}</span>{' '}
                    <EtiquetteStatut statut={e.statut} />
                  </span>
                ))}
              </div>
            </div>
          </section>
        ) : (
          !clos && (
            <section className="rounded-xl border border-bord px-4 py-4">
              <h3 className="text-[13.5px] font-semibold">Faire avancer ce lead</h3>
              <p className="mt-1 mb-3 text-[12.5px] text-encre-2">
                Passer le lead en « Signé » crée le contrat et génère automatiquement tout
                l’échéancier de commission du commercial.
              </p>

              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-[12.5px] text-encre-2">Formule choisie :</span>
                {(['annuel', 'mensuel'] as Plan[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlan(p)}
                    className={`rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                      plan === p
                        ? 'border-[var(--color-marque)] bg-[var(--color-marque-clair)] text-[var(--color-marque-fonce)]'
                        : 'border-bord-fort text-encre-2 hover:bg-fond'
                    }`}
                  >
                    {p === 'annuel' ? 'Annuel — 179 €' : 'Mensuel — 224 €'}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {suivantes.map((e) => (
                  <Bouton
                    key={e}
                    variante={e === 'signe' ? 'primaire' : 'secondaire'}
                    onClick={() => changerEtape(lead.id, e, { plan })}
                  >
                    {e === 'signe' && <Check size={14} />}
                    {LIBELLE_ETAPE[e]}
                  </Bouton>
                ))}
                <Bouton onClick={() => changerEtape(lead.id, 'perdu' as Etape)}>Marquer perdu</Bouton>
              </div>
            </section>
          )
        )}
      </div>
    </Modale>
  )
}

function Info({ icone, valeur }: { icone: React.ReactNode; valeur: string }) {
  return (
    <div className="flex items-center gap-2 text-encre-2">
      <span className="text-encre-3">{icone}</span>
      {valeur}
    </div>
  )
}

function Ligne({
  libelle,
  valeur,
  suffixe,
  fort,
  ton,
}: {
  libelle: string
  valeur: string
  suffixe?: string
  fort?: boolean
  ton?: 'bien' | 'critique'
}) {
  const couleur =
    ton === 'bien' ? 'text-[var(--color-bien)]' : ton === 'critique' ? 'text-[var(--color-critique)]' : 'text-encre'
  return (
    <div className={`flex items-center justify-between px-4 py-2.5 ${fort ? 'bg-fond' : ''}`}>
      <span className={fort ? 'font-medium' : 'text-encre-2'}>{libelle}</span>
      <span className={`tabulaire ${fort ? 'font-semibold' : ''} ${couleur}`}>
        {valeur}
        {suffixe && <span className="ml-1 text-[12px] font-normal text-encre-3">{suffixe}</span>}
      </span>
    </div>
  )
}
