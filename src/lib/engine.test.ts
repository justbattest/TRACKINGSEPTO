import { describe, expect, it } from 'vitest'
import { cascade, echeancier, estActif, licencesActives, mrr, simuler, total } from './engine'
import { REGLAGES_DEFAUT, type Contrat } from './types'

const contrat = (p: Partial<Contrat> = {}): Contrat => ({
  id: 'c1',
  leadId: 'l1',
  plan: 'annuel',
  licences: 1,
  prixCatalogue: 179,
  tauxRemise: 0.1,
  tauxCommission: 0.15,
  moisEngagement: 12,
  debutLe: '2026-01-15T00:00:00.000Z',
  churnLe: null,
  ...p,
})

describe('cascade de prix', () => {
  it('applique -10% puis 15% sur un annuel', () => {
    const c = cascade(contrat())
    expect(c.prixPaye).toBe(161.1)
    expect(c.commission).toBe(24.17)
    expect(c.netAlyxa).toBe(136.93)
    expect(c.moisCommissionnes).toBe(12)
  })

  it('applique -10% puis 15% sur un mensuel', () => {
    const c = cascade(contrat({ plan: 'mensuel', prixCatalogue: 224, moisEngagement: 1 }))
    expect(c.prixPaye).toBe(201.6)
    expect(c.commission).toBe(30.24)
    expect(c.netAlyxa).toBe(171.36)
    expect(c.moisCommissionnes).toBe(1)
  })

  it('plafonne la duree commissionnee a 12 mois meme sur un engagement plus long', () => {
    expect(cascade(contrat({ moisEngagement: 24 })).moisCommissionnes).toBe(12)
  })

  it('chiffre le cout d acquisition total sur la duree commissionnee', () => {
    const c = cascade(contrat())
    expect(c.revenuTotal).toBe(1933.2)
    expect(c.coutTotal).toBe(504.84) // 12 x (17.90 de remise + 24.17 de commission)
  })
})

describe('vente au poste', () => {
  it('multiplie toute la cascade par le nombre de licences', () => {
    const c = cascade(contrat({ licences: 3 }))
    expect(c.licences).toBe(3)
    expect(c.prixUnitaire).toBe(179)
    expect(c.prixCatalogue).toBe(537)
    expect(c.remise).toBe(53.7)
    expect(c.prixPaye).toBe(483.3)
    expect(c.commission).toBe(72.5)
    expect(c.netAlyxa).toBe(410.8)
  })

  it('arrondit sur le total du contrat, pas licence par licence', () => {
    // 3 x 24,17 donnerait 72,51 ; le cabinet paie 483,30 dont 15 % = 72,50.
    expect(cascade(contrat({ licences: 3 })).commission).toBe(72.5)
  })

  it('applique la meme regle au mensuel', () => {
    const c = cascade(contrat({ plan: 'mensuel', prixCatalogue: 224, moisEngagement: 1, licences: 3 }))
    expect(c.prixPaye).toBe(604.8)
    expect(c.commission).toBe(90.72)
    expect(c.netAlyxa).toBe(514.08)
  })

  it('commissionne chaque licence sur toute la duree', () => {
    const lignes = echeancier(contrat({ licences: 3 }), 'com1', REGLAGES_DEFAUT, [], new Date('2026-06-20T00:00:00.000Z'))
    expect(lignes).toHaveLength(12)
    expect(total(lignes, ['a_payer', 'prevue'])).toBe(870)
  })

  it('traite un contrat sans licence renseignee comme un poste unique', () => {
    expect(cascade(contrat({ licences: 0 })).prixPaye).toBe(161.1)
  })

  it('compte les licences actives, hors contrats resilies', () => {
    const maintenant = new Date('2026-06-20T00:00:00.000Z')
    expect(
      licencesActives(
        [
          contrat({ id: 'a', licences: 3 }),
          contrat({ id: 'b', licences: 2 }),
          contrat({ id: 'c', licences: 4, churnLe: '2026-03-01T00:00:00.000Z' }),
        ],
        maintenant,
      ),
    ).toBe(5)
  })
})

