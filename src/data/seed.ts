/**
 * Jeu de donnees de demonstration, genere de facon deterministe pour que
 * l'outil soit lisible des la premiere ouverture. A remplacer par les vraies
 * donnees des que la base est branchee.
 */
import {
  AUTRE,
  COULEURS_MEMBRE,
  MOTIFS,
  type Evenement,
  type Lead,
  type Membre,
  type Organisation,
  type Region,
  type Statut,
} from '@/lib/types'

export const REGIONS: Region[] = [
  { id: 'idf', nom: 'Île-de-France' },
  { id: 'paca', nom: 'PACA' },
  { id: 'ara', nom: 'Auvergne-Rhône-Alpes' },
  { id: 'occ', nom: 'Occitanie' },
  { id: 'na', nom: 'Nouvelle-Aquitaine' },
  { id: 'hdf', nom: 'Hauts-de-France' },
  { id: 'ge', nom: 'Grand Est' },
  { id: 'bzh', nom: 'Bretagne' },
  { id: 'pdl', nom: 'Pays de la Loire' },
  { id: 'nor', nom: 'Normandie' },
]

/**
 * Les personnes des deux maisons. Chacune a sa couleur : c'est elle qui
 * identifie l'auteur dans les discussions.
 */
export const MEMBRES: Membre[] = [
  { id: 'a1', nom: 'Alexandre Battestini', organisation: 'alyxa', couleur: COULEURS_MEMBRE[0] },
  { id: 'a2', nom: 'Mathieu Manceron', organisation: 'alyxa', couleur: COULEURS_MEMBRE[1] },
  { id: 'a3', nom: 'Enzo Aubry', organisation: 'alyxa', couleur: COULEURS_MEMBRE[2] },
  { id: 's1', nom: 'Julien Marchand', organisation: 'septodont', couleur: COULEURS_MEMBRE[3] },
  { id: 's2', nom: 'Sofia Benali', organisation: 'septodont', couleur: COULEURS_MEMBRE[4] },
  { id: 's3', nom: 'Thomas Perrin', organisation: 'septodont', couleur: COULEURS_MEMBRE[5] },
  { id: 's4', nom: 'Camille Duval', organisation: 'septodont', couleur: COULEURS_MEMBRE[6] },
]

/** Les membres de chaque maison. */
const GENS: Record<Organisation, string[]> = {
  alyxa: ['a1', 'a2', 'a3'],
  septodont: ['s1', 's2', 's3', 's4'],
}

const VILLES: Record<string, [string, string][]> = {
  idf: [['Paris', '75011'], ['Boulogne-Billancourt', '92100'], ['Versailles', '78000'], ['Créteil', '94000']],
  paca: [['Marseille', '13008'], ['Nice', '06000'], ['Toulon', '83000'], ['Aix-en-Provence', '13100']],
  ara: [['Lyon', '69006'], ['Grenoble', '38000'], ['Annecy', '74000'], ['Saint-Étienne', '42000']],
  occ: [['Toulouse', '31000'], ['Montpellier', '34000'], ['Nîmes', '30000'], ['Perpignan', '66000']],
  na: [['Bordeaux', '33000'], ['La Rochelle', '17000'], ['Pau', '64000'], ['Limoges', '87000']],
  hdf: [['Lille', '59000'], ['Amiens', '80000'], ['Arras', '62000'], ['Dunkerque', '59140']],
  ge: [['Strasbourg', '67000'], ['Reims', '51100'], ['Metz', '57000'], ['Nancy', '54000']],
  bzh: [['Rennes', '35000'], ['Brest', '29200'], ['Quimper', '29000'], ['Vannes', '56000']],
  pdl: [['Nantes', '44000'], ['Angers', '49000'], ['Le Mans', '72000'], ['La Roche-sur-Yon', '85000']],
  nor: [['Rouen', '76000'], ['Caen', '14000'], ['Le Havre', '76600'], ['Cherbourg', '50100']],
}

const PRENOMS = ['Claire', 'Vincent', 'Nathalie', 'Olivier', 'Sandrine', 'Philippe', 'Émilie', 'Laurent', 'Céline', 'Guillaume', 'Aurélie', 'Sébastien', 'Delphine', 'Frédéric', 'Isabelle', 'Maxime']
const NOMS = ['Lambert', 'Moreau', 'Simon', 'Michel', 'Garcia', 'Robin', 'Blanc', 'Guerin', 'Muller', 'Henry', 'Roche', 'Colin', 'Vidal', 'Charpentier', 'Renard', 'Barbier']

/**
 * Echanges types entre les deux equipes. Premier message = celui qui transmet,
 * second = celui qui recoit : c'est le rythme reel d'une discussion sur un lead.
 */
