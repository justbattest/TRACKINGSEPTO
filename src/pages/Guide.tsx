import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Calculator,
  CheckCircle2,
  Coins,
  FileSpreadsheet,
  Link2,
  Users,
  Wallet,
} from 'lucide-react'
import type { ReactNode } from 'react'
import Entete from '@/components/Entete'
import { Carte } from '@/components/ui'
import { SERIES } from '@/components/graphiques'
import { euros, simuler } from '@/lib/engine'
import { LIBELLE_ETAPE, type Etape } from '@/lib/types'

const annuel = simuler('annuel')
const mensuel = simuler('mensuel')

export default function Guide() {
  return (
    <>
      <Entete
        titre="Comment ça marche"
        sous="Tout ce qu’il faut savoir pour utiliser l’outil, en 5 minutes de lecture."
      />

      <div className="mx-auto max-w-4xl space-y-8 px-6 py-8 lg:px-8">
        {/* 1 — Le principe, en une phrase. */}
        <section className="rounded-xl border border-[var(--color-marque)] bg-[var(--color-marque-clair)] px-6 py-6">
          <h2 className="text-[17px] font-semibold text-[var(--color-marque-fonce)]">
            À quoi sert cet outil
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-encre">
            Septodont nous envoie des cabinets dentaires. Cet outil enregistre chacun d’eux, suit ce
            qu’il devient, et calcule <strong className="font-semibold">tout seul</strong> l’argent
            qui circule : la remise accordée au cabinet, la commission due au commercial Septodont,
            et ce qui reste à Alyxa. Plus aucun tableur à maintenir, plus aucune discussion sur les
            chiffres.
          </p>
        </section>

        {/* 2 — Les trois regles du deal. */}
        <section>
          <TitreSection numero={1} titre="Les 3 règles du partenariat" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Regle
              chiffre="−10 %"
              titre="pour le cabinet"
              texte="Tout cabinet qui souscrit via Septodont paie 10 % de moins que le tarif public."
            />
            <Regle
              chiffre="15 %"
              titre="pour le commercial"
              texte="Le commercial Septodont qui a apporté le lead touche 15 % de ce que le cabinet paie, chaque mois."
            />
            <Regle
              chiffre="12 mois"
              titre="maximum"
              texte="La commission court sur la durée d’engagement, plafonnée à 12 mois, et s’arrête net en cas de résiliation."
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ExempleChiffre
              titre="Un cabinet prend l’annuel"
              lignes={[
                ['Prix public Alyxa', euros(annuel.prixCatalogue), 'neutre'],
                ['Remise Septodont −10 %', `− ${euros(annuel.remise)}`, 'sortie'],
                ['Le cabinet paie', euros(annuel.prixPaye), 'fort'],
                ['Commission commerciale 15 %', `− ${euros(annuel.commission)}`, 'sortie'],
                ['Il reste à Alyxa', euros(annuel.netAlyxa), 'entree'],
              ]}
              conclusion={`Pendant 12 mois → ${euros(annuel.commission * 12)} de commission au total.`}
            />
            <ExempleChiffre
              titre="Un cabinet prend le mensuel"
              lignes={[
                ['Prix public Alyxa', euros(mensuel.prixCatalogue), 'neutre'],
                ['Remise Septodont −10 %', `− ${euros(mensuel.remise)}`, 'sortie'],
                ['Le cabinet paie', euros(mensuel.prixPaye), 'fort'],
                ['Commission commerciale 15 %', `− ${euros(mensuel.commission)}`, 'sortie'],
                ['Il reste à Alyxa', euros(mensuel.netAlyxa), 'entree'],
              ]}
              conclusion={`Engagement d’un mois → une seule commission de ${euros(mensuel.commission)}.`}
            />
          </div>
        </section>

        {/* 3 — Le cycle de vie d'un lead. */}
        <section>
          <TitreSection numero={2} titre="La vie d’un lead, de A à Z" />
          <Carte>
            <div className="space-y-0 px-6 py-6">
              {(
                [
                  ['nouveau', 'Septodont nous transmet le cabinet. L’outil l’horodate — c’est cette date qui fait foi.'],
                  ['contacte', 'On a joint le praticien. Le chrono du suivi démarre.'],
                  ['demo_planifiee', 'Une démo est calée dans l’agenda.'],
                  ['demo_faite', 'La démo a eu lieu. Le cabinet décide.'],
                  ['signe', 'Le cabinet souscrit. À cet instant, l’outil crée le contrat et génère TOUT l’échéancier de commission du commercial, mois par mois.'],
                ] as [Etape, string][]
              ).map(([etape, texte], i, tous) => (
                <div key={etape} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white"
                      style={{ background: i === tous.length - 1 ? SERIES.s3 : SERIES.s1 }}
                    >
                      {i + 1}
                    </span>
                    {i < tous.length - 1 && <span className="w-px flex-1 bg-bord" />}
                  </div>
                  <div className="pb-5">
                    <div className="text-[14px] font-semibold">{LIBELLE_ETAPE[etape]}</div>
                    <p className="mt-0.5 text-[13.5px] leading-relaxed text-encre-2">{texte}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-bord bg-fond px-6 py-4 text-[13px] leading-relaxed text-encre-2">
              <strong className="font-semibold text-encre">Et si le cabinet résilie ?</strong> Vous
              ouvrez sa fiche, vous cliquez sur « Déclarer une résiliation ». Toutes les échéances
              postérieures passent en « Annulée » et sortent du montant à payer. Celles déjà versées
              ne bougent jamais.
            </div>
          </Carte>
        </section>

        {/* 4 — Comment saisir un lead. */}
        <section>
          <TitreSection numero={3} titre="Deux façons d’enregistrer un lead" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Carte>
              <div className="px-5 py-5">
                <div className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-marque-clair)] text-[var(--color-marque)]">
                  <Link2 size={18} />
                </div>
                <h3 className="text-[14.5px] font-semibold">Le lien personnel — recommandé</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-encre-2">
                  Chaque commercial Septodont a son propre lien, du type{' '}
                  <code className="rounded bg-fond px-1.5 py-0.5 text-[12.5px]">/l/julien-marchand</code>.
                  Il le donne au cabinet, qui remplit lui-même le formulaire. Le lead arrive déjà
                  attribué au bon commercial, à la bonne date, sans que personne ne saisisse quoi que
                  ce soit. Zéro erreur, zéro contestation possible.
                </p>
                <Lien vers="/commerciaux">Récupérer les liens</Lien>
              </div>
            </Carte>
            <Carte>
              <div className="px-5 py-5">
                <div className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-marque-clair)] text-[var(--color-marque)]">
                  <FileSpreadsheet size={18} />
                </div>
                <h3 className="text-[14.5px] font-semibold">La saisie manuelle</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-encre-2">
                  Quand un commercial vous transmet un cabinet par téléphone ou par mail, vous
                  l’ajoutez à la main depuis la page Leads. Il faut juste penser à sélectionner le
                  bon commercial : c’est lui qui déclenchera la commission.
                </p>
                <Lien vers="/leads">Aller aux leads</Lien>
              </div>
            </Carte>
          </div>
        </section>

        {/* 5 — A quoi sert chaque page. */}
        <section>
          <TitreSection numero={4} titre="À quoi sert chaque page" />
          <Carte>
            <div className="divide-y divide-bord">
              <Page
                icone={<BarChart3 size={17} />}
                vers="/"
                titre="Tableau de bord"
                texte="La photo du partenariat : volume reçu, conversion, revenu, argent dû. Les leads en souffrance remontent en bas de page — c’est la seule liste à regarder tous les matins."
              />
              <Page
                icone={<Users size={17} />}
                vers="/leads"
                titre="Leads"
                texte="La liste complète, filtrable par étape, commercial et région. Cliquez sur une ligne pour ouvrir la fiche, faire avancer le lead ou consulter son historique horodaté."
              />
              <Page
                icone={<Coins size={17} />}
                vers="/commerciaux"
                titre="Commerciaux"
                texte="Le classement des commerciaux Septodont : combien ils envoient, combien ça transforme, combien ils gagnent. C’est la page à partager avec Septodont pour animer leur réseau."
              />
              <Page
                icone={<Wallet size={17} />}
                vers="/commissions"
                titre="Commissions"
                texte="L’échéancier mois par mois. Vous voyez le montant exact à virer, vous marquez payé, vous exportez pour la compta."
              />
              <Page
                icone={<Calculator size={17} />}
                vers="/simulateur"
                titre="Simulateur"
                texte="Pour répondre à « et si Septodont nous envoyait 50 leads par mois ? » sans ouvrir un tableur."
              />
            </div>
          </Carte>
        </section>

        {/* 6 — La routine. */}
        <section>
          <TitreSection numero={5} titre="La routine à tenir" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Routine
              rythme="Chaque jour"
              taches={[
                'Ouvrir le tableau de bord',
                'Traiter la liste « À traiter en priorité »',
                'Faire avancer les leads contactés',
              ]}
            />
            <Routine
              rythme="Chaque semaine"
              taches={[
                'Vérifier les leads sans mouvement',
                'Passer en « Signé » les cabinets qui ont souscrit',
                'Déclarer les résiliations éventuelles',
              ]}
            />
            <Routine
              rythme="Chaque mois"
              taches={[
                'Ouvrir Commissions',
                'Vérifier le montant du mois',
                'Payer, puis « Tout marquer payé »',
                'Exporter le CSV pour la compta',
              ]}
            />
          </div>
        </section>

        {/* 7 — Les points de vigilance. */}
        <section>
          <TitreSection numero={6} titre="Les 4 pièges à connaître" />
          <Carte>
            <div className="divide-y divide-bord">
              <Piege
                titre="Le même cabinet envoyé deux fois"
                texte="Si deux commerciaux transmettent le même cabinet, c’est le premier horodatage qui gagne. Vérifiez toujours par la recherche avant d’ajouter un lead — le nom du cabinet ou sa ville suffit."
              />
              <Piege
                titre="La définition de « signé »"
                texte="Un lead ne passe en « Signé » que lorsque le contrat est réellement souscrit, pas quand le cabinet dit oui au téléphone. C’est ce clic qui engage l’argent : il crée un échéancier de commission."
              />
              <Piege
                titre="La formule change tout"
                texte={`Annuel ou mensuel, ce n’est pas le même montant ni la même durée : ${euros(annuel.commission * 12)} sur 12 mois contre ${euros(mensuel.commission)} une seule fois. Sélectionnez bien la formule au moment de passer le lead en signé.`}
              />
              <Piege
                titre="La résiliation doit être saisie"
                texte="Tant qu’une résiliation n’est pas déclarée dans l’outil, on continue de compter la commission. C’est le seul geste que le système ne peut pas deviner tout seul."
              />
            </div>
          </Carte>
        </section>

        <section className="rounded-xl border border-bord bg-carte px-6 py-6 text-center">
          <CheckCircle2 size={26} className="mx-auto text-[var(--color-bien)]" />
          <h2 className="mt-2.5 text-[16px] font-semibold">C’est tout.</h2>
          <p className="mx-auto mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-encre-2">
            Enregistrer les leads, les faire avancer, payer une fois par mois. Le reste — remises,
            commissions, échéanciers, marges — se calcule tout seul.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Lien vers="/">Ouvrir le tableau de bord</Lien>
            <Lien vers="/simulateur">Essayer le simulateur</Lien>
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

function Regle({ chiffre, titre, texte }: { chiffre: string; titre: string; texte: string }) {
  return (
    <div className="rounded-xl border border-bord bg-carte px-5 py-5">
      <div className="tabulaire text-[27px] leading-none font-semibold text-[var(--color-marque)]">
        {chiffre}
      </div>
      <div className="mt-1 text-[13.5px] font-semibold">{titre}</div>
      <p className="mt-1.5 text-[13px] leading-relaxed text-encre-2">{texte}</p>
    </div>
  )
}

function ExempleChiffre({
  titre,
  lignes,
  conclusion,
}: {
  titre: string
  lignes: [string, string, string][]
  conclusion: string
}) {
  const tons: Record<string, string> = {
    neutre: 'text-encre-2',
    sortie: 'text-[var(--color-critique)]',
    entree: 'text-[var(--color-bien)] font-semibold',
    fort: 'text-encre font-semibold',
  }
  return (
    <Carte titre={titre}>
      <div className="divide-y divide-bord text-[13.5px]">
        {lignes.map(([libelle, valeur, ton]) => (
          <div
            key={libelle}
            className={`flex items-center justify-between px-5 py-2.5 ${ton === 'fort' || ton === 'entree' ? 'bg-fond' : ''}`}
          >
            <span className={ton === 'fort' || ton === 'entree' ? 'font-medium' : 'text-encre-2'}>
              {libelle}
            </span>
            <span className={`tabulaire ${tons[ton]}`}>{valeur}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-bord px-5 py-3 text-[12.5px] text-encre-2">{conclusion}</div>
    </Carte>
  )
}

function Page({
  icone,
  vers,
  titre,
  texte,
}: {
  icone: ReactNode
  vers: string
  titre: string
  texte: string
}) {
  return (
    <Link to={vers} className="flex gap-4 px-5 py-4 transition-colors hover:bg-fond">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-marque-clair)] text-[var(--color-marque)]">
        {icone}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-[14px] font-semibold">
          {titre} <ArrowRight size={13} className="text-encre-3" />
        </span>
        <span className="mt-0.5 block text-[13.5px] leading-relaxed text-encre-2">{texte}</span>
      </span>
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

function Piege({ titre, texte }: { titre: string; texte: string }) {
  return (
    <div className="px-5 py-4">
      <div className="text-[14px] font-semibold">{titre}</div>
      <p className="mt-1 text-[13.5px] leading-relaxed text-encre-2">{texte}</p>
    </div>
  )
}

function Lien({ vers, children }: { vers: string; children: ReactNode }) {
  return (
    <Link
      to={vers}
      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-bord-fort bg-carte px-3 py-1.5 text-[12.5px] font-medium text-encre transition-colors hover:bg-fond"
    >
      {children} <ArrowRight size={13} />
    </Link>
  )
}