describe('echeancier de commissions', () => {
  const maintenant = new Date('2026-06-20T00:00:00.000Z')

  it('genere 12 echeances mensuelles pour un annuel', () => {
    const lignes = echeancier(contrat(), 'com1', REGLAGES_DEFAUT, [], maintenant)
    expect(lignes).toHaveLength(12)
    expect(lignes[0].periode).toBe('2026-01')
    expect(lignes[11].periode).toBe('2026-12')
    expect(total(lignes, ['a_payer', 'prevue'])).toBe(290.04)
  })

  it('genere une seule echeance pour un mensuel', () => {
    const lignes = echeancier(
      contrat({ plan: 'mensuel', prixCatalogue: 224, moisEngagement: 1 }),
      'com1',
      REGLAGES_DEFAUT,
      [],
      maintenant,
    )
    expect(lignes).toHaveLength(1)
    expect(lignes[0].montant).toBe(30.24)
  })

  it('distingue les echeances echues des echeances a venir', () => {
    const lignes = echeancier(contrat(), 'com1', REGLAGES_DEFAUT, [], maintenant)
    expect(lignes.filter((l) => l.statut === 'a_payer')).toHaveLength(6) // janv a juin
    expect(lignes.filter((l) => l.statut === 'prevue')).toHaveLength(6) // juil a dec
  })

  it('annule les echeances posterieures a la resiliation', () => {
    const lignes = echeancier(
      contrat({ churnLe: '2026-04-10T00:00:00.000Z' }),
      'com1',
      REGLAGES_DEFAUT,
      [],
      maintenant,
    )
    // Janvier a mars sont dus, avril et au-dela sont annules.
    expect(lignes.filter((l) => l.statut === 'a_payer')).toHaveLength(3)
    expect(lignes.filter((l) => l.statut === 'annulee')).toHaveLength(9)
    expect(total(lignes, ['annulee'])).toBe(217.53)
  })

  it('ne remet jamais en cause une echeance deja payee', () => {
    const deja = [
      {
        id: 'x',
        contratId: 'c1',
        commercialId: 'com1',
        periode: '2026-05',
        montant: 24.17,
        statut: 'payee' as const,
        payeeLe: '2026-06-01T00:00:00.000Z',
      },
    ]
    const lignes = echeancier(
      contrat({ churnLe: '2026-04-10T00:00:00.000Z' }),
      'com1',
      REGLAGES_DEFAUT,
      deja,
      maintenant,
    )
    expect(lignes.find((l) => l.periode === '2026-05')?.statut).toBe('payee')
  })

  it('gere le debordement de fin de mois (31 janvier -> 28 fevrier)', () => {
    const lignes = echeancier(
      contrat({ debutLe: '2026-01-31T00:00:00.000Z' }),
      'com1',
      REGLAGES_DEFAUT,
      [],
      maintenant,
    )
    expect(lignes.map((l) => l.periode).slice(0, 3)).toEqual(['2026-01', '2026-02', '2026-03'])
  })
})

describe('agregats', () => {
  const maintenant = new Date('2026-06-20T00:00:00.000Z')

  it('exclut les contrats resilies du MRR', () => {
    const actif = contrat({ id: 'a' })
    const resilie = contrat({ id: 'b', churnLe: '2026-03-01T00:00:00.000Z' })
    expect(mrr([actif, resilie], maintenant)).toBe(161.1)
  })

  it('additionne les licences dans le MRR', () => {
    expect(mrr([contrat({ id: 'a', licences: 3 })], maintenant)).toBe(483.3)
  })

  it('exclut les contrats a venir du MRR', () => {
    expect(mrr([contrat({ debutLe: '2026-09-01T00:00:00.000Z' })], maintenant)).toBe(0)
    expect(estActif(contrat({ debutLe: '2026-09-01T00:00:00.000Z' }), maintenant)).toBe(false)
  })
})

describe('simulateur', () => {
  it('reprend la grille tarifaire Alyxa par defaut', () => {
    expect(simuler('annuel').prixPaye).toBe(161.1)
    expect(simuler('mensuel').prixPaye).toBe(201.6)
  })

  it('simule un cabinet a plusieurs postes', () => {
    expect(simuler('annuel', 3).prixPaye).toBe(483.3)
    expect(simuler('mensuel', 2).commission).toBe(60.48)
  })
})
