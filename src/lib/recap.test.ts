import { describe, expect, it } from 'vitest'
import { pointHebdo } from './recap'
import type { Lead, Organisation, Statut } from './types'

const MAINTENANT = new Date('2026-09-14T12:00:00.000Z')
const jours = (n: number) => new Date(+MAINTENANT - n * 86400000).toISOString()

/** Un lead dont le fil s'arrete au dernier changement de statut. */
function lead(
  id: string,
  origine: Organisation,
  statut: Statut,
  transmisIlYa: number,
  dernierMouvementIlYa = transmisIlYa,
): Lead {
  return {
    id,
    origine,
    structure: `Cabinet ${id}`,
    contact: `Dr ${id}`,
    telephone: '',
    email: '',
    ville: '',
    codePostal: '',
    regionId: 'paca',
    motif: 'Autre',
    apporteParId: 'm1',
    transmisParId: 'm1',
    transmisLe: jours(transmisIlYa),
    statut,
    fil: [
      { id: `${id}-0`, date: jours(transmisIlYa), type: 'statut', statut: 'transmis', auteurId: 'm1' },
      ...(statut !== 'transmis'
        ? [{ id: `${id}-1`, date: jours(dernierMouvementIlYa), type: 'statut' as const, statut, auteurId: 'm1' }]
        : []),
    ],
  }
}

describe('point de la semaine', () => {
  it('compte ce qui a circulé sur les sept derniers jours', () => {
    const leads = [
      lead('a', 'alyxa', 'transmis', 2),
      lead('b', 'alyxa', 'contacte', 5, 1),
      lead('c', 'septodont', 'transmis', 3),
      // Hors fenêtre : transmis il y a plus d'une semaine.
      lead('d', 'alyxa', 'converti', 40, 30),
      lead('e', 'septodont', 'converti', 60, 50),
    ]
    const point = pointHebdo(leads, 'alyxa', MAINTENANT)
    expect(point.semaineEnvoyes).toBe(2)
    expect(point.semaineRecus).toBe(1)
  })

  it('s’écrit du point de vue de celui qui lit', () => {
    const leads = [lead('a', 'alyxa', 'transmis', 1), lead('b', 'septodont', 'transmis', 1)]

    const cotéAlyxa = pointHebdo(leads, 'alyxa', MAINTENANT).texte
    expect(cotéAlyxa).toContain('1 lead envoyé à Septodont')
    expect(cotéAlyxa).toContain('1 lead reçu de Septodont')

    // Le même lead, lu de l'autre bout : les deux sens s'inversent.
    const cotéSepto = pointHebdo(leads, 'septodont', MAINTENANT).texte
    expect(cotéSepto).toContain('1 lead envoyé à Alyxa')
    expect(cotéSepto).toContain('1 lead reçu d’Alyxa')
  })

  it('dit qui envoie le plus, et le dit dans les deux sens', () => {
    const leads = [
      lead('a', 'alyxa', 'transmis', 1),
      lead('b', 'alyxa', 'transmis', 1),
      lead('c', 'alyxa', 'transmis', 1),
      lead('d', 'septodont', 'transmis', 1),
    ]
    expect(pointHebdo(leads, 'alyxa', MAINTENANT).texte).toContain('Alyxa en envoie 2 de plus')
    expect(pointHebdo(leads, 'septodont', MAINTENANT).texte).toContain('Alyxa en envoie 2 de plus')
  })

  it('signale l’équilibre quand il y est', () => {
    const leads = [lead('a', 'alyxa', 'transmis', 1), lead('b', 'septodont', 'transmis', 1)]
    expect(pointHebdo(leads, 'alyxa', MAINTENANT).texte).toContain('à l’équilibre')
  })

  it('distingue ce qu’on doit traiter de ce qu’ils doivent traiter', () => {
    const leads = [
      lead('a', 'alyxa', 'transmis', 2), // chez eux
      lead('b', 'alyxa', 'transmis', 3), // chez eux
      lead('c', 'septodont', 'transmis', 1), // chez nous
    ]
    const texte = pointHebdo(leads, 'alyxa', MAINTENANT).texte
    expect(texte).toContain('1 lead reçu qu’on n’a pas encore pris en charge')
    expect(texte).toContain('2 leads en attente chez Septodont')
  })

  it('compte comme dormant ce qui n’a pas bougé depuis plus d’une semaine', () => {
    const leads = [
      lead('a', 'alyxa', 'contacte', 30, 20), // dormant
      lead('b', 'alyxa', 'contacte', 30, 2), // relancé il y a 2 jours
      lead('c', 'alyxa', 'converti', 60, 50), // clos : jamais dormant
      lead('d', 'septodont', 'sans_suite', 60, 50), // clos aussi
    ]
    expect(pointHebdo(leads, 'alyxa', MAINTENANT).texte).toContain(
      '1 lead sans mouvement depuis plus de 7 jours',
    )
  })

  it('n’affiche pas la rubrique « À traiter » quand il n’y a rien à traiter', () => {
    const leads = [lead('a', 'alyxa', 'converti', 3, 1), lead('b', 'septodont', 'converti', 3, 1)]
    expect(pointHebdo(leads, 'alyxa', MAINTENANT).texte).not.toContain('À traiter')
  })

  it('tient debout sur une base vide', () => {
    const texte = pointHebdo([], 'alyxa', MAINTENANT).texte
    expect(texte).toContain('0 lead envoyé à Septodont')
    expect(texte).toContain('0 envoyés · 0 reçus')
    expect(texte).not.toContain('À traiter')
    expect(texte).toContain('https://septotracking.netlify.app')
  })

  it('reste assez court pour un message', () => {
    const leads = Array.from({ length: 200 }, (_, i) =>
      lead(`l${i}`, i % 2 ? 'alyxa' : 'septodont', 'transmis', i % 30),
    )
    const texte = pointHebdo(leads, 'alyxa', MAINTENANT).texte
    expect(texte.split('\n').length).toBeLessThan(18)
    expect(texte.length).toBeLessThan(600)
  })
})
