import type { ReactNode } from 'react'

/** Bandeau de titre commun a toutes les pages. */
export default function Entete({
  titre,
  sous,
  children,
}: {
  titre: string
  sous: string
  children?: ReactNode
}) {
  return (
    <header className="border-b border-bord bg-carte px-6 py-5 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[21px] font-semibold tracking-tight">{titre}</h1>
          <p className="mt-1 max-w-2xl text-[13.5px] text-encre-2">{sous}</p>
        </div>
        {children}
      </div>
    </header>
  )
}
