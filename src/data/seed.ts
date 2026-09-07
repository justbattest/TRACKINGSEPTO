/**
 * Jeu de donnees de demonstration.
 *
 * Genere de facon deterministe pour que l'app soit immediatement lisible et
 * que les captures d'ecran soient stables. Remplace par les vraies donnees des
 * que la base est branchee.
 */
import type { Commercial, Contrat, Etape, Lead, Region } from '@/lib/types'

export const REGIONS: Region[] = [
  { id: 'idf', nom: 'Île-de-France' },
  { id: 'paca', nom: 'PACA' },
  { id: 'ara', nom: 'Auvergne-Rhône-Alpes' },
  { id: 'occ', nom: 'Occitanie' },
  { id: 'na', nom: 'Nouvelle-Aquitaine' },
  { id: 'hdf', nom: 'Hauts-de-France' },
  { id: 'ge', nom: 'Grand Est' },
  { id: 'bzh', nom: 'Bretagne' },
]

export const COMMERCIAUX: Commercial[] = [
  { id: 'c1', nom: 'Julien Marchand', email: 'j.marchand@septodont.fr', regionId: 'idf', slug: 'julien-marchand', actif: true },
  { id: 'c2', nom: 'Sofia Benali', email: 's.benali@septodont.fr', regionId: 'paca', slug: 'sofia-benali', actif: true },
  { id: 'c3', nom: 'Thomas Perrin', email: 't.perrin@septodont.fr', regionId: 'ara', slug: 'thomas-perrin', actif: true },
  { id: 'c4', nom: 'Camille Duval', email: 'c.duval@septodont.fr', regionId: 'occ', slug: 'camille-duval', actif: true },
  { id: 'c5', nom: 'Nicolas Faure', email: 'n.faure@septodont.fr', regionId: 'na', slug: 'nicolas-faure', actif: true },
  { id: 'c6', nom: 'Léa Girard', email: 'l.girard@septodont.fr', regionId: 'hdf', slug: 'lea-girard', actif: true },
  { id: 'c7', nom: 'Antoine Roussel', email: 'a.roussel@septodont.fr', regionId: 'ge', slug: 'antoine-roussel', actif: true },
  { id: 'c8', nom: 'Marie Le Goff', email: 'm.legoff@septodont.fr', regionId: 'bzh', slug: 'marie-legoff', actif: true },
]

const VILLES: Record<string, [string, string][]> = {
  idf: [['Paris', '75011'], ['Boulogne-Billancourt', '92100'], ['Versailles', '78000'], ['Créteil', '94000'], ['Neuilly-sur-Seine', '92200']],
  paca: [['Marseille', '13008'], ['Nice', '06000'], ['Toulon', '83000'], ['Aix-en-Provence', '13100'], ['Cannes', '06400']],
  ara: [['Lyon', '69006'], ['Grenoble', '38000'], ['Annecy', '74000'], ['Saint-Étienne', '42000'], ['Chambéry', '73000']],
  occ: [['Toulouse', '31000'], ['Montpellier', '34000'], ['Nîmes', '30000'], ['Perpignan', '66000'], ['Albi', '81000']],
  na: [['Bordeaux', '33000'], ['La Rochelle', '17000'], ['Pau', '64000'], ['Limoges', '87000'], ['Angoulême', '16000']],
  hdf: [['Lille', '59000'], ['Amiens', '80000'], ['Roubaix', '59100'], ['Arras', '62000'], ['Dunkerque', '59140']],
  ge: [['Strasbourg', '67000'], ['Reims', '51100'], ['Metz', '57000'], ['Nancy', '54000'], ['Mulhouse', '68100']],
  bzh: [['Rennes', '35000'], ['Brest', '29200'], ['Quimper', '29000'], ['Vannes', '56000'], ['Lorient', '56100']],
}

const PRENOMS = ['Claire', 'Vincent', 'Nathalie', 'Olivier', 'Sandrine', 'Philippe', 'Émilie', 'Laurent', 'Céline', 'Guillaume', 'Aurélie', 'Sébastien', 'Delphine', 'Frédéric', 'Isabelle', 'Maxime']
const NOMS = ['Lambert', 'Moreau', 'Simon', 'Michel', 'Garcia', 'Robin', 'Blanc', 'Guerin', 'Muller', 'Henry', 'Roche', 'Colin', 'Vidal', 'Charpentier', 'Renard', 'Barbier']

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

/** Repartition realiste des leads dans l'entonnoir. */
const REPARTITION: [Etape, number][] = [
  ['nouveau', 0.14],
  ['contacte', 0.16],
  ['demo_planifiee', 0.12],
  ['demo_faite', 0.1],
  ['signe', 0.28],
  ['perdu', 0.2],
]

