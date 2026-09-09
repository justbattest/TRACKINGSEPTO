/** Utilitaires de dates en UTC, sans dependance externe. */

/** Mois au format AAAA-MM. */
export type Periode = string

export function periodeDe(date: string | Date): Periode {
  const d = typeof date === 'string' ? new Date(date) : date
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export function ajouterMois(date: string | Date, mois: number): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date)
  const jour = d.getUTCDate()
  const cible = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + mois, 1))
  // Evite le debordement (31 janvier + 1 mois doit donner le 28/29 fevrier).
  const dernierJour = new Date(
    Date.UTC(cible.getUTCFullYear(), cible.getUTCMonth() + 1, 0),
  ).getUTCDate()
  cible.setUTCDate(Math.min(jour, dernierJour))
  return cible
}

/** Nombre de mois calendaires entiers entre deux dates. */
export function moisEcoules(debut: string | Date, fin: string | Date): number {
  const a = typeof debut === 'string' ? new Date(debut) : debut
  const b = typeof fin === 'string' ? new Date(fin) : fin
  let n = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth())
  if (b.getUTCDate() < a.getUTCDate()) n -= 1
  return n
}

export function periodePrecedente(p: Periode, recul: number): Periode {
  const [a, m] = p.split('-').map(Number)
  return periodeDe(new Date(Date.UTC(a, m - 1 - recul, 1)))
}

/** Les `n` derniers mois jusqu'a `fin` inclus, du plus ancien au plus recent. */
export function dernieresPeriodes(n: number, fin: Periode): Periode[] {
  return Array.from({ length: n }, (_, i) => periodePrecedente(fin, n - 1 - i))
}

const MOIS_COURTS = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc']

export function libellePeriode(p: Periode): string {
  const [a, m] = p.split('-').map(Number)
  return `${MOIS_COURTS[m - 1]} ${String(a).slice(2)}`
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
}

export function aujourdhui(): Date {
  return new Date()
}

/** Delai en clair : « aujourd'hui », « hier », puis en jours. */
export function ilYa(date: string | Date, maintenant: Date = new Date()): string {
  const jours = Math.floor((+maintenant - +new Date(date)) / 86400000)
  if (jours <= 0) return "aujourd'hui"
  if (jours === 1) return 'hier'
  if (jours < 31) return `il y a ${jours} jours`
  const mois = Math.round(jours / 30.44)
  return `il y a ${mois} mois`
}
