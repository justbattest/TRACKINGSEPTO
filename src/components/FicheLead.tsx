import { useEffect, useMemo, useRef, useState } from 'react'
import { Mail, MapPin, Phone, Send, Trash2, User } from 'lucide-react'
import { Avatar, Bouton, EtiquetteSens, Modale } from '@/components/ui'
import { useStore } from '@/lib/store'
import { formatDate } from '@/lib/dates'
import { joursDepuis } from '@/lib/stats'
import {
  AUTRE,
  destinataire,
  LIBELLE_ORGANISATION,
  LIBELLE_STATUT,
  sensPour,
  STATUTS,
  type Evenement,
  type Statut,
} from '@/lib/types'

/** Fiche complete d'un lead : ses informations, son parcours, sa discussion. */
export default function FicheLead({ leadId, onFermer }: { leadId: string; onFermer: () => void }) {
  const { leadDe, membreDe, regionDe, moi, maMaison, changerStatut, envoyerMessage, marquerLu, supprimerLead } =
    useStore()
  const lead = leadDe(leadId)
  const [brouillon, setBrouillon] = useState('')
  const [confirmerSuppression, setConfirmerSuppression] = useState(false)
  const finDuFil = useRef<HTMLDivElement>(null)

  // Ouvrir la fiche vaut lecture de tout ce qui s'y trouve.
  useEffect(() => {
    marquerLu(leadId)
  }, [leadId, marquerLu, lead?.fil.length])

  // On arrive toujours sur le dernier message, comme dans une messagerie.
  useEffect(() => {
    finDuFil.current?.scrollIntoView({ block: 'end' })
  }, [lead?.fil.length])

  const transmetteur = membreDe(lead?.transmisParId ?? '')
  const jours = lead ? joursDepuis(lead.transmisLe) : 0

  const fil = useMemo(() => lead?.fil ?? [], [lead])

  if (!lead) return null

  const sens = sensPour(lead, maMaison)
  const suivi = destinataire(lead)

  function envoyer() {
    if (!brouillon.trim()) return
    envoyerMessage(leadId, brouillon)
    setBrouillon('')
  }

  return (
    <Modale
      titre={
        <span className="flex flex-wrap items-center gap-2">
          {lead.structure}
          <EtiquetteSens sens={sens} maison={maMaison} complet />
        </span>
      }
      sous={
        <span>
          Transmis par <strong className="font-semibold text-encre">{transmetteur?.nom ?? '—'}</strong>{' '}
          le {formatDate(lead.transmisLe)}
          {jours > 0 && <span className="text-encre-3"> · il y a {jours} jours</span>}
          <span className="text-encre-3"> · suivi par {LIBELLE_ORGANISATION[suivi]}</span>
        </span>
      }
      onFermer={onFermer}
      large
    >
      <div className="grid grid-cols-1 gap-y-0 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
        {/* Colonne gauche : tout ce qui identifie et qualifie le lead. */}
        <aside className="space-y-4 border-b border-bord px-6 py-5 lg:border-r lg:border-b-0">
          <dl className="space-y-2.5 text-[13.5px]">
            <Info icone={<User size={14} />}>{lead.contact}</Info>
            <Info icone={<MapPin size={14} />}>
              {[lead.ville, lead.codePostal].filter(Boolean).join(' ') || '—'}
              <span className="block text-[12px] text-encre-3">{regionDe(lead.regionId)}</span>
            </Info>
            <Info icone={<Phone size={14} />}>
              {lead.telephone ? (
                <a href={`tel:${lead.telephone.replace(/\s/g, '')}`} className="hover:underline">
                  {lead.telephone}
                </a>
              ) : (
                '—'
              )}
            </Info>
            <Info icone={<Mail size={14} />}>
              {lead.email ? (
                <a href={`mailto:${lead.email}`} className="break-all hover:underline">
                  {lead.email}
                </a>
              ) : (
                '—'
              )}
            </Info>
          </dl>

          <div className="rounded-lg bg-fond px-3.5 py-3">
            <div className="text-[11.5px] font-medium tracking-wide text-encre-3 uppercase">Motif</div>
            <div className="mt-1 text-[13.5px] font-medium">{lead.motif}</div>
          </div>

          <div>
            <div className="mb-2 text-[11.5px] font-medium tracking-wide text-encre-3 uppercase">
              Statut
            </div>
            <div className="flex flex-wrap gap-1.5">
              {STATUTS.map((s) => (
                <button
                  key={s}
                  onClick={() => changerStatut(leadId, s)}
                  aria-pressed={lead.statut === s}
                  className={`rounded-lg border px-2.5 py-1.5 text-[12.5px] font-medium transition-colors ${
                    lead.statut === s
                      ? 'border-[var(--color-marque)] bg-[var(--color-marque-clair)] text-[var(--color-marque-fonce)]'
                      : 'border-bord-fort text-encre-2 hover:bg-fond'
                  }`}
                >
                  {LIBELLE_STATUT[s]}
                </button>
              ))}
            </div>
          </div>

          {confirmerSuppression ? (
            <div className="rounded-lg border border-[var(--color-critique)] px-3.5 py-3">
              <p className="text-[12.5px] text-encre-2">
                Supprimer ce lead et toute sa discussion ? C’est définitif.
              </p>
              <div className="mt-2.5 flex gap-2">
                <Bouton
                  variante="danger"
                  onClick={() => {
                    supprimerLead(leadId)
                    onFermer()
                  }}
                >
                  Supprimer
                </Bouton>
                <Bouton onClick={() => setConfirmerSuppression(false)}>Annuler</Bouton>
              </div>
            </div>
          ) : (
            <Bouton variante="danger" onClick={() => setConfirmerSuppression(true)}>
              <Trash2 size={14} /> Supprimer le lead
            </Bouton>
          )}
        </aside>

        {/* Colonne droite : le fil, puis la zone d'ecriture. */}
        <section className="flex min-h-0 flex-col">
          <div className="max-h-[46vh] min-h-[240px] flex-1 space-y-3 overflow-y-auto px-6 py-5">
            {fil.map((e, i) =>
              e.type === 'statut' ? (
                <LigneStatut key={e.id} evenement={e} premier={i === 0} />
              ) : (
                <Message key={e.id} evenement={e} aMoi={e.auteurId === moi?.id} />
              ),
            )}
            <div ref={finDuFil} />
          </div>

          <div className="border-t border-bord px-6 py-4">
            <div className="flex items-end gap-2">
              <Avatar membre={moi} taille={32} />
              <textarea
                value={brouillon}
                onChange={(ev) => setBrouillon(ev.target.value)}
                onKeyDown={(ev) => {
                  // Entrée envoie, Maj+Entrée passe à la ligne.
                  if (ev.key === 'Enter' && !ev.shiftKey) {
                    ev.preventDefault()
                    envoyer()
                  }
                }}
                rows={1}
                placeholder={`Écrire à l’équipe ${LIBELLE_ORGANISATION[AUTRE[maMaison]]}…`}
                className="max-h-32 min-h-[40px] flex-1 resize-y rounded-lg border border-bord-fort bg-carte px-3 py-2.5 text-[13.5px] outline-none transition-colors focus:border-[var(--color-marque)] focus:ring-2 focus:ring-[var(--color-marque-clair)]"
              />
              <Bouton
                variante="primaire"
                onClick={envoyer}
                disabled={!brouillon.trim()}
                aria-label="Envoyer le message"
                className="h-10 px-3"
              >
                <Send size={16} />
              </Bouton>
            </div>
            <p className="mt-1.5 pl-11 text-[11.5px] text-encre-3">
              Entrée pour envoyer, Maj + Entrée pour aller à la ligne.
            </p>
          </div>
        </section>
      </div>
    </Modale>
  )
}

