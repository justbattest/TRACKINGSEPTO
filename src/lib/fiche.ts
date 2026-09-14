/**
 * Ce qui touche au contenu d'une fiche : la nettoyer, la comparer, et
 * reperer qu'elle existe deja.
 *
 * Tout est en memoire. Les leads tiennent en quelques centaines de lignes,
 * deja chargees : chercher un doublon ne demande aucun aller-retour, et la
 * demonstration se comporte exactement comme la base partagee.
 */
import type { Lead } from './types'

/** Les champs d'une fiche qu'on peut saisir puis corriger. */
export interface ChampsFiche {
  structure: string
  contact: string
  telephone: string
  email: string
  ville: string
  codePostal: string
  regionId: string
  motif: string
  apporteParId: string
}

// ---------------------------------------------------------------------------
// Nettoyage
// ---------------------------------------------------------------------------

/**
 * Espaces de bout supprimes, espaces internes reduits a un seul. La casse est
 * laissee telle quelle : « Dr Grassot » et « DE LA BORNIÈRE » sont des noms
 * propres, on ne se permet pas de les reecrire.
 */
export const texteNet = (v: string): string => v.replace(/\s+/g, ' ').trim()

/** Un code postal francais ne contient pas d'espace. */
export const codePostalNet = (v: string): string => v.replace(/\s/g, '')

/** Une adresse est insensible a la casse : on la range en minuscules. */
export const emailNet = (v: string): string => texteNet(v).toLowerCase()

/** Nettoie une fiche a la saisie comme a la correction. */
export function normaliser(f: ChampsFiche): ChampsFiche {
  return {
    ...f,
    structure: texteNet(f.structure),
    contact: texteNet(f.contact),
    telephone: texteNet(f.telephone),
    email: emailNet(f.email),
    ville: texteNet(f.ville),
    codePostal: codePostalNet(f.codePostal),
    motif: texteNet(f.motif),
  }
}

// ---------------------------------------------------------------------------
// Comparaison de deux versions d'une fiche
// ---------------------------------------------------------------------------

/** Libelles des champs, dans l'ordre ou ils apparaissent sur la fiche. */
export const LIBELLE_CHAMP: Record<keyof ChampsFiche, string> = {
  structure: 'Structure',
  contact: 'Praticien',
  telephone: 'Téléphone',
  email: 'Email',
  ville: 'Ville',
  codePostal: 'Code postal',
  regionId: 'Région',
  motif: 'Motif',
  apporteParId: 'Apporteur',
}

const ORDRE = Object.keys(LIBELLE_CHAMP) as (keyof ChampsFiche)[]

export interface Difference {
  champ: keyof ChampsFiche
  libelle: string
  avant: string
  apres: string
}

/**
 * Ce qui a change entre deux versions. `lisible` traduit les identifiants —
 * region, apporteur — en noms : le fil doit rester relisible dans six mois.
 */
export function differences(
  avant: ChampsFiche,
  apres: ChampsFiche,
  lisible: (champ: keyof ChampsFiche, valeur: string) => string = (_, v) => v,
): Difference[] {
  return ORDRE.filter((c) => avant[c] !== apres[c]).map((champ) => ({
    champ,
    libelle: LIBELLE_CHAMP[champ],
    avant: lisible(champ, avant[champ]),
    apres: lisible(champ, apres[champ]),
  }))
}

/** Le texte porte au fil : une ligne par champ corrige. */
export const resumerDifferences = (diffs: Difference[]): string =>
  diffs.map((d) => `${d.libelle} : ${d.avant || '—'} → ${d.apres || '—'}`).join('\n')

// ---------------------------------------------------------------------------
// Doublons
// ---------------------------------------------------------------------------

