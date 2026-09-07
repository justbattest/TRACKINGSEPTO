import { useMemo, useState } from 'react'
import { Download, Plus, Search, X } from 'lucide-react'
import Entete from '@/components/Entete'
import { Bouton, Carte, Champ, classesListe, classesSaisie, EtiquetteEtape, Modale, Vide } from '@/components/ui'
import FicheLead from '@/components/FicheLead'
import { useStore } from '@/lib/store'
import { formatDate } from '@/lib/dates'
import { cascade, euros } from '@/lib/engine'
import { ETAPES, LIBELLE_ETAPE } from '@/lib/types'

const TOUS = 'tous'

export default function Leads() {
  const store = useStore()
  const { leads, commerciaux, regions, regionDe, commercialDe, contratDuLead } = store

  const [recherche, setRecherche] = useState('')
  const [etape, setEtape] = useState<string>(TOUS)
  const [commercial, setCommercial] = useState<string>(TOUS)
  const [region, setRegion] = useState<string>(TOUS)
  const [selection, setSelection] = useState<string | null>(null)
  const [formulaire, setFormulaire] = useState(false)

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return leads
      .filter((l) => (etape === TOUS ? true : l.etape === etape))
      .filter((l) => (commercial === TOUS ? true : l.commercialId === commercial))
      .filter((l) => (region === TOUS ? true : l.regionId === region))
      .filter((l) =>
        q
          ? [l.cabinet, l.praticien, l.ville, l.codePostal, l.email].some((v) =>
              v.toLowerCase().includes(q),
            )
          : true,
      )
      .sort((a, b) => +new Date(b.recuLe) - +new Date(a.recuLe))
  }, [leads, recherche, etape, commercial, region])

  const filtreActif = etape !== TOUS || commercial !== TOUS || region !== TOUS || recherche !== ''

  function exporter() {
    const entetes = ['Cabinet', 'Praticien', 'Email', 'Téléphone', 'Ville', 'CP', 'Région', 'Commercial', 'Étape', 'Reçu le', 'Formule', 'Prix payé']
    const lignes = filtres.map((l) => {
      const contrat = contratDuLead(l.id)
      return [
        l.cabinet, l.praticien, l.email, l.telephone, l.ville, l.codePostal,
        regionDe(l.regionId), commercialDe(l.commercialId)?.nom ?? '', LIBELLE_ETAPE[l.etape],
        formatDate(l.recuLe), contrat?.plan ?? '', contrat ? cascade(contrat).prixPaye.toFixed(2) : '',
      ]
    })
    const csv = [entetes, ...lignes]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-septodont-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <Entete titre="Leads" sous="Tous les cabinets transmis par Septodont, avec leur avancement.">
        <div className="flex gap-2">
          <Bouton onClick={exporter}>
            <Download size={15} /> Exporter
          </Bouton>
          <Bouton variante="primaire" onClick={() => setFormulaire(true)}>
            <Plus size={15} /> Ajouter un lead
          </Bouton>
        </div>
      </Entete>

      <div className="space-y-4 px-6 py-6 lg:px-8">
        {/* Tous les filtres sur une seule ligne, au-dessus du tableau. */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-encre-3" />
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un cabinet, un praticien, une ville…"
              className={`${classesSaisie} pl-9`}
            />
          </div>
          <select value={etape} onChange={(e) => setEtape(e.target.value)} className={classesListe}>
            <option value={TOUS}>Toutes les étapes</option>
            {ETAPES.map((e) => (
              <option key={e} value={e}>{LIBELLE_ETAPE[e]}</option>
            ))}
          </select>
          <select value={commercial} onChange={(e) => setCommercial(e.target.value)} className={classesListe}>
            <option value={TOUS}>Tous les commerciaux</option>
            {commerciaux.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
          <select value={region} onChange={(e) => setRegion(e.target.value)} className={classesListe}>
            <option value={TOUS}>Toutes les régions</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.nom}</option>
            ))}
          </select>
          {filtreActif && (
            <Bouton
              variante="discret"
              onClick={() => {
                setRecherche('')
                setEtape(TOUS)
                setCommercial(TOUS)
                setRegion(TOUS)
              }}
            >
              <X size={14} /> Réinitialiser
            </Bouton>
          )}
        </div>

        <Carte>
          <div className="flex items-center justify-between border-b border-bord px-5 py-3 text-[13px] text-encre-2">
            <span>
              <strong className="font-semibold text-encre">{filtres.length}</strong> lead
              {filtres.length > 1 ? 's' : ''}
              {filtreActif && <span className="text-encre-3"> sur {leads.length}</span>}
            </span>
            <span className="text-[12px] text-encre-3">Cliquez sur une ligne pour ouvrir la fiche</span>
          </div>

          {filtres.length === 0 ? (
            <Vide message="Aucun lead ne correspond à ces filtres." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13.5px]">
                <thead className="border-b border-bord text-[12px] font-medium text-encre-3">
                  <tr>
                    <th className="px-5 py-2.5 font-medium">Cabinet</th>
                    <th className="px-3 py-2.5 font-medium">Praticien</th>
                    <th className="px-3 py-2.5 font-medium">Région</th>
                    <th className="px-3 py-2.5 font-medium">Commercial</th>
                    <th className="px-3 py-2.5 font-medium">Reçu le</th>
                    <th className="px-3 py-2.5 font-medium">Étape</th>
                    <th className="px-5 py-2.5 text-right font-medium">Abonnement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bord">
                  {filtres.map((l) => {
                    const contrat = contratDuLead(l.id)
                    return (
                      <tr
                        key={l.id}
                        onClick={() => setSelection(l.id)}
                        className="cursor-pointer transition-colors hover:bg-fond"
                      >
                        <td className="px-5 py-3">
                          <div className="font-medium">{l.cabinet}</div>
                          <div className="text-[12px] text-encre-3">
                            {l.ville} · {l.codePostal}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-encre-2">{l.praticien}</td>
                        <td className="px-3 py-3 text-encre-2">{regionDe(l.regionId)}</td>
                        <td className="px-3 py-3 text-encre-2">{commercialDe(l.commercialId)?.nom}</td>
                        <td className="tabulaire px-3 py-3 text-encre-2">{formatDate(l.recuLe)}</td>
                        <td className="px-3 py-3">
                          <EtiquetteEtape etape={l.etape} />
                        </td>
                        <td className="tabulaire px-5 py-3 text-right">
                          {contrat ? (
                            <>
                              <div className="font-medium">{euros(cascade(contrat).prixPaye)}</div>
                              <div className="text-[12px] text-encre-3">{contrat.plan}</div>
                            </>
                          ) : (
                            <span className="text-encre-3">—</span>
                          )}
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

      {selection && <FicheLead leadId={selection} onFermer={() => setSelection(null)} />}
      {formulaire && <FormulaireLead onFermer={() => setFormulaire(false)} />}
    </>
  )
}

function FormulaireLead({ onFermer }: { onFermer: () => void }) {
  const { commerciaux, regions, ajouterLead } = useStore()
  const [valeurs, setValeurs] = useState({
    cabinet: '',
    praticien: '',
    email: '',
    telephone: '',
    ville: '',
    codePostal: '',
    commercialId: commerciaux[0]?.id ?? '',
    regionId: regions[0]?.id ?? '',
  })

  const maj = (cle: keyof typeof valeurs) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setValeurs((v) => {
      const suivant = { ...v, [cle]: e.target.value }
      // La region suit le commercial choisi, sauf modification explicite ensuite.
      if (cle === 'commercialId') {
        const com = commerciaux.find((c) => c.id === e.target.value)
        if (com) suivant.regionId = com.regionId
      }
      return suivant
    })

  const complet = valeurs.cabinet.trim() && valeurs.praticien.trim() && valeurs.commercialId

  return (
    <Modale titre="Ajouter un lead" onFermer={onFermer}>
      <form
        className="space-y-4 px-6 py-5"
        onSubmit={(e) => {
          e.preventDefault()
          if (!complet) return
          ajouterLead(valeurs)
          onFermer()
        }}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Champ label="Nom du cabinet *">
            <input required value={valeurs.cabinet} onChange={maj('cabinet')} className={classesSaisie} placeholder="Cabinet dentaire du Port" />
          </Champ>
          <Champ label="Praticien *">
            <input required value={valeurs.praticien} onChange={maj('praticien')} className={classesSaisie} placeholder="Dr Claire Lambert" />
          </Champ>
          <Champ label="Email">
            <input type="email" value={valeurs.email} onChange={maj('email')} className={classesSaisie} placeholder="contact@cabinet.fr" />
          </Champ>
          <Champ label="Téléphone">
            <input value={valeurs.telephone} onChange={maj('telephone')} className={classesSaisie} placeholder="04 91 00 00 00" />
          </Champ>
          <Champ label="Ville">
            <input value={valeurs.ville} onChange={maj('ville')} className={classesSaisie} placeholder="Marseille" />
          </Champ>
          <Champ label="Code postal">
            <input value={valeurs.codePostal} onChange={maj('codePostal')} className={classesSaisie} placeholder="13008" />
          </Champ>
          <Champ label="Commercial Septodont *">
            <select required value={valeurs.commercialId} onChange={maj('commercialId')} className={classesSaisie}>
              {commerciaux.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </Champ>
          <Champ label="Région">
            <select value={valeurs.regionId} onChange={maj('regionId')} className={classesSaisie}>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>{r.nom}</option>
              ))}
            </select>
          </Champ>
        </div>

        <p className="rounded-lg bg-fond px-3.5 py-3 text-[12.5px] leading-relaxed text-encre-2">
          Le lead est enregistré à l’étape <strong className="font-semibold">Nouveau</strong> et
          horodaté. C’est cet horodatage qui fait foi si le volume envoyé est contesté.
        </p>

        <div className="flex justify-end gap-2 pt-1">
          <Bouton type="button" onClick={onFermer}>Annuler</Bouton>
          <Bouton type="submit" variante="primaire" disabled={!complet}>Enregistrer le lead</Bouton>
        </div>
      </form>
    </Modale>
  )
}
