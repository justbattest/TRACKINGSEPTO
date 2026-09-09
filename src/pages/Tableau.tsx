import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDownLeft, ArrowUpRight, MessageSquare } from 'lucide-react'
import Entete from '@/components/Entete'
import { Avatar, Carte, EtiquetteSens, EtiquetteStatut, Pastille, Vide } from '@/components/ui'
import { AXE, GRILLE, Infobulle, Legende, RAMPE_ENTRANT, RAMPE_SORTANT, SERIES } from '@/components/graphiques'
import { bilan, entonnoir, equilibre, joursDepuis, leadsDormants, leadsNonLus, repartir, serieMensuelle, type Bilan } from '@/lib/stats'
import { formatDate, libellePeriode } from '@/lib/dates'
import { useStore } from '@/lib/store'
import { dernierMouvement, LIBELLE_SENS, LIBELLE_STATUT, RESPONSABLE } from '@/lib/types'

const pourcent = (n: number, d = 0) => `${(n * 100).toLocaleString('fr-FR', { maximumFractionDigits: d })} %`

export default function Tableau({ onOuvrirLead }: { onOuvrirLead: (id: string) => void }) {
  const { leads, lectures, membreId, membreDe, regionDe } = useStore()

  const eq = useMemo(() => equilibre(leads), [leads])
  const recus = useMemo(() => bilan(leads, 'recu'), [leads])
  const envoyes = useMemo(() => bilan(leads, 'envoye'), [leads])
  const serie = useMemo(() => serieMensuelle(leads), [leads])
  const dormants = useMemo(() => leadsDormants(leads), [leads])
  const nonLus = useMemo(() => leadsNonLus(leads, lectures, membreId), [leads, lectures, membreId])
  const motifs = useMemo(() => repartir(leads, (l) => l.motif).slice(0, 8), [leads])

  return (
    <>
      <Entete
        titre="Tableau de bord"
        sous="L’état de l’échange avec Septodont : ce qui circule dans chaque sens, et ce que ça donne."
      />

      <div className="space-y-6 px-6 py-6 lg:px-8">
        {/* L'equilibre : la question centrale d'un echange reciproque. */}
        <Carte
          titre="L’équilibre de l’échange"
          aide="Un partenariat sain, c’est un flux qui va dans les deux sens."
        >
          <div className="px-5 py-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-sortant-fonce)]">
                  <ArrowUpRight size={15} /> On envoie
                </div>
                <div className="tabulaire mt-1 text-[30px] leading-none font-semibold text-[var(--color-sortant)]">
                  {eq.envoyes}
                </div>
              </div>
              <div className="pb-1 text-center text-[12.5px] text-encre-2">
                {eq.ecart === 0 ? (
                  <span className="rounded-full bg-[var(--color-bien-fond)] px-3 py-1 font-medium text-[#0f7a55]">
                    Parfaitement équilibré
                  </span>
                ) : (
                  <span>
                    {eq.ecart > 0 ? 'On envoie' : 'On reçoit'}{' '}
                    <strong className="font-semibold text-encre">{Math.abs(eq.ecart)}</strong> lead
                    {Math.abs(eq.ecart) > 1 ? 's' : ''} de plus
                  </span>
                )}
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-1.5 text-[13px] font-medium text-[var(--color-entrant-fonce)]">
                  On reçoit <ArrowDownLeft size={15} />
                </div>
                <div className="tabulaire mt-1 text-[30px] leading-none font-semibold text-[var(--color-entrant)]">
                  {eq.recus}
                </div>
              </div>
            </div>

            {/* Une seule barre, deux parts : on lit le desequilibre d'un coup d'oeil. */}
            <div className="mt-4 flex h-3 gap-0.5 overflow-hidden rounded-full">
              <div
                className="rounded-l-full bg-[var(--color-sortant)] transition-[width] duration-500"
                style={{ width: `${eq.partEnvoyee * 100}%` }}
              />
              <div
                className="flex-1 rounded-r-full bg-[var(--color-entrant)] transition-[width] duration-500"
              />
            </div>
            <div className="mt-2 flex justify-between text-[11.5px] text-encre-3">
              <span>{pourcent(eq.partEnvoyee)} envoyés par Alyxa</span>
              <span>{pourcent(1 - eq.partEnvoyee)} reçus de Septodont</span>
            </div>
          </div>
        </Carte>

        {/* Le miroir : le meme bilan des deux cotes, cote a cote. */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ColonneBilan bilan={envoyes} leads={leads} />
          <ColonneBilan bilan={recus} leads={leads} />
        </div>

        <Carte
          titre="Le flux mois par mois"
          aide="Le rythme de l’échange, dans les deux sens."
          action={
            <Legende
              items={[
                { libelle: 'Envoyés à Septodont', couleur: SERIES.sortant },
                { libelle: 'Reçus de Septodont', couleur: SERIES.entrant },
              ]}
            />
          }
        >
          <div className="px-3 pt-5 pb-3">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={serie} barGap={3} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...GRILLE} />
                <XAxis dataKey="periode" tickFormatter={libellePeriode} {...AXE} />
                <YAxis width={34} allowDecimals={false} {...AXE} />
                <Tooltip
                  cursor={{ fill: '#f2f4f7' }}
                  content={({ active, payload, label }) => {
                    const p = payload?.[0]?.payload as { envoyes: number; recus: number } | undefined
                    return (
                      <Infobulle
                        actif={active && !!p}
                        titre={libellePeriode(String(label))}
                        lignes={[
                          { libelle: 'Envoyés', valeur: String(p?.envoyes ?? 0), couleur: SERIES.sortant },
                          { libelle: 'Reçus', valeur: String(p?.recus ?? 0), couleur: SERIES.entrant },
                          { libelle: 'Total', valeur: String((p?.envoyes ?? 0) + (p?.recus ?? 0)) },
                        ]}
                      />
                    )
                  }}
                />
                <Bar dataKey="envoyes" fill={SERIES.sortant} radius={[4, 4, 0, 0]} maxBarSize={30} isAnimationActive={false} />
                <Bar dataKey="recus" fill={SERIES.entrant} radius={[4, 4, 0, 0]} maxBarSize={30} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Carte>

        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
          <Carte
            titre="Discussions à lire"
            aide="Les leads où l’autre équipe vous a écrit."
            action={<Pastille nombre={nonLus.reduce((t, n) => t + n.nonLus, 0)} />}
          >
            {nonLus.length === 0 ? (
              <Vide message="Vous êtes à jour. Aucun message en attente." />
            ) : (
              <div className="divide-y divide-bord">
                {nonLus.slice(0, 6).map(({ lead, nonLus: n }) => {
                  const dernierMessage = [...lead.fil].reverse().find((e) => e.type === 'message')
                  return (
                    <button
                      key={lead.id}
                      onClick={() => onOuvrirLead(lead.id)}
                      className="flex w-full gap-3 px-5 py-3 text-left transition-colors hover:bg-fond"
                    >
                      <Avatar membre={membreDe(dernierMessage?.auteurId ?? '')} taille={30} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[13.5px] font-semibold">{lead.structure}</span>
                          <Pastille nombre={n} />
                        </span>
                        <span className="mt-0.5 block truncate text-[12.5px] text-encre-2">
                          {dernierMessage?.texte}
                        </span>
                      </span>
                      <MessageSquare size={15} className="mt-1 shrink-0 text-encre-3" />
                    </button>
                  )
                })}
              </div>
            )}
          </Carte>

          <Carte
            titre="Sans nouvelles depuis plus de 7 jours"
            aide="Les leads ouverts qui n’ont bougé ni d’un côté ni de l’autre."
            action={
              <span className="rounded-full bg-[var(--color-attention-fond)] px-2.5 py-1 text-[12px] font-medium text-[#9a6a00]">
                {dormants.length}
              </span>
            }
          >
            {dormants.length === 0 ? (
              <Vide message="Tout est suivi. Rien ne dort." />
            ) : (
              <div className="divide-y divide-bord">
                {dormants.slice(0, 6).map((l) => (
                  <button
                    key={l.id}
                    onClick={() => onOuvrirLead(l.id)}
                    className="flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-3 text-left transition-colors hover:bg-fond"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium">{l.structure}</span>
                      <span className="block text-[12px] text-encre-3">
                        {l.ville} · {regionDe(l.regionId)} · chez {RESPONSABLE[l.sens]}
                      </span>
                    </span>
                    <EtiquetteSens sens={l.sens} />
                    <EtiquetteStatut statut={l.statut} />
                    <span className="tabulaire w-20 text-right text-[12.5px] text-encre-2">
                      {joursDepuis(dernierMouvement(l))} j
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Carte>
        </div>

        <Carte titre="Pourquoi les leads circulent" aide="Les motifs les plus fréquents, tous sens confondus.">
          <div className="space-y-3 px-5 py-5">
            {motifs.map((m) => (
              <div key={m.cle}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="truncate font-medium text-encre">{m.cle}</span>
                  <span className="tabulaire shrink-0 text-encre-2">
                    <strong className="font-semibold text-encre">{m.total}</strong>
                    <span className="text-encre-3"> · {m.convertis} converti{m.convertis > 1 ? 's' : ''}</span>
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-[var(--color-neutre-fond)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-marque)] transition-[width] duration-500"
                    style={{ width: `${(m.total / (motifs[0]?.total || 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Carte>

        <p className="pb-2 text-center text-[12px] text-encre-3">
          {leads.length} leads échangés depuis le début du partenariat · dernier mouvement le{' '}
          {formatDate(
            leads.reduce(
              (recent, l) => (dernierMouvement(l) > recent ? dernierMouvement(l) : recent),
              leads[0] ? dernierMouvement(leads[0]) : new Date().toISOString(),
            ),
          )}
        </p>
      </div>
    </>
  )
}

/** Bilan d'un sens : le meme bloc a gauche et a droite, pour comparer d'un regard. */
function ColonneBilan({ bilan: b, leads }: { bilan: Bilan; leads: import('@/lib/types').Lead[] }) {
  const sortant = b.sens === 'envoye'
  const etapes = useMemo(() => entonnoir(leads.filter((l) => l.sens === b.sens)), [leads, b.sens])
  const rampe = sortant ? RAMPE_SORTANT : RAMPE_ENTRANT
  const accent = sortant ? 'var(--color-sortant)' : 'var(--color-entrant)'
  const evolution = b.ceMois - b.moisPrecedent

  return (
    <Carte>
      <header className="flex items-start justify-between gap-3 border-b border-bord px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-[15px] font-semibold">
            {sortant ? <ArrowUpRight size={17} style={{ color: accent }} /> : <ArrowDownLeft size={17} style={{ color: accent }} />}
            {LIBELLE_SENS[b.sens]}
          </h2>
          <p className="mt-0.5 text-[13px] text-encre-2">
            Suivi par {RESPONSABLE[b.sens]}
          </p>
        </div>
        <div className="text-right">
          <div className="tabulaire text-[24px] leading-none font-semibold" style={{ color: accent }}>
            {b.total}
          </div>
          <div className="text-[11.5px] text-encre-3">au total</div>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-px bg-bord">
        <Mesure libelle="Ce mois-ci" valeur={String(b.ceMois)} detail={evolutionTexte(evolution)} />
        <Mesure
          libelle="Convertis"
          valeur={String(b.convertis)}
          detail={`${pourcent(b.tauxConversion, 1)} des leads`}
        />
        <Mesure
          libelle="Délai de contact"
          valeur={b.delaiMedianContact === null ? '—' : `${b.delaiMedianContact} j`}
          detail="médiane"
        />
      </div>

      <div className="space-y-2.5 px-5 py-4">
        {etapes.map((e, i) => (
          <div key={e.statut}>
            <div className="mb-1 flex items-baseline justify-between text-[12.5px]">
              <span className="text-encre-2">{LIBELLE_STATUT[e.statut]}</span>
              <span className="tabulaire text-encre-2">
                <strong className="font-semibold text-encre">{e.atteint}</strong>
                <span className="text-encre-3"> · {pourcent(e.taux)}</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--color-neutre-fond)]">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${Math.max(e.taux * 100, 1.5)}%`, background: rampe[i] }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-bord px-5 py-3 text-[12px] text-encre-3">
        {b.enAttente > 0 ? (
          <>
            <strong className="font-semibold text-[var(--color-attention)]">{b.enAttente}</strong> en
            attente de prise en charge · {b.enCours} en cours · {b.sansSuite} sans suite
          </>
        ) : (
          <>Tous pris en charge · {b.enCours} en cours · {b.sansSuite} sans suite</>
        )}
      </div>
    </Carte>
  )
}

function evolutionTexte(delta: number): string {
  if (delta === 0) return 'stable vs mois dernier'
  return `${delta > 0 ? '+' : '−'}${Math.abs(delta)} vs mois dernier`
}

function Mesure({ libelle, valeur, detail }: { libelle: string; valeur: string; detail: string }) {
  return (
    <div className="bg-carte px-4 py-3">
      <div className="text-[11.5px] text-encre-3">{libelle}</div>
      <div className="tabulaire mt-0.5 text-[19px] font-semibold">{valeur}</div>
      <div className="mt-0.5 text-[11px] leading-tight text-encre-3">{detail}</div>
    </div>
  )
}
