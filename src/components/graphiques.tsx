/** Reglages partages des graphiques : couleurs de series, axes, infobulles. */
import type { ReactNode } from 'react'

export const SERIES = {
  /** Leads reçus de Septodont. */
  entrant: '#2a78d6',
  /** Leads envoyés à Septodont. */
  sortant: '#eb6834',
  /** Mesure secondaire (conversions). */
  appui: '#1baf7a',
} as const

/** Rampes ordinales pour les entonnoirs (jamais plus clair que le palier 250). */
export const RAMPE_ENTRANT = ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab']
export const RAMPE_SORTANT = ['#f5a986', '#f08b5d', '#eb6834', '#b8461c']

export const AXE = {
  tick: { fill: '#8b909c', fontSize: 11.5 },
  axisLine: false as const,
  tickLine: false as const,
}

export const GRILLE = { stroke: '#eef0f3', vertical: false }

/** Infobulle unique pour tous les graphiques. */
export function Infobulle({
  actif,
  titre,
  lignes,
}: {
  actif?: boolean
  titre?: ReactNode
  lignes: { libelle: string; valeur: string; couleur?: string }[]
}) {
  if (!actif) return null
  return (
    <div className="rounded-lg border border-bord bg-carte px-3 py-2.5 shadow-lg">
      {titre && <div className="mb-1.5 text-[12px] font-semibold text-encre">{titre}</div>}
      <div className="space-y-1">
        {lignes.map((l) => (
          <div key={l.libelle} className="flex items-center gap-2 text-[12px]">
            {l.couleur && (
              <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: l.couleur }} />
            )}
            <span className="text-encre-2">{l.libelle}</span>
            <span className="tabulaire ml-auto font-semibold text-encre">{l.valeur}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Legende horizontale : l'identite n'est jamais portee par la couleur seule. */
export function Legende({ items }: { items: { libelle: string; couleur: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((i) => (
        <span key={i.libelle} className="flex items-center gap-1.5 text-[12px] text-encre-2">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: i.couleur }} />
          {i.libelle}
        </span>
      ))}
    </div>
  )
}
