import { describe, expect, it } from 'vitest'
import {
  chercherDoublons,
  chiffres,
  differences,
  normaliser,
  noyau,
  resumerDifferences,
  similarite,
  similariteNoms,
  texteNet,
  type ChampsFiche,
} from './fiche'
import type { Lead } from './types'

const CHAMPS: ChampsFiche = {
  structure: 'Cabinet dentaire de la Bornière',
  contact: 'Dr Mechali',
  telephone: '06 12 34 56 78',
  email: 'contact@borniere.fr',
  ville: 'Toulon',
  codePostal: '83000',
  regionId: 'paca',
  motif: 'Démo demandée',
  apporteParId: 'm1',
}

function lead(id: string, champs: Partial<ChampsFiche> = {}): Lead {
  const f = { ...CHAMPS, ...champs }
  return {
    id,
    origine: 'septodont',
    structure: f.structure,
    contact: f.contact,
    telephone: f.telephone,
    email: f.email,
    ville: f.ville,
    codePostal: f.codePostal,
    regionId: f.regionId,
    motif: f.motif,
    apporteParId: f.apporteParId,
    transmisParId: 'm2',
    transmisLe: '2026-09-01T09:00:00.000Z',
    statut: 'transmis',
    fil: [],
  }
}

describe('nettoyage', () => {
  it('supprime les espaces de bout et reduit les espaces internes', () => {
    expect(texteNet('  Dr Grassot   Cyril ')).toBe('Dr Grassot Cyril')
  })

  it('ne touche pas a la casse des noms propres', () => {
    expect(texteNet('Cabinet DE LA Bornière')).toBe('Cabinet DE LA Bornière')
  })

  it('range l’email en minuscules et retire les espaces du code postal', () => {
    const net = normaliser({ ...CHAMPS, email: ' Contact@Borniere.FR ', codePostal: '83 000' })
    expect(net.email).toBe('contact@borniere.fr')
    expect(net.codePostal).toBe('83000')
  })

  it('nettoie les vraies donnees observees en base', () => {
    expect(texteNet('Guillaume marcil ')).toBe('Guillaume marcil')
    expect(texteNet('Dr Grassot Cyril ')).toBe('Dr Grassot Cyril')
  })
})

describe('differences', () => {
  it('ne retient que les champs qui ont bouge', () => {
    const diffs = differences(CHAMPS, { ...CHAMPS, contact: 'Dr Grassot' })
    expect(diffs).toHaveLength(1)
    expect(diffs[0]).toMatchObject({ champ: 'contact', avant: 'Dr Mechali', apres: 'Dr Grassot' })
  })

  it('rend les identifiants lisibles', () => {
    const noms: Record<string, string> = { paca: 'PACA', idf: 'Île-de-France' }
    const diffs = differences({ ...CHAMPS }, { ...CHAMPS, regionId: 'idf' }, (_, v) => noms[v] ?? v)
    expect(diffs[0]).toMatchObject({ libelle: 'Région', avant: 'PACA', apres: 'Île-de-France' })
  })

  it('resume plusieurs corrections, une par ligne', () => {
    const diffs = differences(CHAMPS, { ...CHAMPS, contact: 'Dr Grassot', ville: 'Hyères' })
    expect(resumerDifferences(diffs)).toBe(
      'Praticien : Dr Mechali → Dr Grassot\nVille : Toulon → Hyères',
    )
  })

  it('marque d’un tiret un champ qu’on vient de renseigner', () => {
    const diffs = differences({ ...CHAMPS, telephone: '' }, CHAMPS)
    expect(resumerDifferences(diffs)).toBe('Téléphone : — → 06 12 34 56 78')
  })

  it('ne voit rien quand rien ne change', () => {
    expect(differences(CHAMPS, { ...CHAMPS })).toEqual([])
  })
})

