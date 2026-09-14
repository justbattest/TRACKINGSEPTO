import { useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { Avatar } from '@/components/ui'
import { useStore } from '@/lib/store'
import { AUTRE, LIBELLE_ORGANISATION, type Membre, type Organisation } from '@/lib/types'

/**
 * Choix de la personne qui a AMENE le lead.
 *
 * C'est le champ le plus important du formulaire : l'equipe de l'apporteur
 * determine a qui le lead est compte. Distinct de celui qui saisit — les deux
 * divergent des qu'une equipe enregistre pour l'autre.
 */
export default function ChoixApporteur({
  valeur,
  onChange,
  autoFocus,
}: {
  valeur: string
  onChange: (membreId: string) => void
  autoFocus?: boolean
}) {
  const { membres, membreDe, maMaison } = useStore()
  const [ouvert, setOuvert] = useState(false)
  const [recherche, setRecherche] = useState('')
  const conteneur = useRef<HTMLDivElement>(null)

  const choisi = membreDe(valeur)

  const groupes = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    const filtres = q ? membres.filter((m) => m.nom.toLowerCase().includes(q)) : membres
    // Ma maison en premier : c'est le cas le plus frequent.
    const ordre: Organisation[] = [maMaison, AUTRE[maMaison]]
    return ordre
      .map((org) => ({ org, gens: filtres.filter((m) => m.organisation === org) }))
      .filter((g) => g.gens.length > 0)
  }, [membres, recherche, maMaison])

  function selectionner(membre: Membre) {
    onChange(membre.id)
    setOuvert(false)
    setRecherche('')
  }

  return (
    <div
      ref={conteneur}
      className="relative"
      onBlur={(e) => {
        // On ne ferme que si le focus quitte vraiment le composant.
        if (!conteneur.current?.contains(e.relatedTarget as Node)) setOuvert(false)
      }}
    >
      <button
        type="button"
        autoFocus={autoFocus}
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-bord-fort bg-carte px-3 py-2 text-left text-[13.5px] outline-none transition-colors focus:border-[var(--color-marque)] focus:ring-2 focus:ring-[var(--color-marque-clair)]"
      >
        {choisi ? (
          <span className="flex min-w-0 items-center gap-2">
            <Avatar membre={choisi} taille={22} />
            <span className="truncate font-medium">{choisi.nom}</span>
            <EtiquetteMaison organisation={choisi.organisation} />
          </span>
        ) : (
          <span className="text-encre-3">Choisir qui a apporté ce lead…</span>
        )}
        <ChevronDown size={15} className="shrink-0 text-encre-3" />
      </button>

      {ouvert && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-bord bg-carte shadow-lg">
          {membres.length > 6 && (
            <div className="relative border-b border-bord">
              <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-encre-3" />
              <input
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher une personne…"
                className="w-full bg-transparent py-2.5 pr-3 pl-9 text-[13.5px] outline-none"
              />
            </div>
          )}

          <div className="max-h-72 overflow-y-auto py-1">
            {groupes.map(({ org, gens }) => (
              <div key={org}>
                <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wide text-encre-3 uppercase">
                  {LIBELLE_ORGANISATION[org]}
                </div>
                {gens.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    // On empeche le vol de focus : sans cela, le va-et-vient de
                    // blur rouvre le menu juste apres l'avoir ferme.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectionner(m)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13.5px] transition-colors hover:bg-fond"
                  >
                    <Avatar membre={m} taille={24} />
                    <span className="min-w-0 flex-1 truncate">{m.nom}</span>
                    {m.id === valeur && (
                      <Check size={14} className="shrink-0 text-[var(--color-marque)]" />
                    )}
                  </button>
                ))}
              </div>
            ))}

            {groupes.length === 0 && (
              <p className="px-3 py-4 text-center text-[13px] text-encre-3">Personne à ce nom.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function EtiquetteMaison({ organisation }: { organisation: Organisation }) {
  const alyxa = organisation === 'alyxa'
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        alyxa
          ? 'bg-[var(--color-sortant-fond)] text-[var(--color-sortant-fonce)]'
          : 'bg-[var(--color-entrant-fond)] text-[var(--color-entrant-fonce)]'
      }`}
    >
      {LIBELLE_ORGANISATION[organisation]}
    </span>
  )
}
