import { useMemo, useState } from 'react'
import { Download, Plus, Search, X } from 'lucide-react'
import Entete from '@/components/Entete'
import FormulaireLead from '@/components/FormulaireLead'
import {
  Avatar,
  Bouton,
  Carte,
  classesListe,
  classesSaisie,
  EtiquetteSens,
  EtiquetteStatut,
  Pastille,
  Segments,
  Vide,
} from '@/components/ui'
import { useStore } from '@/lib/store'
import { formatDate, ilYa } from '@/lib/dates'
import { dateDuJour, telechargerCsv } from '@/lib/telecharger'
import {
  AUTRE,
  dernierMouvement,
  deLaMaison,
  libelleSens,
  LIBELLE_ORGANISATION,
  LIBELLE_STATUT,
  nonLus,
  sensPour,
  STATUTS,
  type Sens,
} from '@/lib/types'

const TOUS = 'tous'
type FiltreSens = Sens | typeof TOUS

export default function Leads({ onOuvrirLead }: { onOuvrirLead: (id: string) => void }) {
  const { leads, regions, membres, regionDe, membreDe, lectures, membreId, maMaison } = useStore()

  const [sens, setSens] = useState<FiltreSens>(TOUS)
  const [recherche, setRecherche] = useState('')
  const [statut, setStatut] = useState<string>(TOUS)
  const [region, setRegion] = useState<string>(TOUS)
  const [transmetteur, setTransmetteur] = useState<string>(TOUS)
  const [formulaire, setFormulaire] = useState<Sens | null>(null)

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return leads
      .filter((l) => (sens === TOUS ? true : sensPour(l, maMaison) === sens))
      .filter((l) => (statut === TOUS ? true : l.statut === statut))
      .filter((l) => (region === TOUS ? true : l.regionId === region))
      .filter((l) => (transmetteur === TOUS ? true : l.transmisParId === transmetteur))
      .filter((l) =>
        q
          ? [l.structure, l.contact, l.ville, l.codePostal, l.email, l.motif].some((v) =>
              v?.toLowerCase().includes(q),
            )
          : true,
      )
      .sort((a, b) => +new Date(dernierMouvement(b)) - +new Date(dernierMouvement(a)))
  }, [leads, sens, recherche, statut, region, transmetteur, maMaison])

  const filtreActif = statut !== TOUS || region !== TOUS || transmetteur !== TOUS || recherche !== ''

  function exporter() {
    const entetes = ['Sens', 'Structure', 'Contact', 'Téléphone', 'Email', 'Ville', 'CP', 'Région', 'Motif', 'Transmis par', 'Transmis le', 'Statut', 'Dernier échange', 'Messages']
    const lignes = filtres.map((l) => [
      libelleSens(sensPour(l, maMaison), maMaison),
      l.structure,
      l.contact,
      l.telephone,
      l.email,
      l.ville,
      l.codePostal,
      regionDe(l.regionId),
      l.motif,
      membreDe(l.transmisParId)?.nom ?? '',
      formatDate(l.transmisLe),
      LIBELLE_STATUT[l.statut],
      formatDate(dernierMouvement(l)),
      l.fil.filter((e) => e.type === 'message').length,
    ])
    void telechargerCsv(`echange-septodont-${dateDuJour()}.csv`, [entetes, ...lignes])
  }

  return (
    <>
      <Entete titre="Leads" sous={`Tout ce qui circule entre ${LIBELLE_ORGANISATION[maMaison]} et ${LIBELLE_ORGANISATION[AUTRE[maMaison]]}, dans les deux sens.`}>
        <div className="flex flex-wrap gap-2">
          <Bouton onClick={exporter}>
            <Download size={15} /> Exporter
          </Bouton>
          <Bouton variante="primaire" onClick={() => setFormulaire('envoye')}>
            <Plus size={15} /> Nouveau lead
          </Bouton>
        </div>
      </Entete>

      <div className="space-y-4 px-6 py-6 lg:px-8">
        <Segments<FiltreSens>
          valeur={sens}
          onChange={setSens}
          options={[
            { valeur: TOUS, libelle: 'Tous', compte: leads.length },
            {
              valeur: 'recu',
              libelle: `Reçus ${deLaMaison(AUTRE[maMaison])}`,
              compte: leads.filter((l) => sensPour(l, maMaison) === 'recu').length,
            },
            {
              valeur: 'envoye',
              libelle: `Envoyés à ${LIBELLE_ORGANISATION[AUTRE[maMaison]]}`,
              compte: leads.filter((l) => sensPour(l, maMaison) === 'envoye').length,
            },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-encre-3" />
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher une structure, un praticien, une ville…"
              className={`${classesSaisie} pl-9`}
            />
          </div>
          <select value={statut} onChange={(e) => setStatut(e.target.value)} className={classesListe}>
            <option value={TOUS}>Tous les statuts</option>
            {STATUTS.map((s) => (
              <option key={s} value={s}>{LIBELLE_STATUT[s]}</option>
            ))}
          </select>
          <select value={region} onChange={(e) => setRegion(e.target.value)} className={classesListe}>
            <option value={TOUS}>Toutes les régions</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.nom}</option>
            ))}
          </select>
          <select value={transmetteur} onChange={(e) => setTransmetteur(e.target.value)} className={classesListe}>
            <option value={TOUS}>Transmis par tous</option>
            {membres.map((m) => (
              <option key={m.id} value={m.id}>{m.nom}</option>
            ))}
          </select>
          {filtreActif && (
            <Bouton
              variante="discret"
              onClick={() => {
                setRecherche('')
                setStatut(TOUS)
                setRegion(TOUS)
                setTransmetteur(TOUS)
              }}
            >
              <X size={14} /> Réinitialiser
            </Bouton>
          )}
        </div>

        <Carte>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-bord px-5 py-3 text-[13px] text-encre-2">
            <span>
              <strong className="font-semibold text-encre">{filtres.length}</strong> lead
              {filtres.length > 1 ? 's' : ''}
              {(filtreActif || sens !== TOUS) && <span className="text-encre-3"> sur {leads.length}</span>}
            </span>
            <span className="text-[12px] text-encre-3">
              Cliquez sur une ligne pour ouvrir la fiche et la discussion
            </span>
          </div>

          {filtres.length === 0 ? (
            <Vide
              message="Aucun lead ne correspond à ces filtres."
              action={
                <Bouton variante="primaire" onClick={() => setFormulaire('envoye')}>
                  <Plus size={15} /> Ajouter un lead
                </Bouton>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13.5px]">
                <thead className="border-b border-bord text-[12px] font-medium text-encre-3">
                  <tr>
                    <th className="px-5 py-2.5 font-medium">Structure</th>
                    <th className="px-3 py-2.5 font-medium">Sens</th>
                    <th className="px-3 py-2.5 font-medium">Motif</th>
                    <th className="px-3 py-2.5 font-medium">Transmis par</th>
                    <th className="px-3 py-2.5 font-medium">Statut</th>
                    <th className="px-5 py-2.5 text-right font-medium">Dernier échange</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bord">
                  {filtres.map((l) => {
                    const attente = nonLus(l, lectures[l.id], membreId)
                    const dernier = dernierMouvement(l)
                    return (
                      <tr
                        key={l.id}
                        onClick={() => onOuvrirLead(l.id)}
                        className="cursor-pointer transition-colors hover:bg-fond"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className={attente > 0 ? 'font-semibold' : 'font-medium'}>
                              {l.structure}
                            </span>
                            <Pastille nombre={attente} />
                          </div>
                          <div className="text-[12px] text-encre-3">
                            {l.contact} · {l.ville}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <EtiquetteSens sens={sensPour(l, maMaison)} maison={maMaison} />
                        </td>
                        <td className="px-3 py-3 text-encre-2">{l.motif}</td>
                        <td className="px-3 py-3">
                          <span className="flex items-center gap-2 text-encre-2">
                            <Avatar membre={membreDe(l.transmisParId)} taille={22} titre />
                            <span className="truncate">{membreDe(l.transmisParId)?.nom}</span>
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <EtiquetteStatut statut={l.statut} />
                        </td>
                        <td className="tabulaire px-5 py-3 text-right text-encre-2">
                          {formatDate(dernier)}
                          <div className="text-[12px] text-encre-3">{ilYa(dernier)}</div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Carte>
      </div>

      {formulaire && <FormulaireLead sensInitial={formulaire} onFermer={() => setFormulaire(null)} />}
    </>
  )
}
