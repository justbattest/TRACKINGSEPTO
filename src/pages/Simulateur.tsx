import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Entete from '@/components/Entete'
import { Carte, Tuile } from '@/components/ui'
import { AXE, GRILLE, Infobulle, Legende, SERIES } from '@/components/graphiques'
import { centimes, euros, eurosCourt, pourcent, simuler } from '@/lib/engine'
import { REGLAGES_DEFAUT, type Plan } from '@/lib/types'

export default function Simulateur() {
  const [plan, setPlan] = useState<Plan>('annuel')
  const [licences, setLicences] = useState(2)
  const [leadsParMois, setLeadsParMois] = useState(20)
  const [conversion, setConversion] = useState(25)
  const [partAnnuel, setPartAnnuel] = useState(65)
  const [licencesMoyennes, setLicencesMoyennes] = useState(2)

  const detail = useMemo(() => simuler(plan, licences), [plan, licences])

  /** Projection sur 12 mois : le stock de clients s'accumule, les commissions suivent. */
  const projection = useMemo(() => {
    const annuel = simuler('annuel', licencesMoyennes)
    const mensuel = simuler('mensuel', licencesMoyennes)
    const signaturesParMois = (leadsParMois * conversion) / 100
    const nbAnnuel = (signaturesParMois * partAnnuel) / 100
    const nbMensuel = signaturesParMois - nbAnnuel

    return Array.from({ length: 12 }, (_, i) => {
      const mois = i + 1
      // Les annuels restent 12 mois, les mensuels ne comptent que leur mois de signature.
      const clientsAnnuels = nbAnnuel * mois
      const encaisse = clientsAnnuels * annuel.prixPaye + nbMensuel * mensuel.prixPaye
      const commission = clientsAnnuels * annuel.commission + nbMensuel * mensuel.commission
      return {
        mois,
        libelle: `M${mois}`,
        encaisse: centimes(encaisse),
        commission: centimes(commission),
        net: centimes(encaisse - commission),
        clients: Math.round(clientsAnnuels + nbMensuel),
        licences: Math.round((clientsAnnuels + nbMensuel) * licencesMoyennes),
      }
    })
  }, [leadsParMois, conversion, partAnnuel, licencesMoyennes])

  const douzieme = projection[11]
  const cumulCommission = centimes(projection.reduce((t, p) => t + p.commission, 0))
  const cumulNet = centimes(projection.reduce((t, p) => t + p.net, 0))

  return (
    <>
      <Entete
        titre="Simulateur"
        sous="Tester un scénario avant de s’engager : ce que rapporte le partenariat, ce qu’il coûte."
      />

      <div className="space-y-6 px-6 py-6 lg:px-8">
        {/* Partie 1 — le detail d'UN abonnement, la brique de base. */}
        <Carte
          titre="Le détail d’un abonnement"
          aide="Alyxa se vend au poste : un cabinet de 3 praticiens prend 3 licences. D’où vient chaque euro, et où il va."
          action={
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[12.5px] text-encre-2">Licences</span>
                <div className="flex items-center gap-1 rounded-lg border border-bord-fort p-1">
                  <button
                    onClick={() => setLicences(Math.max(1, licences - 1))}
                    disabled={licences <= 1}
                    aria-label="Retirer une licence"
                    className="rounded-md px-1.5 py-0.5 text-encre-2 transition-colors hover:bg-fond disabled:opacity-30"
                  >
                    −
                  </button>
                  <span className="tabulaire w-5 text-center text-[13px] font-semibold">{licences}</span>
                  <button
                    onClick={() => setLicences(Math.min(10, licences + 1))}
                    disabled={licences >= 10}
                    aria-label="Ajouter une licence"
                    className="rounded-md px-1.5 py-0.5 text-encre-2 transition-colors hover:bg-fond disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
              </div>
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
                  {p === 'annuel' ? 'Annuel' : 'Mensuel'}
                </button>
              ))}
            </div>
          }
        >
          <div className="space-y-3 px-5 py-6">
            <Etage
              libelle={`Prix catalogue Alyxa × ${detail.licences} licence${detail.licences > 1 ? 's' : ''}`}
              montant={detail.prixCatalogue}
              largeur={100}
              couleur="#c9d4e2"
              note={`${euros(detail.prixUnitaire)} par poste de praticien`}
            />
            <Etage
              libelle="− Remise Septodont (10 %)"
              montant={-detail.remise}
              largeur={(detail.remise / detail.prixCatalogue) * 100}
              couleur={SERIES.s2}
              note="L’avantage du cabinet"
            />
            <Etage
              libelle="= Payé par le cabinet"
              montant={detail.prixPaye}
              largeur={(detail.prixPaye / detail.prixCatalogue) * 100}
              couleur="#93b6e4"
              note="Ce qu’on encaisse réellement"
              trait
            />
            <Etage
              libelle="− Commission commercial (15 %)"
              montant={-detail.commission}
              largeur={(detail.commission / detail.prixCatalogue) * 100}
              couleur={SERIES.s2}
              note={`Versée ${detail.moisCommissionnes} mois`}
            />
            <Etage
              libelle="= Reste à Alyxa"
              montant={detail.netAlyxa}
              largeur={(detail.netAlyxa / detail.prixCatalogue) * 100}
              couleur={SERIES.s1}
              note="Chaque mois, tant que le cabinet reste"
              trait
            />
          </div>

          <div className="grid grid-cols-1 gap-px border-t border-bord bg-bord sm:grid-cols-3">
            <Encart
              libelle={`Encaissé sur ${detail.moisCommissionnes} mois`}
              valeur={euros(detail.revenuTotal)}
            />
            <Encart
              libelle="Coût d’acquisition total"
              valeur={euros(detail.coutTotal)}
              detail="remise + commission"
              ton="attention"
            />
            <Encart
              libelle="Marge conservée"
              valeur={pourcent(detail.netAlyxa / detail.prixCatalogue, 1)}
              detail="du prix catalogue"
              ton="bien"
            />
          </div>
        </Carte>

        {/* Partie 2 — la projection sur 12 mois. */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Carte titre="Votre scénario" aide="Faites bouger les curseurs.">
            <div className="space-y-6 px-5 py-6">
              <Curseur
                libelle="Leads envoyés par Septodont"
                valeur={leadsParMois}
                affichage={`${leadsParMois} / mois`}
                min={1}
                max={120}
                onChange={setLeadsParMois}
              />
              <Curseur
                libelle="Taux de conversion en signature"
                valeur={conversion}
                affichage={`${conversion} %`}
                min={1}
                max={80}
                onChange={setConversion}
              />
              <Curseur
                libelle="Licences moyennes par cabinet"
                valeur={licencesMoyennes}
                affichage={`${licencesMoyennes} poste${licencesMoyennes > 1 ? 's' : ''}`}
                min={1}
                max={6}
                onChange={setLicencesMoyennes}
              />
              <Curseur
                libelle="Part de contrats annuels"
                valeur={partAnnuel}
                affichage={`${partAnnuel} % annuel / ${100 - partAnnuel} % mensuel`}
                min={0}
                max={100}
                onChange={setPartAnnuel}
              />

              <div className="rounded-lg bg-fond px-4 py-3.5 text-[12.5px] leading-relaxed text-encre-2">
                Hypothèse : un contrat annuel reste 12 mois et génère 12 commissions. Un contrat
                mensuel n’en génère qu’une, le mois de sa signature. Chaque licence est
                commissionnée, donc un cabinet à {licencesMoyennes} postes rapporte{' '}
                {licencesMoyennes} fois plus au commercial qu’un cabinet à un poste.
              </div>
            </div>
          </Carte>

          <Carte
            titre="Projection sur 12 mois"
            aide="Ce que devient le partenariat si le rythme se maintient."
            className="xl:col-span-2"
            action={
              <Legende
                items={[
                  { libelle: 'Marge Alyxa', couleur: SERIES.s1 },
                  { libelle: 'Commissions', couleur: SERIES.s2 },
                ]}
              />
            }
          >
            <div className="px-3 pt-5 pb-3">
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={projection} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="degradeNet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={SERIES.s1} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={SERIES.s1} stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRILLE} />
                  <XAxis dataKey="libelle" {...AXE} />
                  <YAxis width={54} tickFormatter={(v) => eurosCourt(Number(v))} {...AXE} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      const p = payload?.[0]?.payload as (typeof projection)[number] | undefined
                      return (
                        <Infobulle
                          actif={active && !!p}
                          titre={`Mois ${String(label).slice(1)} · ${p?.clients ?? 0} cabinets · ${p?.licences ?? 0} licences`}
                          lignes={[
                            { libelle: 'Encaissé', valeur: euros(p?.encaisse ?? 0) },
                            { libelle: 'Marge Alyxa', valeur: euros(p?.net ?? 0), couleur: SERIES.s1 },
                            { libelle: 'Commissions', valeur: euros(p?.commission ?? 0), couleur: SERIES.s2 },
                          ]}
                        />
                      )
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="net"
                    stroke={SERIES.s1}
                    strokeWidth={2}
                    fill="url(#degradeNet)"
                  />
                  <Area
                    type="monotone"
                    dataKey="commission"
                    stroke={SERIES.s2}
                    strokeWidth={2}
                    fill="none"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Carte>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Tuile
            libelle="Cabinets actifs au 12e mois"
            valeur={String(douzieme.clients)}
            detail={`${douzieme.licences} licences · ${Math.round((leadsParMois * conversion) / 100)} signatures par mois`}
          />
          <Tuile
            libelle="Revenu mensuel au 12e mois"
            valeur={euros(douzieme.encaisse)}
            detail="remise déduite"
          />
          <Tuile
            libelle="Commissions versées sur 1 an"
            valeur={euros(cumulCommission)}
            detail="au total à Septodont"
            ton="attention"
          />
          <Tuile
            libelle="Marge cumulée sur 1 an"
            valeur={euros(cumulNet)}
            detail="ce qui reste à Alyxa"
            ton="bien"
          />
        </div>

        <p className="pb-2 text-center text-[12px] text-encre-3">
          Basé sur la grille en vigueur : {euros(REGLAGES_DEFAUT.prixCatalogue.annuel)}/mois en annuel,{' '}
          {euros(REGLAGES_DEFAUT.prixCatalogue.mensuel)}/mois en mensuel · remise{' '}
          {pourcent(REGLAGES_DEFAUT.tauxRemise)} · commission {pourcent(REGLAGES_DEFAUT.tauxCommission)} ·
          plafond {REGLAGES_DEFAUT.plafondMois} mois, par licence. Hors résiliation.
        </p>
      </div>
    </>
  )
}

