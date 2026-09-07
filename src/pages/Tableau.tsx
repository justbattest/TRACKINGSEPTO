import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AlertTriangle, ArrowRight, TrendingUp } from 'lucide-react'
import Entete from '@/components/Entete'
import { Carte, EtiquetteEtape, Tuile, Vide } from '@/components/ui'
import { AXE, GRILLE, Infobulle, Legende, RAMPE_ORDINALE, SERIES } from '@/components/graphiques'
import { entonnoir, leadsDormants, perfCommerciaux, perfRegions, serieMensuelle, tauxChurn } from '@/lib/agregats'
import { euros, eurosCourt, margeMensuelle, mrr, pourcent, total } from '@/lib/engine'
import { formatDate, libellePeriode, periodeDe } from '@/lib/dates'
import { LIBELLE_ETAPE } from '@/lib/types'
import { useStore } from '@/lib/store'

export default function Tableau() {
  const { leads, contrats, commissions, commerciaux, regions, regionDe } = useStore()
  const moisCourant = periodeDe(new Date())

  const serie = useMemo(
    () => serieMensuelle(leads, contrats, commissions),
    [leads, contrats, commissions],
  )
  const etapes = useMemo(() => entonnoir(leads), [leads])
  const commerciauxTries = useMemo(
    () => perfCommerciaux(commerciaux, leads, contrats, commissions),
    [commerciaux, leads, contrats, commissions],
  )
  const regionsTriees = useMemo(() => perfRegions(regions, leads, contrats), [regions, leads, contrats])
  const dormants = useMemo(() => leadsDormants(leads), [leads])

  const aPayer = total(commissions, ['a_payer'])
  const aPayerCeMois = total(
    commissions.filter((c) => c.periode === moisCourant),
    ['a_payer'],
  )
  const revenuMensuel = mrr(contrats)
  const marge = margeMensuelle(contrats)
  const signes = etapes[etapes.length - 1].atteint
  const leadsDuMois = serie[serie.length - 1]?.leads ?? 0
  const leadsMoisPrecedent = serie[serie.length - 2]?.leads ?? 0

  return (
    <>
      <Entete
        titre="Tableau de bord"
        sous="Tout ce que Septodont nous rapporte, et tout ce qu’on leur doit, en un coup d’œil."
      >
        <div className="rounded-lg bg-[var(--color-marque-clair)] px-3.5 py-2 text-[12.5px] text-[var(--color-marque-fonce)]">
          Mois en cours · <strong className="font-semibold">{libellePeriode(moisCourant)}</strong>
        </div>
      </Entete>

      <div className="space-y-6 px-6 py-6 lg:px-8">
        {/* Les 4 chiffres qui repondent aux 4 questions du deal. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Tuile
            libelle="Leads reçus au total"
            valeur={String(leads.length)}
            detail={`${leadsDuMois} ce mois-ci · ${leadsMoisPrecedent} le mois dernier`}
          />
          <Tuile
            libelle="Cabinets signés"
            valeur={String(signes)}
            detail={`${pourcent(leads.length ? signes / leads.length : 0, 1)} des leads reçus`}
          />
          <Tuile
            libelle="Revenu mensuel encaissé"
            valeur={euros(revenuMensuel)}
            detail={`dont ${euros(marge)} de marge après commissions`}
            ton="bien"
            icone={<TrendingUp size={14} />}
          />
          <Tuile
            libelle="Commissions à payer"
            valeur={euros(aPayer)}
            detail={`dont ${euros(aPayerCeMois)} au titre de ${libellePeriode(moisCourant)}`}
            ton="attention"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Carte
            titre="Leads reçus et signatures"
            aide="Volume envoyé par Septodont chaque mois, et ce qui s’est transformé."
            className="xl:col-span-2"
            action={
              <Legende
                items={[
                  { libelle: 'Leads reçus', couleur: SERIES.s1 },
                  { libelle: 'Signatures', couleur: SERIES.s3 },
                ]}
              />
            }
          >
            <div className="px-3 pt-5 pb-3">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={serie} barGap={2} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid {...GRILLE} />
                  <XAxis dataKey="periode" tickFormatter={libellePeriode} {...AXE} />
                  <YAxis width={34} allowDecimals={false} {...AXE} />
                  <Tooltip
                    cursor={{ fill: '#f2f4f7' }}
                    content={({ active, payload, label }) => (
                      <Infobulle
                        actif={active && !!payload?.length}
                        titre={libellePeriode(String(label))}
                        lignes={[
                          { libelle: 'Leads reçus', valeur: String(payload?.[0]?.value ?? 0), couleur: SERIES.s1 },
                          { libelle: 'Signatures', valeur: String(payload?.[1]?.value ?? 0), couleur: SERIES.s3 },
                        ]}
                      />
                    )}
                  />
                  <Bar dataKey="leads" fill={SERIES.s1} radius={[4, 4, 0, 0]} maxBarSize={26} />
                  <Bar dataKey="signatures" fill={SERIES.s3} radius={[4, 4, 0, 0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Carte>

          <Carte titre="Entonnoir" aide="Où les leads décrochent, depuis le début.">
            <div className="space-y-3.5 px-5 py-5">
              {etapes.map((e, i) => (
                <div key={e.etape}>
                  <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
                    <span className="font-medium text-encre">{LIBELLE_ETAPE[e.etape]}</span>
                    <span className="tabulaire text-encre-2">
                      <strong className="font-semibold text-encre">{e.atteint}</strong>{' '}
                      <span className="text-encre-3">· {pourcent(e.taux)}</span>
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-[var(--color-neutre-fond)]">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{ width: `${Math.max(e.taux * 100, 1.5)}%`, background: RAMPE_ORDINALE[i] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Carte>
        </div>

        <Carte
          titre="Où part l’argent, mois par mois"
          aide="Ce que les cabinets nous versent, remise déduite, séparé en ce qui reste chez Alyxa et ce qui repart chez Septodont."
          action={
            <Legende
              items={[
                { libelle: 'Marge Alyxa', couleur: SERIES.s1 },
                { libelle: 'Commissions Septodont', couleur: SERIES.s2 },
              ]}
            />
          }
        >
          <div className="px-3 pt-5 pb-3">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={serie} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...GRILLE} />
                <XAxis dataKey="periode" tickFormatter={libellePeriode} {...AXE} />
                <YAxis width={54} tickFormatter={(v) => eurosCourt(Number(v))} {...AXE} />
                <Tooltip
                  cursor={{ fill: '#f2f4f7' }}
                  content={({ active, payload, label }) => {
                    const ligne = payload?.[0]?.payload as { encaisse: number; net: number; commission: number } | undefined
                    return (
                      <Infobulle
                        actif={active && !!ligne}
                        titre={libellePeriode(String(label))}
                        lignes={[
                          { libelle: 'Encaissé', valeur: euros(ligne?.encaisse ?? 0) },
                          { libelle: 'Marge Alyxa', valeur: euros(ligne?.net ?? 0), couleur: SERIES.s1 },
                          { libelle: 'Commissions', valeur: euros(ligne?.commission ?? 0), couleur: SERIES.s2 },
                        ]}
                      />
                    )
                  }}
                />
                {/* Empile marge + commission : la hauteur totale est l'encaissement du mois. */}
                <Bar dataKey="net" stackId="a" fill={SERIES.s1} maxBarSize={36} />
                <Bar dataKey="commission" stackId="a" fill={SERIES.s2} radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Carte>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Carte
            titre="Meilleurs commerciaux"
            aide="Classés par revenu mensuel réellement apporté."
            action={
              <Link
                to="/commerciaux"
                className="flex items-center gap-1 text-[12.5px] font-medium text-[var(--color-marque)] hover:underline"
              >
                Tout voir <ArrowRight size={13} />
              </Link>
            }
          >
            <div className="divide-y divide-bord">
              {commerciauxTries.slice(0, 5).map((p, i) => (
                <div key={p.commercial.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fond text-[11.5px] font-semibold text-encre-2">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-medium">{p.commercial.nom}</div>
                    <div className="text-[12px] text-encre-3">
                      {regionDe(p.commercial.regionId)} · {p.leads} leads · {p.signatures} signés
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="tabulaire text-[13.5px] font-semibold">{euros(p.mrrApporte)}</div>
                    <div className="text-[11.5px] text-encre-3">par mois</div>
                  </div>
                </div>
              ))}
            </div>
          </Carte>

          <Carte titre="Performance par région" aide="Volume reçu et taux de transformation.">
            <div className="px-3 pt-4 pb-3">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={regionsTriees}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid stroke="#eef0f3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} {...AXE} />
                  <YAxis type="category" dataKey="nom" width={140} {...AXE} />
                  <Tooltip
                    cursor={{ fill: '#f2f4f7' }}
                    content={({ active, payload }) => {
                      const r = payload?.[0]?.payload as { nom: string; leads: number; signatures: number; tauxConversion: number; mrrApporte: number } | undefined
                      return (
                        <Infobulle
                          actif={active && !!r}
                          titre={r?.nom}
                          lignes={[
                            { libelle: 'Leads reçus', valeur: String(r?.leads ?? 0) },
                            { libelle: 'Signés', valeur: String(r?.signatures ?? 0) },
                            { libelle: 'Conversion', valeur: pourcent(r?.tauxConversion ?? 0, 1) },
                            { libelle: 'Revenu mensuel', valeur: euros(r?.mrrApporte ?? 0) },
                          ]}
                        />
                      )
                    }}
                  />
                  <Bar dataKey="leads" radius={[0, 4, 4, 0]} maxBarSize={18}>
                    {regionsTriees.map((r) => (
                      <Cell key={r.regionId} fill={SERIES.s1} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Carte>
        </div>

        <Carte
          titre="À traiter en priorité"
          aide="Leads sans aucun mouvement depuis plus de 7 jours. C’est ici qu’on perd de l’argent."
          action={
            <span className="rounded-full bg-[var(--color-attention-fond)] px-2.5 py-1 text-[12px] font-medium text-[#9a6a00]">
              {dormants.length} en attente
            </span>
          }
        >
          {dormants.length === 0 ? (
            <Vide message="Aucun lead en souffrance. Tout est suivi." />
          ) : (
            <div className="divide-y divide-bord">
              {dormants.slice(0, 6).map((l) => {
                const dernier = l.historique[l.historique.length - 1].date
                const jours = Math.floor((Date.now() - +new Date(dernier)) / 86400000)
                return (
                  <div key={l.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <AlertTriangle size={15} className="shrink-0 text-[var(--color-attention)]" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-medium">{l.cabinet}</div>
                      <div className="text-[12px] text-encre-3">
                        {l.praticien} · {l.ville} · reçu le {formatDate(l.recuLe)}
                      </div>
                    </div>
                    <EtiquetteEtape etape={l.etape} />
                    <span className="tabulaire w-24 text-right text-[12.5px] text-encre-2">
                      {jours} jours
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Carte>

        <p className="pb-2 text-center text-[12px] text-encre-3">
          Taux de résiliation observé sur les contrats de plus de 3 mois :{' '}
          <strong className="font-semibold text-encre-2">{pourcent(tauxChurn(contrats), 1)}</strong>
        </p>
      </div>
    </>
  )
}
