import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { BarChart3, BookOpen, Calculator, Coins, Users, Wallet } from 'lucide-react'
import Tableau from '@/pages/Tableau'
import Leads from '@/pages/Leads'
import Commerciaux from '@/pages/Commerciaux'
import Commissions from '@/pages/Commissions'
import Simulateur from '@/pages/Simulateur'
import Guide from '@/pages/Guide'
import Captation from '@/pages/Captation'

const MENU = [
  { to: '/', libelle: 'Tableau de bord', icone: BarChart3, aide: "Vue d'ensemble" },
  { to: '/leads', libelle: 'Leads', icone: Users, aide: 'Les cabinets reçus' },
  { to: '/commerciaux', libelle: 'Commerciaux', icone: Coins, aide: 'Qui apporte quoi' },
  { to: '/commissions', libelle: 'Commissions', icone: Wallet, aide: 'Ce qu’on doit payer' },
  { to: '/simulateur', libelle: 'Simulateur', icone: Calculator, aide: 'Tester un scénario' },
  { to: '/guide', libelle: 'Guide', icone: BookOpen, aide: 'Comment ça marche' },
]

export default function App() {
  // Le formulaire public de captation s'affiche seul, sans la navigation interne.
  const { pathname } = useLocation()
  if (pathname.startsWith('/l/')) {
    return (
      <Routes>
        <Route path="/l/:slug" element={<Captation />} />
      </Routes>
    )
  }

  return (
    <div className="flex min-h-screen">
      <nav className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-bord bg-carte lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-marque)] text-[15px] font-bold text-white">
            A
          </div>
          <div className="leading-tight">
            <div className="text-[14px] font-semibold">Alyxa × Septodont</div>
            <div className="text-[12px] text-encre-3">Suivi des leads</div>
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
                  <span className="leading-tight">
                    <span className="block text-[13.5px] font-medium">{libelle}</span>
                    <span className={`block text-[11.5px] ${isActive ? 'text-[var(--color-marque)]' : 'text-encre-3'}`}>
                      {aide}
                    </span>
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        <div className="border-t border-bord px-5 py-4 text-[11.5px] leading-relaxed text-encre-3">
          Remise cabinet <strong className="font-semibold text-encre-2">10 %</strong> · Commission
          commercial <strong className="font-semibold text-encre-2">15 %</strong> · plafond{' '}
          <strong className="font-semibold text-encre-2">12 mois</strong>
        </div>
      </nav>

      {/* Navigation compacte sur petits ecrans. */}
      <nav className="fixed bottom-0 z-20 flex w-full justify-around border-t border-bord bg-carte py-1.5 lg:hidden">
        {MENU.map(({ to, libelle, icone: Icone }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10.5px] ${
                isActive ? 'text-[var(--color-marque)]' : 'text-encre-3'
              }`
            }
          >
            <Icone size={18} />
            {libelle}
          </NavLink>
        ))}
      </nav>

      <main className="min-w-0 flex-1 pb-20 lg:pb-0">
        <Routes>
          <Route path="/" element={<Tableau />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/commerciaux" element={<Commerciaux />} />
          <Route path="/commissions" element={<Commissions />} />
          <Route path="/simulateur" element={<Simulateur />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