const CONVERSATIONS: Record<Organisation, [string, string][]> = {
  alyxa: [
    [
      'Le praticien pose beaucoup d’implants, il est ouvert à être recontacté par votre division chirurgie.',
      'Parfait, je le prends. Je l’appelle en début de semaine prochaine.',
    ],
    [
      'Déjà équipé chez vous sur les consommables, il veut élargir. Il attend votre appel.',
      'Noté, je regarde son historique de commandes avant de le rappeler.',
    ],
    [
      'Cabinet de 4 praticiens, gros volume de chirurgie. Je vous laisse le contact direct.',
      'Merci, on a un commercial sur ce secteur, je lui transmets aujourd’hui.',
    ],
    [
      'Il m’a dit être en réflexion sur son fournisseur actuel, c’est le bon moment.',
      'Très bien, je le mets en priorité. Je vous dis ce que ça donne.',
    ],
  ],
  septodont: [
    [
      'Cabinet rencontré ce matin, très intéressé par le suivi post-consultation. Il attend une démo.',
      'Super, je le contacte aujourd’hui pour caler un créneau.',
    ],
    [
      'Le praticien m’a parlé de ses no-shows, je lui ai dit que vous aviez une solution.',
      'Merci, c’est exactement notre sujet. Je l’appelle demain matin.',
    ],
    [
      'Il veut des précisions sur l’hébergement des données avant d’aller plus loin.',
      'Je lui envoie la fiche HDS et je le rappelle dans la foulée.',
    ],
    [
      'Rencontré au salon, il est preneur d’une démo mais pas avant le 15.',
      'Noté, je le relance à cette date. Merci pour le contact.',
    ],
  ],
}

/** Reponses courtes qui prolongent parfois l'echange. */
const RELANCES = [
  'Démo faite, très bon retour du praticien.',
  'Je le relance cette semaine, il n’a pas encore répondu.',
  'Rendez-vous calé, je vous tiens au courant.',
  'Ça avance bien de notre côté, merci pour le contact.',
]

/** Generateur pseudo-aleatoire deterministe (mulberry32). */
function alea(graine: number) {
  let a = graine
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Repartition des issues, un peu meilleure sur les leads qu'on recoit. */
const ISSUES: Record<Organisation, [Statut, number][]> = {
  septodont: [['transmis', 0.16], ['contacte', 0.2], ['rdv', 0.16], ['converti', 0.26], ['sans_suite', 0.22]],
  alyxa: [['transmis', 0.2], ['contacte', 0.22], ['rdv', 0.15], ['converti', 0.2], ['sans_suite', 0.23]],
}

export interface JeuDeDonnees {
  regions: Region[]
  membres: Membre[]
  leads: Lead[]
}

export function genererDemo(reference: Date = new Date()): JeuDeDonnees {
  const rnd = alea(20260909)
  const leads: Lead[] = []
  const regions = REGIONS.map((r) => r.id)

  // 6 mois d'historique, avec un volume qui monte doucement.
  for (let recul = 5; recul >= 0; recul--) {
    for (const origine of ['septodont', 'alyxa'] as Organisation[]) {
      // Septodont transmet un peu plus que nous : l'echange n'est pas parfait.
      const base = origine === 'septodont' ? 5 : 4
      const volume = base + Math.round((5 - recul) * 0.9) + (rnd() > 0.6 ? 1 : 0)

      for (let i = 0; i < volume; i++) {
        const regionId = regions[Math.floor(rnd() * regions.length)]
        const [ville, cp] = VILLES[regionId][Math.floor(rnd() * VILLES[regionId].length)]
        const dernierJour = recul === 0 ? reference.getUTCDate() : 28
        const jour = 1 + Math.floor(rnd() * dernierJour)
        const transmisLe = new Date(
          Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() - recul, jour),
        )

        let cumul = 0
        const tirage = rnd()
        let statut: Statut = 'transmis'
        for (const [s, part] of ISSUES[origine]) {
          cumul += part
          if (tirage <= cumul) {
            statut = s
            break
          }
        }
        // Un lead transmis cette semaine n'a pas encore eu le temps d'aboutir.
        if (recul === 0 && (statut === 'converti' || statut === 'rdv')) statut = 'contacte'
        // A l'inverse, un lead vieux de plus de deux mois a rarement ete laisse
        // sans reponse : il a fini par aboutir, dans un sens ou dans l'autre.
        if (recul >= 2 && statut === 'transmis' && rnd() > 0.15) {
          statut = rnd() > 0.45 ? 'converti' : rnd() > 0.4 ? 'sans_suite' : 'contacte'
        }

        // Le motif est celui de la maison qui recoit le lead.
        const cible = AUTRE[origine]
        const motifs = MOTIFS[cible]
        // L'apporteur vient de la maison d'origine. Celui qui saisit est le
        // plus souvent lui-meme, parfois un collegue — comme dans la realite.
        const auteurs = GENS[origine]
        const receveurs = GENS[cible]
        const apporteurId = auteurs[Math.floor(rnd() * auteurs.length)]
        const auteurId = rnd() > 0.25 ? apporteurId : auteurs[Math.floor(rnd() * auteurs.length)]
        const receveurId = receveurs[Math.floor(rnd() * receveurs.length)]
        const fil = construireFil(origine, statut, transmisLe, auteurId, receveurId, leads.length, rnd, reference)

        leads.push({
          id: `l${leads.length + 1}`,
          origine,
          apporteParId: apporteurId,
          structure: `Cabinet dentaire ${ville}${rnd() > 0.65 ? ' Centre' : ''}`,
          contact: `Dr ${PRENOMS[Math.floor(rnd() * PRENOMS.length)]} ${NOMS[Math.floor(rnd() * NOMS.length)]}`,
          telephone: `0${1 + Math.floor(rnd() * 5)} ${String(10 + Math.floor(rnd() * 89))} ${String(10 + Math.floor(rnd() * 89))} ${String(10 + Math.floor(rnd() * 89))} ${String(10 + Math.floor(rnd() * 89))}`,
          email: `contact@cabinet-${ville.toLowerCase().replace(/[^a-z]/g, '')}-${leads.length + 1}.fr`,
          ville,
          codePostal: cp,
          regionId,
          motif: motifs[Math.floor(rnd() * (motifs.length - 1))],
          transmisParId: auteurId,
          transmisLe: transmisLe.toISOString(),
          statut,
          fil,
        })
      }
    }
  }

  return { regions: REGIONS, membres: MEMBRES, leads }
}

