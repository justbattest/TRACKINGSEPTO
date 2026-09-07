/** Briques d'interface partagees par toutes les pages. */
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { LIBELLE_ETAPE, type Etape, type StatutCommission } from '@/lib/types'

export function Carte({
  titre,
  aide,
  action,
  children,
  className = '',
}: {
  titre?: string
  aide?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-xl border border-bord bg-carte ${className}`}>
      {titre && (
        <header className="flex items-start justify-between gap-4 border-b border-bord px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-encre">{titre}</h2>
            {aide && <p className="mt-0.5 text-[13px] text-encre-2">{aide}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

/**
 * Tuile de chiffre-cle. `ton` teinte la valeur quand elle porte un jugement
 * (de l'argent a sortir, un signal negatif) ; sinon on reste en encre neutre.
 */
export function Tuile({
  libelle,
  valeur,
  detail,
  ton = 'neutre',
  icone,
}: {
  libelle: string
  valeur: string
  detail?: string
  ton?: 'neutre' | 'bien' | 'attention' | 'critique'
  icone?: ReactNode
}) {
  const tons = {
    neutre: 'text-encre',
    bien: 'text-[var(--color-bien)]',
    attention: 'text-[var(--color-attention)]',
    critique: 'text-[var(--color-critique)]',
  }
  return (
    <div className="rounded-xl border border-bord bg-carte px-5 py-4">
      <div className="flex items-center gap-2 text-[13px] font-medium text-encre-2">
        {icone}
        {libelle}
      </div>
      <div className={`tabulaire mt-2 text-[26px] leading-none font-semibold tracking-tight ${tons[ton]}`}>
        {valeur}
      </div>
      {detail && <div className="mt-2 text-[12.5px] text-encre-3">{detail}</div>}
    </div>
  )
}

const TONS_ETAPE: Record<Etape, string> = {
  nouveau: 'bg-[var(--color-neutre-fond)] text-encre-2',
  contacte: 'bg-[#eef2ff] text-[#4338ca]',
  demo_planifiee: 'bg-[var(--color-marque-clair)] text-[var(--color-marque-fonce)]',
  demo_faite: 'bg-[#fdf4e0] text-[#9a6a00]',
  signe: 'bg-[var(--color-bien-fond)] text-[#0f7a55]',
  churn: 'bg-[var(--color-critique-fond)] text-[#b02a2a]',
  perdu: 'bg-[var(--color-neutre-fond)] text-encre-3',
}

export function EtiquetteEtape({ etape }: { etape: Etape }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-medium whitespace-nowrap ${TONS_ETAPE[etape]}`}>
      {LIBELLE_ETAPE[etape]}
    </span>
  )
}

export const LIBELLE_STATUT: Record<StatutCommission, string> = {
  prevue: 'À venir',
  a_payer: 'À payer',
  payee: 'Payée',
  annulee: 'Annulée',
}

const TONS_STATUT: Record<StatutCommission, string> = {
  prevue: 'bg-[var(--color-neutre-fond)] text-encre-2',
  a_payer: 'bg-[var(--color-attention-fond)] text-[#9a6a00]',
  payee: 'bg-[var(--color-bien-fond)] text-[#0f7a55]',
  annulee: 'bg-[var(--color-critique-fond)] text-[#b02a2a]',
}

export function EtiquetteStatut({ statut }: { statut: StatutCommission }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-medium whitespace-nowrap ${TONS_STATUT[statut]}`}>
      {LIBELLE_STATUT[statut]}
    </span>
  )
}

export function Bouton({
  variante = 'secondaire',
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: 'primaire' | 'secondaire' | 'discret' }) {
  const variantes = {
    primaire: 'bg-[var(--color-marque)] text-white hover:bg-[var(--color-marque-fonce)] border-transparent',
    secondaire: 'bg-carte text-encre border-bord-fort hover:bg-fond',
    discret: 'bg-transparent text-encre-2 border-transparent hover:bg-fond hover:text-encre',
  }
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3.5 py-2 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${variantes[variante]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Champ({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-medium text-encre-2">{label}</span>
      {children}
    </label>
  )
}

export const classesSaisie =
  'w-full rounded-lg border border-bord-fort bg-carte px-3 py-2 text-[13.5px] text-encre outline-none transition-colors focus:border-[var(--color-marque)] focus:ring-2 focus:ring-[var(--color-marque-clair)]'

export const classesListe =
  'rounded-lg border border-bord-fort bg-carte px-3 py-2 text-[13.5px] text-encre outline-none transition-colors focus:border-[var(--color-marque)] focus:ring-2 focus:ring-[var(--color-marque-clair)]'

export function Vide({ message }: { message: string }) {
  return <div className="px-5 py-14 text-center text-[13.5px] text-encre-3">{message}</div>
}

/** Boite de dialogue centree, fermable au clic exterieur. */
export function Modale({
  titre,
  onFermer,
  children,
  large,
}: {
  titre: string
  onFermer: () => void
  children: ReactNode
  large?: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 px-4 py-8 backdrop-blur-[2px]"
      onClick={onFermer}
    >
      <div
        className={`apparition w-full rounded-xl border border-bord bg-carte shadow-2xl ${large ? 'max-w-3xl' : 'max-w-2xl'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-bord px-6 py-4">
          <h2 className="text-[16px] font-semibold">{titre}</h2>
          <button
            onClick={onFermer}
            className="rounded-lg p-1.5 text-encre-3 transition-colors hover:bg-fond hover:text-encre"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </header>
        {children}
      </div>
    </div>
  )
}
