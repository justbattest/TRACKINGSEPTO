import { Link } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  MessageSquare,
  Repeat2,
  UserRound,
} from 'lucide-react'
import type { ReactNode } from 'react'
import Entete from '@/components/Entete'
import { useStore } from '@/lib/store'
import { Carte, EtiquetteStatut } from '@/components/ui'
import { AUTRE, LIBELLE_ORGANISATION, MOTIFS, STATUTS, type Statut } from '@/lib/types'

export default function Guide() {
  const { maMaison } = useStore()
  const autre = AUTRE[maMaison]
  const nous = LIBELLE_ORGANISATION[maMaison]
  const eux = LIBELLE_ORGANISATION[autre]

  return (
    <>
      <Entete
        titre="Comment ça marche"
        sous="Tout ce qu’il faut savoir pour utiliser l’outil, en 3 minutes."
      />

      <div className="mx-auto max-w-3xl space-y-8 px-6 py-8 lg:px-8">
        <section className="rounded-xl border border-[var(--color-marque)] bg-[var(--color-marque-clair)] px-6 py-6">
          <h2 className="flex items-center gap-2 text-[17px] font-semibold text-[var(--color-marque-fonce)]">
            <Repeat2 size={19} /> Le principe
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-encre">
            Alyxa et Septodont se passent des contacts. Quand un cabinet se dit ouvert à être
            recontacté par la division chirurgie, c’est un lead pour Septodont. Quand un commercial
            Septodont rencontre un praticien intéressé par le suivi post-consultation, c’est un lead
            pour Alyxa. Cet outil enregistre les deux sens, garde la trace de ce que chaque lead
            devient, et donne un endroit pour en discuter. Rien de plus.
            <span className="mt-2 block text-[13px] text-encre-2">
              Vous êtes connecté côté <strong className="font-semibold text-encre">{nous}</strong> :
              tout l’outil est présenté de votre point de vue.
            </span>
          </p>
        </section>

        <section>
          <TitreSection numero={1} titre="Les deux sens" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SensCarte
              sortant
              titre={`On envoie à ${eux}`}
              texte={`Un contact qui intéresse ${eux}. Une fois transmis, c’est leur équipe qui prend le contact en charge et qui fait avancer le statut — vous suivez sans avoir à relancer.`}
              motifs={MOTIFS[autre]}
            />
            <SensCarte
              titre={`${eux} nous envoie`}
              texte={`Un contact qui nous intéresse, rencontré en clientèle ou sur un salon. Une fois transmis, c’est nous qui appelons, qui faisons la démo, et qui tenons le statut à jour.`}
              motifs={MOTIFS[maMaison]}
            />
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-encre-2">
            La règle est simple : <strong className="font-semibold text-encre">celui qui reçoit
            le lead le fait avancer</strong>. C’est ce qui permet à l’autre de savoir, sans relancer,
            ce que son contact est devenu.
          </p>
        </section>

        <section>
          <TitreSection numero={2} titre="Qui a apporté le lead" />
          <Carte>
            <div className="px-6 py-5">
              <div className="mb-4 flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-marque-clair)] text-[var(--color-marque)]">
                  <UserRound size={18} />
                </span>
                <p className="text-[13.5px] leading-relaxed text-encre-2">
                  Au moment d’ajouter un lead, le premier champ demande{' '}
                  <strong>qui l’a apporté</strong>. C’est cette personne qui compte, pas celle qui
                  tape. Si quelqu’un de {nous} saisit un lead amené par {eux}, il choisit la personne
                  de {eux} : le lead est compté pour {eux}, et c’est {nous} qui le suit.
                </p>
              </div>
              <ul className="space-y-2.5 text-[13.5px] leading-relaxed text-encre-2">
                <Point>
                  Le sens du lead — envoyé ou reçu — en découle tout seul. Il n’y a rien d’autre à
                  cocher. Qui l’a saisi reste noté en second plan : c’est la trace, pas la propriété.
                </Point>
                <Point>
                  <strong>Tout le monde peut corriger n’importe quelle fiche.</strong> Ouvrez le
                  lead, cliquez sur Modifier la fiche, et changez ce qu’il faut — y compris
                  l’apporteur, ce qui rebascule le lead d’une équipe à l’autre.
                </Point>
                <Point>
                  Chaque correction s’inscrit dans la discussion du lead : qui a changé quoi, et
                  quand. Rien ne disparaît en silence.
                </Point>
                <Point>
                  <strong>Plusieurs leads d’un coup :</strong> « Ajouter un autre lead » autant de
                  fois qu’il faut, puis « Créer les N leads ». L’apporteur est commun au lot, et
                  chaque lead se replie en une ligne pour garder la page lisible.
                </Point>
                <Point>
                  Si un lead ressemble à un lead déjà présent, l’outil montre la fiche existante
                  avant de créer. À vous de trancher : un même cabinet peut très bien revenir avec
                  un autre praticien — ça, l’outil ne le signale même pas.
                </Point>
              </ul>
            </div>
          </Carte>
        </section>

        <section>
          <TitreSection numero={3} titre="Les 5 statuts" />
          <Carte>
            <div className="divide-y divide-bord">
              {(
                [
                  ['transmis', 'Le lead vient d’être passé. Personne ne l’a encore appelé — c’est la pile à traiter.'],
                  ['contacte', 'Le contact a été joint. Le lead est vivant.'],
                  ['rdv', 'Un rendez-vous ou une démo est calé.'],
                  ['converti', 'C’est devenu un client. L’échange a produit quelque chose.'],
                  ['sans_suite', 'Injoignable, pas intéressé, ou plus d’actualité. On ferme proprement plutôt que de laisser traîner.'],
                ] as [Statut, string][]
              ).map(([statut, texte]) => (
                <div key={statut} className="flex flex-wrap items-start gap-x-4 gap-y-1.5 px-5 py-3.5">
                  <span className="w-28 shrink-0">
                    <EtiquetteStatut statut={statut} />
                  </span>
                  <p className="min-w-0 flex-1 text-[13.5px] leading-relaxed text-encre-2">{texte}</p>
                </div>
              ))}
            </div>
          </Carte>
          <p className="mt-3 text-[13px] leading-relaxed text-encre-2">
            Chaque changement de statut est horodaté et signé. C’est ce qui permet de dire, chiffres
            en main, combien de temps met chaque camp à prendre un lead en charge.
          </p>
        </section>

        <section>
          <TitreSection numero={4} titre="La discussion sur chaque lead" />
          <Carte>
            <div className="px-6 py-5">
              <div className="mb-4 flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-marque-clair)] text-[var(--color-marque)]">
                  <MessageSquare size={18} />
                </span>
                <p className="text-[13.5px] leading-relaxed text-encre-2">
                  Chaque lead a son propre fil de discussion. Vous y parlez directement avec l’autre
                  équipe : le contexte du contact, ce qu’il a dit, où ça en est. Les changements de
                  statut apparaissent dans le même fil, donc en relisant on a toute l’histoire du
                  lead au même endroit.
                </p>
              </div>
              <ul className="space-y-2.5 text-[13.5px] leading-relaxed text-encre-2">
                <Point>
                  Chacun a son compte et sa couleur. On sait toujours qui a écrit quoi, et de quelle
                  maison.
                </Point>
                <Point>
                  Les leads qui ont des messages non lus remontent avec une pastille bleue, dans la
                  liste comme sur le tableau de bord.
                </Point>
                <Point>
                  Le premier message s’écrit au moment d’ajouter le lead : c’est le mot
                  d’accompagnement, ce que l’autre équipe lira en premier.
                </Point>
              </ul>
            </div>
          </Carte>
        </section>

        <section>
          <TitreSection numero={5} titre="Les trois écrans" />
          <Carte>
            <div className="divide-y divide-bord">
              <Page
                vers="/"
                titre="Tableau de bord"
                texte="L’équilibre de l’échange en haut — combien on envoie, combien on reçoit. Puis le même bilan des deux côtés, pour comparer d’un regard. En bas : les discussions à lire et les leads qui dorment."
              />
              <Page
                vers="/leads"
                titre="Leads"
                texte="La liste complète. Le sélecteur en haut bascule entre les deux sens, les filtres affinent, la recherche trouve. Un clic ouvre la fiche et sa discussion."
              />
              <Page
                vers="/guide"
                titre="Guide"
                texte="Cette page. À envoyer à quelqu’un qui arrive sur l’outil."
              />
            </div>
          </Carte>
        </section>

        <section>
          <TitreSection numero={6} titre="La routine" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Routine
              rythme="En arrivant"
              taches={['Lire les discussions en attente', 'Traiter les leads « Transmis »']}
            />
            <Routine
              rythme="Après chaque appel"
              taches={['Mettre le statut à jour', 'Écrire un mot dans le fil du lead']}
            />
            <Routine
              rythme="Chaque mois"
              taches={['Regarder l’équilibre', 'Relancer les leads qui dorment', 'Exporter le point à envoyer']}
            />
          </div>
        </section>

        <section className="rounded-xl border border-bord bg-carte px-6 py-6 text-center">
          <CheckCircle2 size={26} className="mx-auto text-[var(--color-bien)]" />
          <h2 className="mt-2.5 text-[16px] font-semibold">C’est tout.</h2>
          <p className="mx-auto mt-1.5 max-w-lg text-[13.5px] leading-relaxed text-encre-2">
            Enregistrer les leads dans les deux sens, tenir les {STATUTS.length} statuts à jour, se
            parler dans le fil. Le reste — les compteurs, l’équilibre, les délais — se calcule tout
            seul.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Lien vers="/">Ouvrir le tableau de bord</Lien>
            <Lien vers="/leads">Voir les leads</Lien>
          </div>
        </section>
      </div>
    </>
  )
}