/**
 * Reconstitue le fil complet d'un lead : la transmission, l'echange entre les
 * deux equipes, puis les changements de statut, dans l'ordre chronologique.
 *
 * Les evenements sont d'abord poses en decalages relatifs, puis ramenes dans
 * l'intervalle [transmission, aujourd'hui] : aucun lead de demonstration ne
 * porte de date future.
 */
function construireFil(
  origine: Organisation,
  statut: Statut,
  transmisLe: Date,
  auteurId: string,
  receveurId: string,
  index: number,
  rnd: () => number,
  reference: Date,
): Evenement[] {
  type Brouillon = Omit<Evenement, 'id' | 'date'> & { decalage: number }
  const etapes: Brouillon[] = [
    { decalage: 0, type: 'statut', statut: 'transmis', auteurId },
  ]
  let decalage = 0

  // Le message d'accompagnement de celui qui transmet.
  const echanges = CONVERSATIONS[origine]
  const [presentation, reponse] = echanges[Math.floor(rnd() * echanges.length)]
  decalage += 60000
  etapes.push({ decalage, type: 'message', texte: presentation, auteurId })

  if (statut !== 'transmis') {
    // La reponse de celui qui prend le lead en charge.
    decalage += (2 + Math.floor(rnd() * 40)) * 3600000
    etapes.push({ decalage, type: 'message', texte: reponse, auteurId: receveurId })

    const parcours: Statut[] =
      statut === 'sans_suite'
        ? ['contacte', 'sans_suite']
        : statut === 'contacte'
          ? ['contacte']
          : statut === 'rdv'
            ? ['contacte', 'rdv']
            : ['contacte', 'rdv', 'converti']

    for (const [i, etape] of parcours.entries()) {
      decalage += (1 + Math.floor(rnd() * 8)) * 86400000
      etapes.push({ decalage, type: 'statut', statut: etape, auteurId: receveurId })
      // Une relance de temps en temps, comme dans un usage reel.
      if (i === 0 && rnd() > 0.5) {
        decalage += 7200000
        etapes.push({
          decalage,
          type: 'message',
          texte: RELANCES[Math.floor(rnd() * RELANCES.length)],
          auteurId: receveurId,
        })
      }
    }
  }

  // Compression si le parcours deborde sur le futur. La cible est tiree au
  // hasard pour que les leads compresses ne se retrouvent pas tous dates
  // d'aujourd'hui.
  const disponible = Math.max(3600000, +reference - +transmisLe)
  const cible = disponible * (0.3 + rnd() * 0.6)
  const facteur = decalage > cible ? cible / decalage : 1

  return etapes.map((e, i) => {
    const { decalage: d, ...reste } = e
    return {
      ...reste,
      id: `e${index}-${i}`,
      date: new Date(+transmisLe + Math.round(d * facteur)).toISOString(),
    }
  })
}
