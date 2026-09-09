/**
 * Assemble le build Vite en une page HTML autonome, sans aucune ressource
 * externe : CSS et JS sont incorpores directement. Le fichier produit peut
 * etre ouvert tel quel, envoye par mail, ou publie n'importe ou.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dist = 'dist'
const fichiers = readdirSync(join(dist, 'assets'))
const css = fichiers.filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(dist, 'assets', f), 'utf8')).join('\n')
const js = fichiers.filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(dist, 'assets', f), 'utf8')).join('\n')

// Les balises de document sont ajoutees par l'hote : on ne produit que le contenu.
const page = `<title>Échange Alyxa Septodont</title>
<style>
${css}
</style>
<div id="root"></div>
<script type="module">
${js}
</script>
`

const sortie = process.argv[2] ?? 'dist/page-autonome.html'
writeFileSync(sortie, page)
console.log(`${sortie} — ${(Buffer.byteLength(page) / 1024 / 1024).toFixed(2)} Mo`)