describe('similarite', () => {
  it('rapproche une faute de frappe', () => {
    expect(similarite('Dr Gassot', 'Dr Grassot')).toBeGreaterThan(0.7)
  })

  it('ignore accents, casse et ponctuation', () => {
    expect(similarite('Cabinet de la Bornière', 'cabinet de la borniere')).toBe(1)
    expect(similarite('Dr. Jean-Luc Mechali', 'Dr Jean Luc Mechali')).toBe(1)
  })

  it('separe deux cabinets sans rapport', () => {
    expect(similarite('Cabinet du Port', 'Clinique Saint-Roch')).toBeLessThan(0.3)
  })

  it('vaut zero face a un champ vide', () => {
    expect(similarite('', 'Cabinet du Port')).toBe(0)
  })
})

describe('ce qui distingue vraiment deux libelles', () => {
  it('ecarte les mots que portent tous les cabinets', () => {
    expect(noyau('Cabinet dentaire de la Bornière')).toBe('borniere')
    expect(noyau('Dr Nathalie Renard')).toBe('nathalie renard')
    expect(noyau('Centre dentaire du Mourillon')).toBe('mourillon')
  })

  it('garde le libelle entier quand il n’est fait que de mots banals', () => {
    expect(noyau('Cabinet dentaire')).toBe('cabinet dentaire')
  })

  it('separe deux villes que le prefixe commun rapprochait a tort', () => {
    // Sur les libelles bruts, « Cabinet dentaire » pese si lourd que Nîmes et
    // Perpignan depassaient le seuil. C'etait le faux positif a corriger.
    expect(similarite('Cabinet dentaire Nîmes', 'Cabinet dentaire Perpignan')).toBeGreaterThan(0.6)
    expect(similariteNoms('Cabinet dentaire Nîmes', 'Cabinet dentaire Perpignan')).toBeLessThan(0.2)
    expect(similariteNoms('Cabinet dentaire Nîmes', 'Cabinet dentaire Nancy')).toBeLessThan(0.4)
  })

  it('rapproche toujours ce qui doit l’etre', () => {
    expect(similariteNoms('Cabinet dentaire de la Bornière', 'Cabinet dentaire de la Borniere')).toBe(1)
    expect(similariteNoms('Cabinet du Vieux-Port', 'Cabinet du Vieux Port')).toBe(1)
    expect(similariteNoms('Dr Gassot', 'Dr Grassot')).toBeGreaterThan(0.6)
  })
})

describe('numeros de telephone', () => {
  it('ramene les ecritures francaises a la meme forme', () => {
    expect(chiffres('06 12 34 56 78')).toBe('612345678')
    expect(chiffres('+33 6 12 34 56 78')).toBe('612345678')
    expect(chiffres('0033612345678')).toBe('612345678')
    expect(chiffres('06.12.34.56.78')).toBe('612345678')
  })
})