/** Minuscules, sans accent, sans ponctuation : la forme sur laquelle on compare. */
export function pliage(v: string): string {
  return v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Les chiffres d'un numero, sans prefixe international ni separateur. */
export function chiffres(telephone: string): string {
  const bruts = telephone.replace(/\D/g, '')
  // 0033… et +33… designent le meme abonne que 0…
  const sansPays = bruts.replace(/^(?:00)?33/, '0')
  return sansPays.length >= 9 ? sansPays.slice(-9) : bruts
}

const trigrammes = (v: string): Set<string> => {
  const p = `  ${v} `
  const s = new Set<string>()
  for (let i = 0; i < p.length - 2; i++) s.add(p.slice(i, i + 3))
  return s
}

/**
 * Proximite de deux textes, entre 0 et 1 : coefficient de Dice sur leurs
 * trigrammes. Insensible aux accents, a la casse et a la ponctuation, et
 * tolerant aux fautes de frappe — « Gassot » et « Grassot » donnent 0,7.
 */
export function similarite(a: string, b: string): number {
  const x = pliage(a)
  const y = pliage(b)
  if (!x || !y) return 0
  if (x === y) return 1
  const ta = trigrammes(x)
  const tb = trigrammes(y)
  let communs = 0
  for (const t of ta) if (tb.has(t)) communs++
  return (2 * communs) / (ta.size + tb.size)
}

/**
 * Mots qui ne distinguent rien : presque tous les cabinets s'appellent
 * « Cabinet dentaire … », presque tous les praticiens « Dr … ». Les garder
 * rapproche Nîmes de Perpignan plus surement qu'une vraie faute de frappe.
 */
const MOTS_BANALS = new Set([
  'cabinet', 'cabinets', 'dentaire', 'dentaires', 'dentiste', 'dentistes',
  'centre', 'clinique', 'polyclinique', 'selarl', 'scm', 'sc',
  'dr', 'docteur', 'drs', 'mr', 'mme', 'm',
  'de', 'du', 'des', 'la', 'le', 'les', 'l', 'd', 'et', 'a', 'au', 'aux',
])

/**
 * Ce qui reste d'un libelle une fois les mots banals retires : « Cabinet
 * dentaire de la Bornière » devient « borniere ». Si tout est banal, on garde
 * le libelle entier plutot que de comparer du vide.
 */
export function noyau(v: string): string {
  const mots = pliage(v).split(' ').filter((m) => m && !MOTS_BANALS.has(m))
  return mots.length ? mots.join(' ') : pliage(v)
}

/** Proximite de deux libelles, une fois ecarte ce qui ne distingue rien. */
export const similariteNoms = (a: string, b: string): number => similarite(noyau(a), noyau(b))

export interface Doublon {
  lead: Lead
  /** Pourquoi on le signale, en clair. */
  raison: string
  /** `true` quand l'identite est certaine : meme numero ou meme adresse. */
  certain: boolean
}

/*
 * Seuils cales sur les libelles reduits a ce qui les distingue. Le parti pris
 * est de se taire dans le doute : une alerte de trop apprend a cliquer sans
 * lire, et on perd les vraies. Deux confreres qui partagent un prenom —
 * « Nathalie Robin » et « Nathalie Renard » — plafonnent a 0,65, la ou une
 * vraie faute de frappe sur un nom complet part de 0,81.
 */
const TRES_PROCHE = 0.72
/** Cabinet different : il faut une quasi-identite du praticien pour parler. */
const QUASI_IDENTIQUE = 0.8

/**
 * Les fiches deja presentes qui ressemblent au candidat, de la plus probable
 * a la moins probable. Ne bloque rien : c'est un signalement, la decision
 * revient a celui qui saisit.
 */
export function chercherDoublons(
  leads: Lead[],
  candidat: Pick<ChampsFiche, 'structure' | 'contact' | 'telephone' | 'email'>,
  ignorer?: string,
): Doublon[] {
  const telCandidat = chiffres(candidat.telephone)
  const mailCandidat = emailNet(candidat.email)

  const trouves: (Doublon & { score: number })[] = []

  for (const lead of leads) {
    if (lead.id === ignorer) continue

    if (telCandidat.length >= 9 && chiffres(lead.telephone) === telCandidat) {
      trouves.push({ lead, raison: 'Même numéro de téléphone', certain: true, score: 3 })
      continue
    }
    if (mailCandidat && emailNet(lead.email) === mailCandidat) {
      trouves.push({ lead, raison: 'Même adresse email', certain: true, score: 3 })
      continue
    }

    const surStructure = similariteNoms(candidat.structure, lead.structure)
    const surContact = similariteNoms(candidat.contact, lead.contact)

    /*
     * On ne signale JAMAIS sur la seule structure. Alyxa vend par poste : un
     * meme cabinet qui revient avec un autre praticien est un lead legitime,
     * pas un doublon — c'est meme ce qu'on cherche. Il faut que le praticien
     * aussi corresponde.
     */
    if (surStructure >= TRES_PROCHE && surContact >= TRES_PROCHE) {
      trouves.push({ lead, raison: 'Même structure et même praticien', certain: false, score: 2 })
    } else if (surContact >= QUASI_IDENTIQUE) {
      // Structure differente : seul un nom de praticien quasi identique parle.
      trouves.push({ lead, raison: 'Même praticien, autre structure', certain: false, score: 1 })
    }
  }

  return trouves
    .sort((a, b) => b.score - a.score || +new Date(b.lead.transmisLe) - +new Date(a.lead.transmisLe))
    .slice(0, 3)
    .map(({ lead, raison, certain }) => ({ lead, raison, certain }))
}
