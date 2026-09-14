import { describe, expect, it } from 'vitest'
import { bilan, delaiPriseEnCharge, entonnoir, equilibre, leadsDormants, leadsNonLus, repartir, serieMensuelle } from './stats'
import type { Lead, Organisation, Statut } from './types'

const MAINTENANT = new Date('2026-09-09T12:00:00.000Z')
const jours = (n: number) => new Date(+MAINTENANT - n * 86400000).toISOString()

/** Construit un lead dont le journal reflete le parcours jusqu'au statut vise. */
function lead(
  id: string,
  origine: Organisation,
  statut: Statut,
  transmisIlYa: number,
  options: { contacteApres?: number; motif?: string; region?: string } = {},
): Lead {
  const transmisLe = jours(transmisIlYa)
  const fil: Lead['fil'] = [
    { id: `${id}-0`, date: transmisLe, type: 'statut', statut: 'transmis', auteurId: 'm1' },
  ]
  if (statut !== 'transmis') {
    const delai = options.contacteApres ?? 2
    fil.push({
      id: `${id}-1`,
      date: jours(transmisIlYa - delai),
      type: 'statut',
      statut: 'contacte',
      auteurId: 'm1',
    })
    if (statut !== 'contacte') {
      fil.push({
        id: `${id}-2`,
        date: jours(transmisIlYa - delai - 1),
        type: 'statut',
        statut,
        auteurId: 'm1',
      })
    }
  }
  return {
    id,
    origine,
    structure: `Cabinet ${id}`,
    contact: 'Dr Test',
    telephone: '',
    email: '',
    ville: 'Toulon',
    codePostal: '83000',
    regionId: options.region ?? 'paca',
    motif: options.motif ?? 'Division chirurgie',
    apporteParId: `ap-${origine}`,
    transmisParId: 'm1',
    transmisLe,
    statut,
    fil,
  }
}

describe('equilibre de l echange', () => {
  it('compte les deux origines et mesure l ecart, depuis un point de vue', () => {
    const e = equilibre([
      lead('a', 'alyxa', 'transmis', 10),
      lead('b', 'alyxa', 'transmis', 9),
      lead('c', 'septodont', 'transmis', 8),
    ], 'alyxa')
    expect(e.envoyes).toBe(2)
    expect(e.recus).toBe(1)
    expect(e.ecart).toBe(1)
    expect(e.partEnvoyee).toBeCloseTo(2 / 3)
  })

  it('s inverse selon la maison qui regarde', () => {
    const base = [
      lead('a', 'alyxa', 'transmis', 10),
      lead('b', 'alyxa', 'transmis', 9),
      lead('c', 'septodont', 'transmis', 8),
    ]
    const vuAlyxa = equilibre(base, 'alyxa')
    const vuSeptodont = equilibre(base, 'septodont')
    expect(vuAlyxa.envoyes).toBe(vuSeptodont.recus)
    expect(vuAlyxa.recus).toBe(vuSeptodont.envoyes)
    expect(vuAlyxa.ecart).toBe(-vuSeptodont.ecart)
  })

  it('reste neutre quand aucun lead n a circule', () => {
    expect(equilibre([], 'alyxa').partEnvoyee).toBe(0.5)
    expect(equilibre([], 'alyxa').ecart).toBe(0)
  })
})

describe('bilan par origine', () => {
  const leads = [
    lead('a', 'septodont', 'converti', 40),
    lead('b', 'septodont', 'contacte', 20),
    lead('c', 'septodont', 'transmis', 3),
    lead('d', 'septodont', 'sans_suite', 60),
    lead('e', 'alyxa', 'converti', 30),
  ]

  it('ne compte que l origine demandee', () => {
    expect(bilan(leads, 'septodont', MAINTENANT).total).toBe(4)
    expect(bilan(leads, 'alyxa', MAINTENANT).total).toBe(1)
  })

  it('calcule le taux de conversion sur l origine', () => {
    expect(bilan(leads, 'septodont', MAINTENANT).convertis).toBe(1)
    expect(bilan(leads, 'septodont', MAINTENANT).tauxConversion).toBeCloseTo(0.25)
  })

  it('distingue en attente, en cours et sans suite', () => {
    const b = bilan(leads, 'septodont', MAINTENANT)
    expect(b.enAttente).toBe(1) // seul le lead encore au statut « transmis »
    expect(b.enCours).toBe(2) // transmis + contacte
    expect(b.sansSuite).toBe(1)
  })

  it('mesure le delai median de prise en charge', () => {
    const b = bilan(
      [
        lead('a', 'septodont', 'contacte', 30, { contacteApres: 1 }),
        lead('b', 'septodont', 'contacte', 30, { contacteApres: 5 }),
        lead('c', 'septodont', 'contacte', 30, { contacteApres: 9 }),
      ],
      'septodont',
      MAINTENANT,
    )
    expect(b.delaiMedianContact).toBe(5)
  })

  it('ne renvoie pas de delai quand rien n a ete pris en charge', () => {
    expect(bilan([lead('a', 'septodont', 'transmis', 3)], 'septodont', MAINTENANT).delaiMedianContact).toBeNull()
    expect(delaiPriseEnCharge(lead('a', 'septodont', 'transmis', 3))).toBeNull()
  })

  it('separe le mois en cours du mois precedent', () => {
    // 2 jours avant le 9 septembre => septembre ; 35 jours avant => 5 août.
    const b = bilan([lead('a', 'septodont', 'transmis', 2), lead('b', 'septodont', 'transmis', 35)], 'septodont', MAINTENANT)
    expect(b.ceMois).toBe(1)
    expect(b.moisPrecedent).toBe(1)
  })
})