function TitreSection({ numero, titre }: { numero: number; titre: string }) {
  return (
    <h2 className="mb-3.5 flex items-center gap-2.5 text-[16px] font-semibold">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-encre text-[12px] font-semibold text-white">
        {numero}
      </span>
      {titre}
    </h2>
  )
}

function SensCarte({
  sortant,
  titre,
  texte,
  motifs,
}: {
  sortant?: boolean
  titre: string
  texte: string
  motifs: string[]
}) {
  const accent = sortant ? 'var(--color-sortant)' : 'var(--color-entrant)'
  const fond = sortant ? 'var(--color-sortant-fond)' : 'var(--color-entrant-fond)'
  const Fleche = sortant ? ArrowUpRight : ArrowDownLeft
  return (
    <div className="rounded-xl border border-bord bg-carte px-5 py-5">
      <div
        className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-lg"
        style={{ background: fond, color: accent }}
      >
        <Fleche size={18} />
      </div>
      <h3 className="text-[14.5px] font-semibold">{titre}</h3>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-encre-2">{texte}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {motifs.slice(0, -1).map((m) => (
          <span key={m} className="rounded-md bg-fond px-2 py-1 text-[11.5px] text-encre-2">
            {m}
          </span>
        ))}
      </div>
    </div>
  )
}

