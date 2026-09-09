import { useState } from 'react'
import { Check, UserPlus } from 'lucide-react'
import { Avatar, Bouton, Champ, classesSaisie, Modale } from '@/components/ui'
import { useStore } from '@/lib/store'
import { LIBELLE_ORGANISATION, type Organisation } from '@/lib/types'

/**
 * Choix de l'identite. Tant que la vraie authentification n'est pas branchee,
 * chacun se declare une fois : son nom et sa maison. La couleur est attribuee
 * automatiquement pour qu'aucune deux personnes ne se ressemblent.
 */
export default function Identite({
  onFermer,
  obligatoire,
}: {
  onFermer?: () => void
  obligatoire?: boolean
}) {
  const { membres, membreId, seConnecter, creerMembre } = useStore()
  const [creation, setCreation] = useState(false)
  const [nom, setNom] = useState('')
  const [organisation, setOrganisation] = useState<Organisation>('alyxa')

  const contenu = (
    <div className="space-y-5 px-6 py-5">
      {!creation ? (
        <>
          {(['alyxa', 'septodont'] as Organisation[]).map((org) => {
            const gens = membres.filter((m) => m.organisation === org)
            if (!gens.length) return null
            return (
              <div key={org}>
                <h3 className="mb-2 text-[12px] font-semibold tracking-wide text-encre-3 uppercase">
                  {LIBELLE_ORGANISATION[org]}
                </h3>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {gens.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        seConnecter(m.id)
                        onFermer?.()
                      }}
                      className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                        m.id === membreId
                          ? 'border-[var(--color-marque)] bg-[var(--color-marque-clair)]'
                          : 'border-bord hover:bg-fond'
                      }`}
                    >
                      <Avatar membre={m} />
                      <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{m.nom}</span>
                      {m.id === membreId && <Check size={15} className="text-[var(--color-marque)]" />}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}

          <Bouton onClick={() => setCreation(true)} className="w-full justify-center">
            <UserPlus size={15} /> Créer mon compte
          </Bouton>
        </>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!nom.trim()) return
            creerMembre(nom, organisation)
            onFermer?.()
          }}
        >
          <Champ label="Votre nom">
            <input
              autoFocus
              required
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Prénom Nom"
              className={classesSaisie}
            />
          </Champ>
          <Champ label="Votre maison" aide="Elle apparaît à côté de chaque message que vous écrivez.">
            <div className="flex gap-2">
              {(['alyxa', 'septodont'] as Organisation[]).map((org) => (
                <button
                  key={org}
                  type="button"
                  onClick={() => setOrganisation(org)}
                  className={`flex-1 rounded-lg border px-3 py-2.5 text-[13.5px] font-medium transition-colors ${
                    organisation === org
                      ? 'border-[var(--color-marque)] bg-[var(--color-marque-clair)] text-[var(--color-marque-fonce)]'
                      : 'border-bord-fort text-encre-2 hover:bg-fond'
                  }`}
                >
                  {LIBELLE_ORGANISATION[org]}
                </button>
              ))}
            </div>
          </Champ>
          <div className="flex justify-end gap-2">
            <Bouton type="button" onClick={() => setCreation(false)}>
              Retour
            </Bouton>
            <Bouton type="submit" variante="primaire" disabled={!nom.trim()}>
              C’est moi
            </Bouton>
          </div>
        </form>
      )}
    </div>
  )

  return (
    <Modale
      titre={obligatoire ? 'Qui êtes-vous ?' : 'Changer de compte'}
      sous={
        obligatoire
          ? 'Votre nom et votre couleur vous identifient dans les discussions sur les leads.'
          : undefined
      }
      onFermer={obligatoire ? () => undefined : (onFermer ?? (() => undefined))}
    >
      {contenu}
    </Modale>
  )
}
