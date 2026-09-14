/**
 * Le point de la semaine, en texte brut.
 *
 * Destine au groupe WhatsApp : c'est la que les deux equipes se parlent
 * vraiment. Pas de piece jointe, pas de tableau — quelques lignes qu'on lit
 * sur un telephone sans cliquer, et un lien pour ceux qui veulent le detail.
 */
import { AUTRE, deLaMaison, LIBELLE_ORGANISATION, type Lead, type Organisation } from './types'
import { dernierMouvement } from './types'

const JOUR = 86400000

const DATE_COURTE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' })

/** Nombre accorde : « 1 lead », « 3 leads ». */
const pluriel = (n: number, mot: string): string => `${n} ${mot}${n > 1 ? 's' : ''}`

export interface PointHebdo {
  /** Le texte prêt a coller. */
  texte: string
  /** Les chiffres, pour les afficher aussi a l'ecran. */
  semaineEnvoyes: number
  semaineRecus: number
}

/**
 * `mienne` est la maison qui lit : tout est formule de son point de vue, comme
 * partout ailleurs dans l'outil.
 */
export function pointHebdo(
  leads: Lead[],
  mienne: Organisation,
  maintenant: Date = new Date(),
  lien = 'https://septotracking.netlify.app',
): PointHebdo {
  const autre = AUTRE[mienne]
  const debut = new Date(+maintenant - 7 * JOUR)
  const depuisUneSemaine = (l: Lead) => new Date(l.transmisLe) >= debut

  const envoyes = leads.filter((l) => l.origine === mienne)
  const recus = leads.filter((l) => l.origine === autre)

  const semaineEnvoyes = envoyes.filter(depuisUneSemaine).length
  const semaineRecus = recus.filter(depuisUneSemaine).length

  const convertisEnvoyes = envoyes.filter((l) => l.statut === 'converti').length
  const convertisRecus = recus.filter((l) => l.statut === 'converti').length

  // Un lead encore « transmis » n'a jamais ete pris en charge par son destinataire.
  const enAttenteChezEux = envoyes.filter((l) => l.statut === 'transmis').length
  const enAttenteChezNous = recus.filter((l) => l.statut === 'transmis').length

  const dormants = leads.filter(
    (l) =>
      l.statut !== 'converti' &&
      l.statut !== 'sans_suite' &&
      +maintenant - +new Date(dernierMouvement(l)) > 7 * JOUR,
  ).length

  const nous = LIBELLE_ORGANISATION[mienne]
  const eux = LIBELLE_ORGANISATION[autre]
  const ecart = envoyes.length - recus.length

  const lignes: string[] = [
    // Le nom du partenariat ne s'inverse pas : c'est le meme des deux cotes.
    `📊 Échange Alyxa × Septodont — point du ${DATE_COURTE.format(maintenant)}`,
    '',
    'Cette semaine',
    `↗ ${pluriel(semaineEnvoyes, 'lead')} envoyé${semaineEnvoyes > 1 ? 's' : ''} à ${eux}`,
    `↘ ${pluriel(semaineRecus, 'lead')} reçu${semaineRecus > 1 ? 's' : ''} ${deLaMaison(autre)}`,
    '',
    'Depuis le début',
    `${envoyes.length} envoyés · ${recus.length} reçus${equilibreEnClair(ecart, nous, eux)}`,
    `${pluriel(convertisEnvoyes + convertisRecus, 'converti')} au total` +
      (convertisEnvoyes + convertisRecus > 0
        ? ` (${convertisEnvoyes} de notre côté, ${convertisRecus} du leur)`
        : ''),
  ]

  const aTraiter: string[] = []
  if (enAttenteChezNous > 0) {
    aTraiter.push(`⏳ ${pluriel(enAttenteChezNous, 'lead')} reçu${enAttenteChezNous > 1 ? 's' : ''} qu’on n’a pas encore pris en charge`)
  }
  if (enAttenteChezEux > 0) {
    aTraiter.push(`⏳ ${pluriel(enAttenteChezEux, 'lead')} en attente chez ${eux}`)
  }
  if (dormants > 0) {
    aTraiter.push(`💤 ${pluriel(dormants, 'lead')} sans mouvement depuis plus de 7 jours`)
  }
  if (aTraiter.length) lignes.push('', 'À traiter', ...aTraiter)

  lignes.push('', lien)

  return { texte: lignes.join('\n'), semaineEnvoyes, semaineRecus }
}

/** « — on envoie 2 de plus », ou rien quand c'est a l'equilibre. */
function equilibreEnClair(ecart: number, nous: string, eux: string): string {
  if (ecart === 0) return ' — à l’équilibre'
  return ecart > 0
    ? ` — ${nous} en envoie ${Math.abs(ecart)} de plus`
    : ` — ${eux} en envoie ${Math.abs(ecart)} de plus`
}
