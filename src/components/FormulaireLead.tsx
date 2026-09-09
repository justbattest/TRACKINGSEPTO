import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { Bouton, Champ, classesSaisie, Modale } from '@/components/ui'
import { useStore } from '@/lib/store'
import { MOTIFS, RESPONSABLE, type Sens } from '@/lib/types'

/** Saisie d'un lead, dans un sens ou dans l'autre. */
export default function FormulaireLead({
  sensInitial,
  onFermer,
}: {
  sensInitial: Sens
  onFermer: () => void
}) {
  const { regions, ajouterLead, moi } = useStore()
  const [sens, setSens] = useState<Sens>(sensInitial)
  const [message, setMessage] = useState('')
  const [valeurs, setValeurs] = useState({
    structure: '',
    contact: '',
    telephone: '',
    email: '',
    ville: '',
    codePostal: '',
    regionId: regions[0]?.id ?? '',
    motif: MOTIFS[sensInitial][0],
  })

  const maj =
    (cle: keyof typeof valeurs) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setValeurs((v) => ({ ...v, [cle]: e.target.value }))

  function changerSens(nouveau: Sens) {
    setSens(nouveau)
    // Les motifs dependent du sens : on repart sur une valeur valide.
    setValeurs((v) => ({ ...v, motif: MOTIFS[nouveau][0] }))
  }

  const complet = valeurs.structure.trim() && valeurs.contact.trim() && moi

  return (
    <Modale titre="Nouveau lead" onFermer={onFermer} large>
      <form
        className="space-y-5 px-6 py-5"
        onSubmit={(e) => {
          e.preventDefault()
          if (!complet) return
          ajouterLead({ ...valeurs, sens, transmisParId: moi!.id }, message)
          onFermer()
        }}
      >
        {/* Le sens d'abord : il conditionne les motifs et le sens de lecture. */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(['envoye', 'recu'] as Sens[]).map((s) => {
            const actif = sens === s
            const Fleche = s === 'recu' ? ArrowDownLeft : ArrowUpRight
            return (
              <button
                key={s}
                type="button"
                onClick={() => changerSens(s)}
                aria-pressed={actif}
                className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-left transition-colors ${
                  actif
                    ? s === 'recu'
                      ? 'border-[var(--color-entrant)] bg-[var(--color-entrant-fond)]'
                      : 'border-[var(--color-sortant)] bg-[var(--color-sortant-fond)]'
                    : 'border-bord-fort hover:bg-fond'
                }`}
              >
                <Fleche
                  size={17}
                  className="mt-0.5 shrink-0"
                  style={{
                    color: actif
                      ? s === 'recu'
                        ? 'var(--color-entrant-fonce)'
                        : 'var(--color-sortant-fonce)'
                      : 'var(--color-encre-3)',
                  }}
                />
                <span>
                  <span className="block text-[13.5px] font-semibold">
                    {s === 'envoye' ? 'On l’envoie à Septodont' : 'Septodont nous l’envoie'}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-encre-2">
                    {RESPONSABLE[s]} prend le contact en charge
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Champ label="Structure *">
            <input
              required
              autoFocus
              value={valeurs.structure}
              onChange={maj('structure')}
              placeholder="Cabinet dentaire du Port"
              className={classesSaisie}
            />
          </Champ>
          <Champ label="Praticien ou contact *">
            <input
              required
              value={valeurs.contact}
              onChange={maj('contact')}
              placeholder="Dr Claire Lambert"
              className={classesSaisie}
            />
          </Champ>
          <Champ label="Téléphone">
            <input value={valeurs.telephone} onChange={maj('telephone')} placeholder="04 91 00 00 00" className={classesSaisie} />
          </Champ>
          <Champ label="Email">
            <input type="email" value={valeurs.email} onChange={maj('email')} placeholder="contact@cabinet.fr" className={classesSaisie} />
          </Champ>
          <Champ label="Ville">
            <input value={valeurs.ville} onChange={maj('ville')} placeholder="Marseille" className={classesSaisie} />
          </Champ>
          <Champ label="Code postal">
            <input value={valeurs.codePostal} onChange={maj('codePostal')} placeholder="13008" className={classesSaisie} />
          </Champ>
          <Champ label="Région">
            <select value={valeurs.regionId} onChange={maj('regionId')} className={classesSaisie}>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>{r.nom}</option>
              ))}
            </select>
          </Champ>
          <Champ label="Motif">
            <select value={valeurs.motif} onChange={maj('motif')} className={classesSaisie}>
              {MOTIFS[sens].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </Champ>
        </div>

        <Champ
          label="Mot d’accompagnement"
          aide="Il ouvre la discussion sur le lead. C’est ce que l’autre équipe lira en premier."
        >
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Le praticien pose beaucoup d’implants, il est ouvert à être recontacté."
            className={`${classesSaisie} resize-y`}
          />
        </Champ>

        <div className="flex justify-end gap-2">
          <Bouton type="button" onClick={onFermer}>
            Annuler
          </Bouton>
          <Bouton type="submit" variante="primaire" disabled={!complet}>
            Enregistrer le lead
          </Bouton>
        </div>
      </form>
    </Modale>
  )
}
