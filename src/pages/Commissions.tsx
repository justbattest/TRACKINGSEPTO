import { useMemo, useState } from 'react'
import { Check, Download } from 'lucide-react'
import Entete from '@/components/Entete'
import { Bouton, Carte, classesListe, EtiquetteStatut, LIBELLE_STATUT, Tuile, Vide } from '@/components/ui'
import { cascade, euros, total } from '@/lib/engine'
import { formatDate, libellePeriode, periodeDe } from '@/lib/dates'
import { useStore } from '@/lib/store'
import type { StatutCommission } from '@/lib/types'

const TOUS = 'tous'

export default function Commissions() {
  const { commissions, contrats, leadDe, commercialDe, basculerPaiement, payerPeriode } = useStore()
  const [statut, setStatut] = useState<string>(TOUS)
  const [commercial, setCommercial] = useState<string>(TOUS)
  const moisCourant = periodeDe(new Date())

  const contratsParId = useMemo(() => new Map(contrats.map((c) => [c.id, c])), [contrats])

  /** Regroupement par mois, du plus recent au plus ancien. */
  const groupes = useMemo(() => {
    const filtrees = commissions
      .filter((c) => (statut === TOUS ? true : c.statut === statut))
      .filter((c) => (commercial === TOUS ? true : c.commercialId === commercial))

    const map = new Map<string, typeof filtrees>()
    for (const c of filtrees) {
      const lot = map.get(c.periode)
      if (lot) lot.push(c)
      else map.set(c.periode, [c])
    }
    // Les mois qui coutent de l'argent maintenant passent devant ceux a venir.
    const entrees = [...map.entries()]
    const echus = entrees.filter(([p]) => p <= moisCourant).sort((a, b) => b[0].localeCompare(a[0]))
    const aVenir = entrees.filter(([p]) => p > moisCourant).sort((a, b) => a[0].localeCompare(b[0]))
    return [...echus, ...aVenir]
  }, [commissions, statut, commercial, moisCourant])

  const commerciauxPresents = useMemo(() => {
    const ids = [...new Set(commissions.map((c) => c.commercialId))]
    return ids.map((id) => commercialDe(id)).filter((c): c is NonNullable<typeof c> => !!c)
  }, [commissions, commercialDe])

  function exporter() {
    const entetes = ['Période', 'Commercial', 'Cabinet', 'Formule', 'Licences', 'Montant', 'Statut', 'Payée le']
    const lignes = groupes.flatMap(([periode, lot]) =>
      lot.map((c) => {
        const contrat = contratsParId.get(c.contratId)
        const lead = contrat ? leadDe(contrat.leadId) : undefined
        return [
          periode,
          commercialDe(c.commercialId)?.nom ?? '',
          lead?.cabinet ?? '',
          contrat?.plan ?? '',
          contrat ? String(cascade(contrat).licences) : '',
          c.montant.toFixed(2),
          LIBELLE_STATUT[c.statut],
          c.payeeLe ? formatDate(c.payeeLe) : '',
        ]
      }),
    )
    const csv = [entetes, ...lignes]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `commissions-septodont-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <Entete
        titre="Commissions"
        sous="Chaque ligne est un mois dû à un commercial. Générée automatiquement à la signature, coupée automatiquement à la résiliation."
      >
        <Bouton onClick={exporter}>
          <Download size={15} /> Exporter pour la compta
        </Bouton>
      </Entete>

      <div className="space-y-5 px-6 py-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Tuile
            libelle="À payer maintenant"
            valeur={euros(total(commissions, ['a_payer']))}
            detail="Échéances arrivées à terme, non réglées"
            ton="attention"
          />
          <Tuile
            libelle={`Au titre de ${libellePeriode(moisCourant)}`}
            valeur={euros(total(commissions.filter((c) => c.periode === moisCourant), ['a_payer', 'payee']))}
            detail="Le montant du virement de ce mois"
          />
          <Tuile
            libelle="Déjà versé"
            valeur={euros(total(commissions, ['payee']))}
            detail="Cumul depuis le début du partenariat"
            ton="bien"
          />
          <Tuile
            libelle="Engagé à venir"
            valeur={euros(total(commissions, ['prevue']))}
            detail="Échéances futures des contrats en cours"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statut}
            onChange={(e) => setStatut(e.target.value)}
            className={classesListe}
          >
            <option value={TOUS}>Tous les statuts</option>
            {(['a_payer', 'payee', 'prevue', 'annulee'] as StatutCommission[]).map((s) => (
              <option key={s} value={s}>{LIBELLE_STATUT[s]}</option>
            ))}
          </select>
          <select
            value={commercial}
            onChange={(e) => setCommercial(e.target.value)}
            className={classesListe}
          >
            <option value={TOUS}>Tous les commerciaux</option>
            {commerciauxPresents.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
        </div>

        {groupes.length === 0 ? (
          <Carte>
            <Vide message="Aucune commission ne correspond à ces filtres." />
          </Carte>
        ) : (
          groupes.map(([periode, lot]) => {
            const du = total(lot, ['a_payer'])
            return (
              <Carte key={periode}>
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-bord px-5 py-3.5">
                  <div>
                    <h2 className="text-[15px] font-semibold capitalize">{libellePeriode(periode)}</h2>
                    <p className="text-[12.5px] text-encre-2">
                      {lot.length} échéance{lot.length > 1 ? 's' : ''} ·{' '}
                      <span className="tabulaire">{euros(total(lot, ['a_payer', 'payee', 'prevue']))}</span> au total
                    </p>
                  </div>
                  {du > 0 && (
                    <Bouton variante="primaire" onClick={() => payerPeriode(periode)}>
                      <Check size={15} /> Tout marquer payé · {euros(du)}
                    </Bouton>
                  )}
                </header>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13.5px]">
                    <thead className="border-b border-bord text-[12px] font-medium text-encre-3">
                      <tr>
                        <th className="px-5 py-2.5 font-medium">Commercial</th>
                        <th className="px-3 py-2.5 font-medium">Cabinet</th>
                        <th className="px-3 py-2.5 font-medium">Formule</th>
                        <th className="px-3 py-2.5 text-right font-medium">Montant</th>
                        <th className="px-3 py-2.5 font-medium">Statut</th>
                        <th className="px-5 py-2.5 text-right font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-bord">
                      {lot.map((c) => {
                        const contrat = contratsParId.get(c.contratId)
                        const lead = contrat ? leadDe(contrat.leadId) : undefined
                        return (
                          <tr key={c.id} className={c.statut === 'annulee' ? 'opacity-55' : ''}>
                            <td className="px-5 py-3 font-medium">{commercialDe(c.commercialId)?.nom}</td>
                            <td className="px-3 py-3 text-encre-2">{lead?.cabinet ?? '—'}</td>
                            <td className="px-3 py-3 text-encre-2 capitalize">
                              {contrat ? `${contrat.plan} · ${cascade(contrat).licences} lic.` : '—'}
                            </td>
                            <td className="tabulaire px-3 py-3 text-right font-semibold">
                              {c.statut === 'annulee' ? <s>{euros(c.montant)}</s> : euros(c.montant)}
                            </td>
                            <td className="px-3 py-3">
                              <EtiquetteStatut statut={c.statut} />
                              {c.payeeLe && (
                                <span className="ml-2 text-[11.5px] text-encre-3">{formatDate(c.payeeLe)}</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-right">
                              {c.statut === 'a_payer' && (
                                <Bouton variante="discret" onClick={() => basculerPaiement(c)}>
                                  Marquer payée
                                </Bouton>
                              )}
                              {c.statut === 'payee' && (
                                <Bouton variante="discret" onClick={() => basculerPaiement(c)}>
                                  Annuler
                                </Bouton>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Carte>
            )
          })
        )}
      </div>
    </>
  )
}