describe('entonnoir', () => {
  it('est cumulatif : un converti compte a chaque etape franchie', () => {
    const e = entonnoir([lead('a', 'septodont', 'converti', 20), lead('b', 'septodont', 'transmis', 5)])
    expect(e.find((x) => x.statut === 'transmis')?.atteint).toBe(2)
    expect(e.find((x) => x.statut === 'contacte')?.atteint).toBe(1)
    expect(e.find((x) => x.statut === 'converti')?.atteint).toBe(1)
    expect(e.find((x) => x.statut === 'converti')?.taux).toBeCloseTo(0.5)
  })
})

describe('leads dormants', () => {
  it('ne retient que les leads ouverts et immobiles', () => {
    const dormants = leadsDormants(
      [
        lead('vieux', 'septodont', 'transmis', 30),
        lead('recent', 'septodont', 'transmis', 2),
        lead('clos', 'septodont', 'converti', 40),
      ],
      7,
      MAINTENANT,
    )
    expect(dormants.map((l) => l.id)).toEqual(['vieux'])
  })

  it('remonte les plus anciens en premier', () => {
    const dormants = leadsDormants(
      [lead('a', 'septodont', 'transmis', 10), lead('b', 'septodont', 'transmis', 40)],
      7,
      MAINTENANT,
    )
    expect(dormants.map((l) => l.id)).toEqual(['b', 'a'])
  })
})

describe('messages non lus', () => {
  const avecMessage = (id: string, auteurId: string, ilYa: number): Lead => {
    const base = lead(id, 'septodont', 'contacte', ilYa)
    return {
      ...base,
      fil: [...base.fil, { id: `${id}-msg`, date: jours(ilYa - 1), type: 'message', texte: 'Coucou', auteurId }],
    }
  }

  it('ignore ses propres messages', () => {
    expect(leadsNonLus([avecMessage('a', 'moi', 5)], {}, 'moi')).toHaveLength(0)
  })

  it('compte les messages des autres jamais lus', () => {
    const r = leadsNonLus([avecMessage('a', 'autre', 5)], {}, 'moi')
    expect(r).toHaveLength(1)
    expect(r[0].nonLus).toBe(1)
  })

  it('ne compte plus un message anterieur a la derniere lecture', () => {
    const l = avecMessage('a', 'autre', 5)
    expect(leadsNonLus([l], { a: jours(0) }, 'moi')).toHaveLength(0)
  })
})

describe('repartition et serie mensuelle', () => {
  it('regroupe par motif et compte les convertis', () => {
    const r = repartir(
      [
        lead('a', 'alyxa', 'converti', 10, { motif: 'Implantologie' }),
        lead('b', 'alyxa', 'transmis', 10, { motif: 'Implantologie' }),
        lead('c', 'alyxa', 'transmis', 10, { motif: 'Anesthésie' }),
      ],
      (l) => l.motif,
    )
    expect(r[0]).toEqual({ cle: 'Implantologie', total: 2, convertis: 1 })
  })

  it('couvre les derniers mois, du plus ancien au plus recent', () => {
    const serie = serieMensuelle([lead('a', 'alyxa', 'transmis', 1)], 'alyxa', 6, MAINTENANT)
    expect(serie).toHaveLength(6)
    expect(serie[5].periode).toBe('2026-09')
    expect(serie[5].envoyes).toBe(1)
    expect(serie[5].recus).toBe(0)
  })
})
