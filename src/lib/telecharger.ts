/**
 * Telechargement d'un fichier genere par l'application.
 *
 * En local ou sur un hebergement classique, on passe par un lien de blob.
 * Dans une page publiee sur claude.ai, le navigateur bloque ce mecanisme :
 * on demande alors l'enregistrement a l'hote, qui affiche une confirmation
 * au lecteur. Les deux chemins aboutissent au meme fichier.
 */
type Sauvegarde = (r: { filename: string; data: string | Blob }) => Promise<{ status: string }>

interface HoteClaude {
  use?: (nom: string) => Promise<{ save?: Sauvegarde } | null>
}

async function hote(): Promise<{ save?: Sauvegarde } | null> {
  const claude = (globalThis as { claude?: HoteClaude }).claude
  if (!claude?.use) return null
  try {
    return await claude.use('downloads')
  } catch {
    return null
  }
}

/** Propose un CSV au telechargement. Renvoie false si le lecteur a refusé. */
export async function telechargerCsv(
  nomFichier: string,
  lignes: (string | number)[][],
): Promise<boolean> {
  // Separateur point-virgule et BOM : Excel en francais ouvre le fichier
  // directement, sans assistant d'import.
  const csv = lignes
    .map((ligne) => ligne.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
    .join('\n')
  const contenu = '﻿' + csv

  const downloads = await hote()
  if (downloads?.save) {
    try {
      await downloads.save({ filename: nomFichier, data: contenu })
      return true
    } catch {
      // Refus du lecteur ou capacite indisponible : rien n'est enregistre.
      return false
    }
  }

  const url = URL.createObjectURL(new Blob([contenu], { type: 'text/csv;charset=utf-8' }))
  const lien = document.createElement('a')
  lien.href = url
  lien.download = nomFichier
  lien.click()
  URL.revokeObjectURL(url)
  return true
}

export const dateDuJour = (): string => new Date().toISOString().slice(0, 10)
