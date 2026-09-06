import { useEffect, useState } from 'react'
import { NavLink, Navigate, Outlet } from 'react-router'
import { Dialog } from 'radix-ui'
import { Activity, BarChart3, FlaskConical, Home, KeyRound, LayoutGrid, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Server, Settings, ShieldCheck, X } from 'lucide-react'
import { Wordmark } from '../../components/brand/Wordmark'
import { CartridgeGlyph } from '../../components/brand/CartridgeGlyph'
import { DemoBanner } from '../../components/layout/DemoBanner'
import { ConnectionDot, LiveBadge, useLiveConnection } from '../../components/layout/Live'
import { useAuth } from '../../lib/auth'
import { useDemoMode } from '../../lib/demo-mode'
import { cn } from '../../lib/cn'
import '../../components/ui/ui.css'
import './app.css'

const NAV = [
  { to: '/app', label: 'Overview', icon: Home, end: true },
  { to: '/app/servers', label: 'Servers', icon: Server },
  { to: '/app/loadouts', label: 'Loadouts', icon: LayoutGrid },
  { to: '/app/approvals', label: 'Approvals', icon: ShieldCheck, badge: true },
  { to: '/app/calls', label: 'Calls', icon: Activity },
  { to: '/app/playground', label: 'Playground', icon: FlaskConical },
  { to: '/app/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/app/keys', label: 'API keys', icon: KeyRound },
  { to: '/app/settings', label: 'Settings', icon: Settings },
]

function NavItems({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5 px-2" aria-label="App">
      {NAV.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'group flex items-center gap-3 rounded-1 px-2.5 py-2 t-body-sm font-medium text-fg-3 hover:text-fg-1 hover:bg-glass transition-colors',
              isActive && 'text-fg-1 bg-glass-strong shadow-[inset_2px_0_0_var(--color-arc)]',
            )
          }
          title={collapsed ? n.label : undefined}
        >
          <n.icon size={17} className="shrink-0" />
          {!collapsed && <span className="truncate">{n.label}</span>}
          {n.badge && !collapsed && <LiveBadge />}
        </NavLink>
      ))}
    </nav>
  )
}

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const { user, logout } = useAuth()
  return (
    <div className="mt-auto px-3 pb-4 flex flex-col gap-3">
      <ConnectionDot withLabel={!collapsed} />
      {!collapsed && user && (
        <div className="flex items-center justify-between gap-2 t-body-sm">
          <span className="truncate text-fg-2">{user.display_name}</span>
          <button type="button" onClick={logout} className="text-fg-3 hover:text-fg-1" aria-label="Sign out">
            <LogOut size={15} />
          </button>
        </div>
      )}
    </div>
  )
}

export function AppLayout() {
  const { user, loading } = useAuth()
  const demo = useDemoMode()
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('quiver:sidebar') === 'collapsed'
    } catch {
      return false
    }
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  useLiveConnection()

  useEffect(() => {
    try {
      localStorage.setItem('quiver:sidebar', collapsed ? 'collapsed' : 'open')
    } catch {
      /* fine */
    }
  }, [collapsed])

  if (loading) return <div className="min-h-screen grid place-items-center text-fg-3 t-body-sm">Loading</div>
  if (!user && !demo) return <Navigate to="/login" replace />

  return (
    <div className="app min-h-screen flex bg-void text-fg-1">
      <aside className={cn('hidden md:flex flex-col shrink-0 border-r border-hairline bg-slate/60 transition-[width] duration-200', collapsed ? 'w-14' : 'w-[232px]')}>
        <div className={cn('flex items-center h-14 px-3', collapsed ? 'justify-center' : 'justify-between')}>
          {collapsed ? <CartridgeGlyph size={22} /> : <Wordmark compact />}
          {!collapsed && (
            <button type="button" onClick={() => setCollapsed(true)} className="text-fg-3 hover:text-fg-1" aria-label="Collapse sidebar">
              <PanelLeftClose size={16} />
            </button>
          )}
        </div>
        {collapsed && (
          <button type="button" onClick={() => setCollapsed(false)} className="mx-auto mb-2 text-fg-3 hover:text-fg-1" aria-label="Expand sidebar">
            <PanelLeftOpen size={16} />
          </button>
        )}
        <NavItems collapsed={collapsed} />
        <SidebarFooter collapsed={collapsed} />
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="md:hidden flex items-center justify-between h-14 px-4 border-b border-hairline">
          <Wordmark compact />
          <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
            <Dialog.Trigger className="text-fg-2" aria-label="Open menu">
              <Menu size={20} />
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-void/70" />
              <Dialog.Content className="fixed z-50 inset-y-0 left-0 w-72 bg-slate border-r border-hairline-strong flex flex-col">
                <div className="flex items-center justify-between h-14 px-4">
                  <Dialog.Title asChild>
                    <span>
                      <Wordmark compact />
                    </span>
                  </Dialog.Title>
                  <Dialog.Close className="text-fg-3" aria-label="Close menu">
                    <X size={18} />
                  </Dialog.Close>
                </div>
                <NavItems collapsed={false} onNavigate={() => setMobileOpen(false)} />
                <SidebarFooter collapsed={false} />
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
        <DemoBanner />
        <main className="flex-1 min-w-0 px-4 md:px-8 py-6 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
