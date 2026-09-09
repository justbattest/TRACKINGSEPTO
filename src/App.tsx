import { useState } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { AlertCircle, BarChart3, BookOpen, Loader2, LogOut, Repeat2, Users } from 'lucide-react'
import Tableau from '@/pages/Tableau'
import Leads from '@/pages/Leads'
import Guide from '@/pages/Guide'
import FicheLead from '@/components/FicheLead'
import Identite from '@/components/Identite'
import Connexion from '@/components/Connexion'
import { Avatar, Pastille } from '@/components/ui'
import { useStore } from '@/lib/store'
import { leadsNonLus } from '@/lib/stats'
import { LIBELLE_ORGANISATION } from '@/lib/types'

const MENU = [
  { to: '/', libelle: 'Tableau de bord', icone: BarChart3, aide: 'L’état de l’échange' },
  { to: '/leads', libelle: 'Leads', icone: Repeat2, aide: 'Tout ce qui circule' },
  { to: '/guide', libelle: 'Guide', icone: BookOpen, aide: 'Comment ça marche' },
]

export default function App() {
  const { moi, leads, lectures, membreId, enLigne, chargement, erreur, seDeconnecter } = useStore()
  const [leadOuvert, setLeadOuvert] = useState<string | null>(null)
  const [changerCompte, setChangerCompte] = useState(false)

  if (chargement) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 bg-fond text-[13.5px] text-encre-2">
        <Loader2 size={17} className="animate-spin" /> Chargement de l’échange…
      </div>
    )
  }

  // Personne ne peut discuter sans nom : on s'identifie avant tout.
  if (!moi) return enLigne ? <Connexion /> : <Identite obligatoire />

  const messagesEnAttente = leadsNonLus(leads, lectures, membreId).reduce((t, n) => t + n.nonLus, 0)

  return (
    <div className="flex min-h-screen">
      <nav className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-bord bg-carte lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-marque)] text-white">
            <Repeat2 size={18} />
          </div>
          <div className="leading-tight">
            <div className="text-[14px] font-semibold">Alyxa × Septodont</div>
            <div className="text-[12px] text-encre-3">Échange de leads</div>
          </div>
        </div>

        <div className="flex-1 space-y-0.5 px-3 py-2">
          {MENU.map(({ to, libelle, icone: Icone, aide }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                  isActive
                    ? 'bg-[var(--color-marque-clair)] text-[var(--color-marque-fonce)]'
                    : 'text-encre-2 hover:bg-fond hover:text-encre'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icone size={17} className="mt-0.5 shrink-0" />
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="flex items-center gap-2 text-[13.5px] font-medium">
                      {libelle}
                      {to === '/leads' && <Pastille nombre={messagesEnAttente} />}
                    </span>
                    <span className={`block text-[11.5px] ${isActive ? 'text-[var(--color-marque)]' : 'text-encre-3'}`}>
                      {aide}
                    </span>
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Le compte courant : on voit tout de suite sous quelle identite on écrit. */}
        <button
          onClick={() => (enLigne ? void seDeconnecter() : setChangerCompte(true))}
          title={enLigne ? 'Se déconnecter' : 'Changer de compte'}
          className="flex items-center gap-2.5 border-t border-bord px-4 py-3.5 text-left transition-colors hover:bg-fond"
        >
          <Avatar membre={moi} taille={32} />
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[13px] font-medium">{moi.nom}</span>
            <span className="block text-[11.5px] text-encre-3">{LIBELLE_ORGANISATION[moi.organisation]}</span>
          </span>
          {enLigne ? (
            <LogOut size={15} className="shrink-0 text-encre-3" />
          ) : (
            <Users size={15} className="shrink-0 text-encre-3" />
          )}
        </button>
      </nav>

      {/* Navigation compacte sur petits ecrans. */}
      <nav className="fixed bottom-0 z-20 flex w-full justify-around border-t border-bord bg-carte py-1.5 lg:hidden">
        {MENU.map(({ to, libelle, icone: Icone }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `relative flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10.5px] ${
                isActive ? 'text-[var(--color-marque)]' : 'text-encre-3'
              }`
            }
          >
            <Icone size={18} />
            {libelle}
            {to === '/leads' && messagesEnAttente > 0 && (
              <span className="absolute top-0.5 right-1">
                <Pastille nombre={messagesEnAttente} />
              </span>
            )}
          </NavLink>
        ))}
        <button
          onClick={() => (enLigne ? void seDeconnecter() : setChangerCompte(true))}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10.5px] text-encre-3"
        >
          <Avatar membre={moi} taille={18} />
          Compte
        </button>
      </nav>

      <main className="min-w-0 flex-1 pb-20 lg:pb-0">
        {erreur && (
          <div className="flex items-start gap-2 border-b border-[var(--color-critique)] bg-[var(--color-critique-fond)] px-6 py-3 text-[13px] text-[#b02a2a] lg:px-8">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{erreur}</span>
          </div>
        )}
        <Routes>
          <Route path="/" element={<Tableau onOuvrirLead={setLeadOuvert} />} />
          <Route path="/leads" element={<Leads onOuvrirLead={setLeadOuvert} />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {leadOuvert && <FicheLead leadId={leadOuvert} onFermer={() => setLeadOuvert(null)} />}
      {changerCompte && !enLigne && <Identite onFermer={() => setChangerCompte(false)} />}
    </div>
  )
}