export interface JeuDeDonnees {
  regions: Region[]
  commerciaux: Commercial[]
  leads: Lead[]
  contrats: Contrat[]
}

export function genererDemo(reference: Date = new Date()): JeuDeDonnees {
  const rnd = alea(20260907)
  const leads: Lead[] = []
  const contrats: Contrat[] = []

  // 9 mois d'historique, avec un volume qui monte progressivement.
  for (let reculMois = 8; reculMois >= 0; reculMois--) {
    const volume = 4 + Math.round((8 - reculMois) * 1.6)
    for (let i = 0; i < volume; i++) {
      const com = COMMERCIAUX[Math.floor(rnd() * COMMERCIAUX.length)]
      const [ville, cp] = VILLES[com.regionId][Math.floor(rnd() * 5)]
      // Sur le mois en cours, on ne genere jamais de lead date dans le futur.
      const dernierJour = reculMois === 0 ? reference.getUTCDate() : 28
      const jour = 1 + Math.floor(rnd() * dernierJour)
      const recuLe = new Date(
        Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() - reculMois, jour),
      )

      // Les leads recents n'ont pas encore eu le temps d'avancer dans l'entonnoir.
      const tirage = rnd()
      let cumul = 0
      let etape: Etape = 'nouveau'
      for (const [e, part] of REPARTITION) {
        cumul += part
        if (tirage <= cumul) {
          etape = e
          break
        }
      }
      if (reculMois === 0 && (etape === 'signe' || etape === 'demo_faite')) etape = 'contacte'
      if (reculMois === 1 && etape === 'signe') etape = 'demo_faite'

      const id = `l${leads.length + 1}`
      const praticien = `Dr ${PRENOMS[Math.floor(rnd() * PRENOMS.length)]} ${NOMS[Math.floor(rnd() * NOMS.length)]}`
      const historique = construireHistorique(etape, recuLe, rnd)

      leads.push({
        id,
        cabinet: `Cabinet dentaire ${ville}${rnd() > 0.6 ? ' Centre' : ''}`,
        praticien,
        email: `contact@cabinet-${ville.toLowerCase().replace(/[^a-z]/g, '')}-${leads.length + 1}.fr`,
        telephone: `0${1 + Math.floor(rnd() * 5)} ${String(10 + Math.floor(rnd() * 89))} ${String(10 + Math.floor(rnd() * 89))} ${String(10 + Math.floor(rnd() * 89))} ${String(10 + Math.floor(rnd() * 89))}`,
        ville,
        codePostal: cp,
        regionId: com.regionId,
        commercialId: com.id,
        etape,
        recuLe: recuLe.toISOString(),
        historique,
      })

      if (etape === 'signe') {
        const signeLe = new Date(historique[historique.length - 1].date)
        const annuel = rnd() > 0.35
        // ~12% des contrats signes il y a plus de 3 mois ont churne.
        const ancien = reculMois >= 3
        const churn = ancien && rnd() > 0.88
        contrats.push({
          id: `k${contrats.length + 1}`,
          leadId: id,
          plan: annuel ? 'annuel' : 'mensuel',
          prixCatalogue: annuel ? 179 : 224,
          tauxRemise: 0.1,
          tauxCommission: 0.15,
          moisEngagement: annuel ? 12 : 1,
          debutLe: signeLe.toISOString(),
          churnLe: churn
            ? new Date(Date.UTC(signeLe.getUTCFullYear(), signeLe.getUTCMonth() + 3, 5)).toISOString()
            : null,
        })
      }
    }
  }

  return { regions: REGIONS, commerciaux: COMMERCIAUX, leads, contrats }
}

/** Reconstitue le parcours du lead jusqu'a son etape actuelle. */
function construireHistorique(etape: Etape, recuLe: Date, rnd: () => number) {
  const parcours: Etape[] = ['nouveau']
  const ordre: Etape[] = ['contacte', 'demo_planifiee', 'demo_faite', 'signe']
  if (etape === 'perdu') {
    parcours.push('contacte', 'perdu')
  } else if (etape !== 'nouveau') {
    for (const e of ordre) {
      parcours.push(e)
      if (e === etape) break
    }
  }
  let curseur = recuLe.getTime()
  return parcours.map((e, i) => {
    if (i > 0) curseur += (1 + Math.floor(rnd() * 9)) * 86400000
    return { date: new Date(curseur).toISOString(), etape: e, auteur: 'Système' }
  })
}
