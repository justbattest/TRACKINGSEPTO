import { useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Plus, Search, UserPlus } from 'lucide-react'
import { useStore } from '@/lib/store'
import { AUTRE, LIBELLE_ORGANISATION, type Apporteur, type Organisation } from '@/lib/types'

/**
 * Choix de la personne qui a AMENE le lead.
 *
 * C'est le champ le plus important du formulaire : l'equipe de l'apporteur
 * determine a qui le lead est compte. On peut designer quelqu'un qui n'a pas
 * de compte — un commercial terrain doit pouvoir etre credite sans jamais
 * ouvrir l'outil.
 */
export default function ChoixApporteur({
  valeur,
  onChange,
  autoFocus,
}: {
  valeur: string
  onChange: (apporteurId: string) => void
  autoFocus?: boolean
}) {
  const { apporteurs, apporteurDe, ajouterApporteur, maMaison } = useStore()
  const [ouvert, setOuvert] = useState(false)
  const [recherche, setRecherche] = useState('')
  const [occupe, setOccupe] = useState(false)
  const conteneur = useRef<HTMLDivElement>(null)

  const choisi = apporteurDe(valeur)

  const groupes = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    const filtres = q
      ? apporteurs.filter((a) => a.nom.toLowerCase().includes(q))
      : apporteurs
    // Ma maison en premier : c'est le cas le plus frequent.
    const ordre: Organisation[] = [maMaison, AUTRE[maMaison]]
    return ordre
      .map((org) => ({ org, gens: filtres.filter((a) => a.organisation === org) }))
      .filter((g) => g.gens.length > 0)
  }, [apporteurs, recherche, maMaison])

  /** Un nom saisi qui ne correspond a personne peut etre cree a la volee. */
  const nomNouveau = recherche.trim()
  const dejaPris = apporteurs.some((a) => a.nom.trim().toLowerCase() === nomNouveau.toLowerCase())
  const peutCreer = nomNouveau.length >= 2 && !dejaPris

  function selectionner(apporteur: Apporteur) {
    onChange(apporteur.id)
    setOuvert(false)
    setRecherche('')
  }

  async function creer(organisation: Organisation) {
    setOccupe(true)
    const apporteur = await ajouterApporteur(nomNouveau, organisation)
    setOccupe(false)
    if (apporteur) selectionner(apporteur)
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
          <div className="relative border-b border-bord">
            <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-encre-3" />
            <input
              autoFocus
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher ou saisir un nouveau nom…"
              className="w-full bg-transparent py-2.5 pr-3 pl-9 text-[13.5px] outline-none"
            />
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {groupes.map(({ org, gens }) => (
              <div key={org}>
                <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wide text-encre-3 uppercase">
                  {LIBELLE_ORGANISATION[org]}
                </div>
                {gens.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => selectionner(a)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13.5px] transition-colors hover:bg-fond"
                  >
                    <span className="min-w-0 flex-1 truncate">{a.nom}</span>
                    {!a.membreId && (
                      <span className="shrink-0 text-[11px] text-encre-3">sans compte</span>
                    )}
                    {a.id === valeur && <Check size={14} className="shrink-0 text-[var(--color-marque)]" />}
                  </button>
                ))}
              </div>
            ))}

            {groupes.length === 0 && !peutCreer && (
              <p className="px-3 py-4 text-center text-[13px] text-encre-3">Personne à ce nom.</p>
            )}

            {peutCreer && (
              <div className="border-t border-bord px-3 py-2.5">
                <div className="mb-2 flex items-center gap-1.5 text-[12.5px] text-encre-2">
                  <UserPlus size={14} />
                  Ajouter « <strong className="font-semibold text-encre">{nomNouveau}</strong> » chez
                </div>
                <div className="flex gap-2">
                  {([maMaison, AUTRE[maMaison]] as Organisation[]).map((org) => (
                    <button
                      key={org}
                      type="button"
                      disabled={occupe}
                      onClick={() => void creer(org)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-bord-fort px-3 py-1.5 text-[12.5px] font-medium transition-colors hover:bg-fond disabled:opacity-40"
                    >
                      <Plus size={13} /> {LIBELLE_ORGANISATION[org]}
                    </button>
                  ))}
                </div>
              </div>
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
