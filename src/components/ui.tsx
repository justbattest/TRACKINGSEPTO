/** Briques d'interface partagees par toutes les pages. */
import { ArrowDownLeft, ArrowUpRight, X } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  initiales,
  libelleSens,
  LIBELLE_SENS_COURT,
  LIBELLE_STATUT,
  type Organisation,
  type Sens,
  type Statut,
} from '@/lib/types'

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
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-bord px-5 py-4">
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
  ton?: 'neutre' | 'bien' | 'attention' | 'entrant' | 'sortant'
  icone?: ReactNode
}) {
  const tons = {
    neutre: 'text-encre',
    bien: 'text-[var(--color-bien)]',
    attention: 'text-[var(--color-attention)]',
    entrant: 'text-[var(--color-entrant)]',
    sortant: 'text-[var(--color-sortant)]',
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
      {detail && <div className="mt-2 text-[12.5px] leading-snug text-encre-3">{detail}</div>}
    </div>
  )
}

const TONS_STATUT: Record<Statut, string> = {
  transmis: 'bg-[var(--color-neutre-fond)] text-encre-2',
  contacte: 'bg-[#eef2ff] text-[#4338ca]',
  rdv: 'bg-[var(--color-attention-fond)] text-[#9a6a00]',
  converti: 'bg-[var(--color-bien-fond)] text-[#0f7a55]',
  sans_suite: 'bg-[var(--color-neutre-fond)] text-encre-3',
}

export function EtiquetteStatut({ statut }: { statut: Statut }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-medium whitespace-nowrap ${TONS_STATUT[statut]}`}>
      {LIBELLE_STATUT[statut]}
    </span>
  )
}

/**
 * Badge de sens, du point de vue de la maison qui regarde. La fleche porte
 * l'information autant que la couleur, pour que le sens reste lisible en noir
 * et blanc comme pour un lecteur daltonien.
 */
export function EtiquetteSens({
  sens,
  maison,
  complet,
}: {
  sens: Sens
  maison: Organisation
  complet?: boolean
}) {
  const recu = sens === 'recu'
  const Fleche = recu ? ArrowDownLeft : ArrowUpRight
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium whitespace-nowrap ${
        recu
          ? 'bg-[var(--color-entrant-fond)] text-[var(--color-entrant-fonce)]'
          : 'bg-[var(--color-sortant-fond)] text-[var(--color-sortant-fonce)]'
      }`}
    >
      <Fleche size={13} />
      {complet ? libelleSens(sens, maison) : LIBELLE_SENS_COURT[sens]}
    </span>
  )
}

export function Bouton({
  variante = 'secondaire',
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: 'primaire' | 'secondaire' | 'discret' | 'danger'
}) {
  const variantes = {
    primaire: 'bg-[var(--color-marque)] text-white hover:bg-[var(--color-marque-fonce)] border-transparent',
    secondaire: 'bg-carte text-encre border-bord-fort hover:bg-fond',
    discret: 'bg-transparent text-encre-2 border-transparent hover:bg-fond hover:text-encre',
    danger: 'bg-transparent text-[var(--color-critique)] border-transparent hover:bg-[var(--color-critique-fond)]',
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

export function Champ({
  label,
  children,
  aide,
  sansLiaison,
}: {
  label: string
  children: ReactNode
  aide?: string
  /**
   * Rend un <div> au lieu d'un <label>. Indispensable des que le contenu n'est
   * pas une saisie native : un <label> renvoie tout clic interne vers son
   * premier controle, ce qui rouvre aussitot un menu qu'on vient de fermer.
   */
  sansLiaison?: boolean
}) {
  const Enveloppe = sansLiaison ? 'div' : 'label'
  return (
    <Enveloppe className="block">
      <span className="mb-1.5 block text-[12.5px] font-medium text-encre-2">{label}</span>
      {children}
      {aide && <span className="mt-1 block text-[11.5px] text-encre-3">{aide}</span>}
    </Enveloppe>
  )
}

export const classesSaisie =
  'w-full rounded-lg border border-bord-fort bg-carte px-3 py-2 text-[13.5px] text-encre outline-none transition-colors focus:border-[var(--color-marque)] focus:ring-2 focus:ring-[var(--color-marque-clair)]'

export const classesListe =
  'rounded-lg border border-bord-fort bg-carte px-3 py-2 text-[13.5px] text-encre outline-none transition-colors focus:border-[var(--color-marque)] focus:ring-2 focus:ring-[var(--color-marque-clair)]'

export function Vide({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="px-5 py-14 text-center">
      <p className="text-[13.5px] text-encre-3">{message}</p>
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </div>
  )
}

/** Selecteur segmente : un choix parmi quelques options, toutes visibles. */
export function Segments<T extends string>({
  valeur,
  options,
  onChange,
}: {
  valeur: T
  options: { valeur: T; libelle: string; compte?: number }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex rounded-lg border border-bord-fort bg-carte p-0.5">
      {options.map((o) => (
        <button
          key={o.valeur}
          onClick={() => onChange(o.valeur)}
          aria-pressed={valeur === o.valeur}
          className={`rounded-md px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors ${
            valeur === o.valeur ? 'bg-encre text-white' : 'text-encre-2 hover:bg-fond'
          }`}
        >
          {o.libelle}
          {o.compte !== undefined && (
            <span className={`tabulaire ml-1.5 ${valeur === o.valeur ? 'text-white/60' : 'text-encre-3'}`}>
              {o.compte}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

/** Boite de dialogue centree, fermable au clic exterieur. */
export function Modale({
  titre,
  sous,
  onFermer,
  children,
  large,
}: {
  titre: ReactNode
  sous?: ReactNode
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
        <header className="flex items-start justify-between gap-4 border-b border-bord px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-[16px] font-semibold">{titre}</h2>
            {sous && <div className="mt-1 text-[13px] text-encre-2">{sous}</div>}
          </div>
          <button
            onClick={onFermer}
            className="shrink-0 rounded-lg p-1.5 text-encre-3 transition-colors hover:bg-fond hover:text-encre"
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

/** Pastille d'identite : la couleur du membre, ses initiales. */
export function Avatar({
  membre,
  taille = 28,
  titre,
}: {
  membre: { nom: string; couleur: string } | undefined
  taille?: number
  titre?: boolean
}) {
  if (!membre) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--color-neutre-fond)] font-semibold text-encre-3"
        style={{ width: taille, height: taille, fontSize: taille * 0.38 }}
        aria-hidden
      >
        ?
      </span>
    )
  }
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: taille, height: taille, fontSize: taille * 0.38, background: membre.couleur }}
      title={titre ? membre.nom : undefined}
      aria-label={membre.nom}
    >
      {initiales(membre.nom)}
    </span>
  )
}

/** Pastille de comptage, pour les messages non lus. */
export function Pastille({ nombre }: { nombre: number }) {
  if (nombre <= 0) return null
  return (
    <span className="tabulaire inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--color-marque)] px-1 text-[11px] font-semibold text-white">
      {nombre > 99 ? '99+' : nombre}
    </span>
  )
}