describe('recherche de doublons', () => {
  it('ne signale rien sur une base vide', () => {
    expect(chercherDoublons([], CHAMPS)).toEqual([])
  })

  it('reconnait un numero identique meme si les noms different', () => {
    const base = [lead('l1', { structure: 'Centre dentaire du Mourillon', contact: 'Dr M.' })]
    const [d] = chercherDoublons(base, CHAMPS)
    expect(d.lead.id).toBe('l1')
    expect(d.certain).toBe(true)
    expect(d.raison).toBe('Même numéro de téléphone')
  })

  it('reconnait une adresse email identique', () => {
    const base = [lead('l1', { structure: 'Autre cabinet', contact: 'Dr X', telephone: '' })]
    const [d] = chercherDoublons(base, { ...CHAMPS, telephone: '' })
    expect(d).toMatchObject({ certain: true, raison: 'Même adresse email' })
  })

  it('rattrape la faute de frappe sur le praticien', () => {
    const base = [lead('l1', { contact: 'Dr Gassot Cyril', telephone: '', email: '' })]
    const [d] = chercherDoublons(base, {
      ...CHAMPS,
      contact: 'Dr Grassot Cyril',
      telephone: '',
      email: '',
    })
    expect(d?.lead.id).toBe('l1')
    expect(d.raison).toBe('Même structure et même praticien')
    expect(d.certain).toBe(false)
  })

  it('se tait sur deux confreres du meme cabinet qui partagent un prenom', () => {
    // « Nathalie Robin » et « Nathalie Renard » sont deux personnes. Preferer
    // le silence au doute : une alerte de trop apprend a cliquer sans lire.
    const base = [lead('l1', { contact: 'Dr Nathalie Robin', telephone: '', email: '' })]
    expect(
      chercherDoublons(base, { ...CHAMPS, contact: 'Dr Nathalie Renard', telephone: '', email: '' }),
    ).toEqual([])
  })

  it('ne dit rien de deux praticiens differents du meme cabinet', () => {
    const base = [lead('l1', { contact: 'Dr Mechali', telephone: '', email: '' })]
    const trouves = chercherDoublons(base, {
      structure: 'Cabinet dentaire de la Bornière',
      contact: 'Dr Sabatier',
      telephone: '',
      email: '',
    })
    // Alyxa vend par poste : un meme cabinet qui revient avec un autre
    // praticien est un lead legitime. Alerter la-dessus noierait les vrais cas.
    expect(trouves).toEqual([])
  })

  it('ignore la fiche qu’on est en train de corriger', () => {
    const base = [lead('l1')]
    expect(chercherDoublons(base, CHAMPS, 'l1')).toEqual([])
  })

  it('met la certitude en premier et n’en propose jamais plus de trois', () => {
    const base = [
      lead('a', { telephone: '', email: '' }),
      lead('b', { telephone: '', email: '' }),
      lead('c', { telephone: '', email: '' }),
      lead('d', { telephone: '', email: 'contact@borniere.fr' }),
      lead('e', { telephone: '', email: '' }),
    ]
    const trouves = chercherDoublons(base, { ...CHAMPS, telephone: '' })
    expect(trouves).toHaveLength(3)
    expect(trouves[0].lead.id).toBe('d')
    expect(trouves[0].certain).toBe(true)
  })

  it('ne confond pas deux praticiens d’un meme cabinet au nom voisin', () => {
    const base = [lead('l1', { contact: 'Dr Isabelle Vidal', telephone: '', email: '' })]
    expect(
      chercherDoublons(base, { ...CHAMPS, contact: 'Dr Claire Vidal', telephone: '', email: '' }),
    ).toEqual([])
  })

  it('signale le meme praticien retrouve sous une autre structure', () => {
    const base = [
      lead('l1', { structure: 'Centre dentaire du Mourillon', contact: 'Dr Mechali', telephone: '', email: '' }),
    ]
    const [d] = chercherDoublons(base, { ...CHAMPS, telephone: '', email: '' })
    expect(d?.raison).toBe('Même praticien, autre structure')
  })

  it('ne rapproche pas deux confreres qui partagent un prenom', () => {
    const base = [
      lead('l1', { structure: 'Clinique Saint-Roch', contact: 'Dr Nathalie Roche', telephone: '', email: '' }),
    ]
    const trouves = chercherDoublons(base, {
      structure: 'Cabinet des Halles',
      contact: 'Dr Nathalie Robin',
      telephone: '',
      email: '',
    })
    expect(trouves).toEqual([])
  })

  it('ne rapproche pas deux cabinets de villes differentes', () => {
    const base = [
      lead('l1', {
        structure: 'Cabinet dentaire Perpignan',
        contact: 'Dr Nathalie Robin',
        telephone: '',
        email: '',
      }),
    ]
    const trouves = chercherDoublons(base, {
      structure: 'Cabinet dentaire Nîmes',
      contact: 'Dr Nathalie Renard',
      telephone: '',
      email: '',
    })
    expect(trouves).toEqual([])
  })

  it('ne confond pas deux cabinets sans rapport', () => {
    const base = [lead('l1', { structure: 'Clinique Saint-Roch', contact: 'Dr Perrin', telephone: '', email: '' })]
    expect(chercherDoublons(base, { ...CHAMPS, telephone: '', email: '' })).toEqual([])
  })
})