/** Un etage de la cascade de prix : une barre proportionnelle au prix catalogue. */
function Etage({
  libelle,
  montant,
  largeur,
  couleur,
  note,
  trait,
}: {
  libelle: string
  montant: number
  largeur: number
  couleur: string
  note: string
  trait?: boolean
}) {
  return (
    <div className={trait ? 'border-t border-dashed border-bord-fort pt-3' : ''}>
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[13.5px] font-medium text-encre">{libelle}</span>
        <span className="tabulaire text-[15px] font-semibold" style={{ color: montant < 0 ? SERIES.s2 : undefined }}>
          {montant < 0 ? '−' : ''}
          {euros(Math.abs(montant))}
          <span className="ml-1 text-[11.5px] font-normal text-encre-3">/ mois</span>
        </span>
      </div>
      <div className="flex h-7 items-center gap-2.5 overflow-hidden rounded-md bg-[var(--color-neutre-fond)]">
        <div
          className="flex h-full shrink-0 items-center rounded-md px-2.5 text-[11.5px] font-medium text-white transition-[width] duration-500"
          style={{ width: `${Math.max(largeur, 8)}%`, background: couleur }}
        >
          {/* La legende ne tient dans la barre que si celle-ci est assez large. */}
          {largeur >= 30 && <span className="truncate">{note}</span>}
        </div>
        {largeur < 30 && <span className="truncate text-[11.5px] text-encre-2">{note}</span>}
      </div>
    </div>
  )
}

function Encart({
  libelle,
  valeur,
  detail,
  ton,
}: {
  libelle: string
  valeur: string
  detail?: string
  ton?: 'bien' | 'attention'
}) {
  const couleur =
    ton === 'bien' ? 'text-[var(--color-bien)]' : ton === 'attention' ? 'text-[var(--color-attention)]' : 'text-encre'
  return (
    <div className="bg-carte px-5 py-4">
      <div className="text-[12.5px] text-encre-2">{libelle}</div>
      <div className={`tabulaire mt-1 text-[20px] font-semibold ${couleur}`}>{valeur}</div>
      {detail && <div className="text-[11.5px] text-encre-3">{detail}</div>}
    </div>
  )
}

function Curseur({
  libelle,
  valeur,
  affichage,
  min,
  max,
  onChange,
}: {
  libelle: string
  valeur: number
  affichage: string
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-medium text-encre-2">{libelle}</span>
        <span className="tabulaire text-[13px] font-semibold text-[var(--color-marque)]">{affichage}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={valeur}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-marque)]"
      />
    </div>
  )
}
