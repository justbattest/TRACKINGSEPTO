import { describe, expect, it } from 'vitest'
import { bilan, delaiPriseEnCharge, entonnoir, equilibre, leadsDormants, leadsNonLus, repartir, serieMensuelle } from './stats'
import type { Lead, Sens, Statut } from './types'

const MAINTENANT = new Date('2026-09-09T12:00:00.000Z')
const jours = (n: number) => new Date(+MAINTENANT - n * 86400000).toISOString()

/** Construit un lead dont le journal reflete le parcours jusqu'au statut vise. */
function lead(
  id: string,
  sens: Sens,
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
    sens,
    structure: `Cabinet ${id}`,
    contact: 'Dr Test',
    telephone: '',
    email: '',
    ville: 'Toulon',
    codePostal: '83000',
    regionId: options.region ?? 'paca',
    motif: options.motif ?? 'Division chirurgie',
    transmisParId: 'm1',
    transmisLe,
    statut,
    fil,
  }
}

describe('equilibre de l echange', () => {
  it('compte les deux sens et mesure l ecart', () => {
    const e = equilibre([
      lead('a', 'envoye', 'transmis', 10),
      lead('b', 'envoye', 'transmis', 9),
      lead('c', 'recu', 'transmis', 8),
    ])
    expect(e.envoyes).toBe(2)
    expect(e.recus).toBe(1)
    expect(e.ecart).toBe(1)
    expect(e.partEnvoyee).toBeCloseTo(2 / 3)
  })

  it('reste neutre quand aucun lead n a circule', () => {
    expect(equilibre([]).partEnvoyee).toBe(0.5)
    expect(equilibre([]).ecart).toBe(0)
  })
})

describe('bilan par sens', () => {
  const leads = [
    lead('a', 'recu', 'converti', 40),
    lead('b', 'recu', 'contacte', 20),
    lead('c', 'recu', 'transmis', 3),
    lead('d', 'recu', 'sans_suite', 60),
    lead('e', 'envoye', 'converti', 30),
  ]

  it('ne compte que le sens demande', () => {
    expect(bilan(leads, 'recu', MAINTENANT).total).toBe(4)
    expect(bilan(leads, 'envoye', MAINTENANT).total).toBe(1)
  })

  it('calcule le taux de conversion sur le sens', () => {
    expect(bilan(leads, 'recu', MAINTENANT).convertis).toBe(1)
    expect(bilan(leads, 'recu', MAINTENANT).tauxConversion).toBeCloseTo(0.25)
  })

  it('distingue en attente, en cours et sans suite', () => {
    const b = bilan(leads, 'recu', MAINTENANT)
    expect(b.enAttente).toBe(1) // seul le lead encore au statut « transmis »
    expect(b.enCours).toBe(2) // transmis + contacte
    expect(b.sansSuite).toBe(1)
  })

  it('mesure le delai median de prise en charge', () => {
    const b = bilan(
      [
        lead('a', 'recu', 'contacte', 30, { contacteApres: 1 }),
        lead('b', 'recu', 'contacte', 30, { contacteApres: 5 }),
        lead('c', 'recu', 'contacte', 30, { contacteApres: 9 }),
      ],
      'recu',
      MAINTENANT,
    )
    expect(b.delaiMedianContact).toBe(5)
  })

  it('ne renvoie pas de delai quand rien n a ete pris en charge', () => {
    expect(bilan([lead('a', 'recu', 'transmis', 3)], 'recu', MAINTENANT).delaiMedianContact).toBeNull()
    expect(delaiPriseEnCharge(lead('a', 'recu', 'transmis', 3))).toBeNull()
  })

  it('separe le mois en cours du mois precedent', () => {
    // 2 jours avant le 9 septembre => septembre ; 35 jours avant => 5 août.
    const b = bilan([lead('a', 'recu', 'transmis', 2), lead('b', 'recu', 'transmis', 35)], 'recu', MAINTENANT)
    expect(b.ceMois).toBe(1)
    expect(b.moisPrecedent).toBe(1)
  })
})

describe('entonnoir', () => {
  it('est cumulatif : un converti compte a chaque etape franchie', () => {
    const e = entonnoir([lead('a', 'recu', 'converti', 20), lead('b', 'recu', 'transmis', 5)])
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
        lead('vieux', 'recu', 'transmis', 30),
        lead('recent', 'recu', 'transmis', 2),
        lead('clos', 'recu', 'converti', 40),
      ],
      7,
      MAINTENANT,
    )
    expect(dormants.map((l) => l.id)).toEqual(['vieux'])
  })

  it('remonte les plus anciens en premier', () => {
    const dormants = leadsDormants(
      [lead('a', 'recu', 'transmis', 10), lead('b', 'recu', 'transmis', 40)],
      7,
      MAINTENANT,
    )
    expect(dormants.map((l) => l.id)).toEqual(['b', 'a'])
  })
})

describe('messages non lus', () => {
  const avecMessage = (id: string, auteurId: string, ilYa: number): Lead => {
    const base = lead(id, 'recu', 'contacte', ilYa)
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
        lead('a', 'envoye', 'converti', 10, { motif: 'Implantologie' }),
        lead('b', 'envoye', 'transmis', 10, { motif: 'Implantologie' }),
        lead('c', 'envoye', 'transmis', 10, { motif: 'Anesthésie' }),
      ],
      (l) => l.motif,
    )
    expect(r[0]).toEqual({ cle: 'Implantologie', total: 2, convertis: 1 })
  })

  it('couvre les derniers mois, du plus ancien au plus recent', () => {
    const serie = serieMensuelle([lead('a', 'envoye', 'transmis', 1)], 6, MAINTENANT)
    expect(serie).toHaveLength(6)
    expect(serie[5].periode).toBe('2026-09')
    expect(serie[5].envoyes).toBe(1)
    expect(serie[5].recus).toBe(0)
  })
})