function Point({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2">
      <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[var(--color-bien)]" />
      <span>{children}</span>
    </li>
  )
}

function Page({ vers, titre, texte }: { vers: string; titre: string; texte: string }) {
  return (
    <Link to={vers} className="block px-5 py-4 transition-colors hover:bg-fond">
      <span className="flex items-center gap-1.5 text-[14px] font-semibold">
        {titre} <ArrowRight size={13} className="text-encre-3" />
      </span>
      <span className="mt-0.5 block text-[13.5px] leading-relaxed text-encre-2">{texte}</span>
    </Link>
  )
}

function Routine({ rythme, taches }: { rythme: string; taches: string[] }) {
  return (
    <div className="rounded-xl border border-bord bg-carte px-5 py-5">
      <div className="text-[13.5px] font-semibold">{rythme}</div>
      <ul className="mt-2.5 space-y-2">
        {taches.map((t) => (
          <li key={t} className="flex gap-2 text-[13px] leading-snug text-encre-2">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[var(--color-bien)]" />
            {t}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Lien({ vers, children }: { vers: string; children: ReactNode }) {
  return (
    <Link
      to={vers}
      className="inline-flex items-center gap-1.5 rounded-lg border border-bord-fort bg-carte px-3 py-1.5 text-[12.5px] font-medium text-encre transition-colors hover:bg-fond"
    >
      {children} <ArrowRight size={13} />
    </Link>
  )
}