function Info({ icone, children }: { icone: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-encre-2">
      <span className="mt-0.5 shrink-0 text-encre-3">{icone}</span>
      <span className="min-w-0">{children}</span>
    </div>
  )
}

/** Un changement de statut : une ligne discrete, jamais une bulle. */
function LigneStatut({ evenement, premier }: { evenement: Evenement; premier: boolean }) {
  const { membreDe } = useStore()
  const auteur = membreDe(evenement.auteurId)
  const libelle = premier
    ? 'a transmis le lead'
    : `a marqué le lead « ${LIBELLE_STATUT[evenement.statut as Statut]} »`
  return (
    <div className="flex items-center gap-2 py-0.5 text-[12px] text-encre-3">
      <span className="h-px flex-1 bg-bord" />
      <span className="whitespace-nowrap">
        <strong className="font-medium text-encre-2">{auteur?.nom ?? 'Quelqu’un'}</strong> {libelle} ·{' '}
        {formatDate(evenement.date)}
      </span>
      <span className="h-px flex-1 bg-bord" />
    </div>
  )
}

/** Un message de la discussion. */
function Message({ evenement, aMoi }: { evenement: Evenement; aMoi: boolean }) {
  const { membreDe } = useStore()
  const auteur = membreDe(evenement.auteurId)
  const heure = new Date(evenement.date).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className={`flex gap-2.5 ${aMoi ? 'flex-row-reverse' : ''}`}>
      <Avatar membre={auteur} taille={30} titre />
      <div className={`min-w-0 max-w-[80%] ${aMoi ? 'text-right' : ''}`}>
        <div className="mb-1 flex flex-wrap items-baseline gap-x-1.5 text-[11.5px] text-encre-3">
          <span className="font-semibold text-encre-2">{auteur?.nom ?? 'Quelqu’un'}</span>
          {auteur && <span>{LIBELLE_ORGANISATION[auteur.organisation]}</span>}
          <span>· {heure}</span>
        </div>
        <div
          className={`inline-block rounded-xl px-3.5 py-2.5 text-left text-[13.5px] leading-relaxed whitespace-pre-wrap ${
            aMoi
              ? 'bg-[var(--color-marque)] text-white'
              : 'border border-bord bg-fond text-encre'
          }`}
        >
          {evenement.texte}
        </div>
      </div>
    </div>
  )
}
