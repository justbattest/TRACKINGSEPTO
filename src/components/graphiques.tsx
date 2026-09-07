/** Reglages partages des graphiques : couleurs de series, axes, infobulles. */
import type { ReactNode } from 'react'

export const SERIES = {
  s1: '#2a78d6', // bleu — mesure principale
  s2: '#eb6834', // orange — ce qui sort (commissions)
  s3: '#1baf7a', // vert d'eau — signatures
} as const

/** Rampe ordinale bleue pour l'entonnoir (jamais plus clair que le palier 250). */
export const RAMPE_ORDINALE = ['#86b6ef', '#6da7ec', '#3987e5', '#2a78d6', '#1c5cab']

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
