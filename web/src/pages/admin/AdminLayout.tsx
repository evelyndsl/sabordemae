import { useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  CircleDollarSign,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  QrCode,
  Settings,
  Soup,
  type LucideIcon,
} from 'lucide-react'
import { Brand } from '@/components/brand'
import { NewOrderAlerts } from '@/components/new-order-alerts'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button, buttonVariants } from '@/components/ui/button'
import { useAuth } from '@/context/auth'

const navItems: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/admin/dashboard', label: 'Pedidos', icon: LayoutDashboard },
  { to: '/admin/sabores', label: 'Sabores', icon: Soup },
  { to: '/admin/precos', label: 'Preços e entrega', icon: CircleDollarSign },
  { to: '/admin/pix', label: 'Pix e contato', icon: QrCode },
  { to: '/admin/configuracoes', label: 'Configurações', icon: Settings },
]

const COLLAPSED_KEY = 'saborDeMae:sidebarRecolhida'

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

function pageTitle(pathname: string) {
  if (pathname.includes('/pedidos/')) return 'Detalhes do pedido'
  return navItems.find((i) => pathname.startsWith(i.to))?.label ?? 'Admin'
}

// Protege todas as rotas /admin/* (exceto /admin/login).
export default function AdminLayout() {
  const { isAdmin, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(readCollapsed)

  if (!isAdmin) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />

  function sair() {
    logout()
    navigate('/admin/login')
  }

  function toggleSidebar() {
    const next = !collapsed
    setCollapsed(next)
    try {
      localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
    } catch {
      /* preferência vale só até recarregar */
    }
  }

  return (
    <div className="admin-shell" data-collapsed={collapsed}>
      <aside className="admin-sidebar" aria-label="Barra lateral">
        <Brand to="/admin/dashboard" showName={!collapsed} />
        <nav className="admin-nav" aria-label="Menu do admin">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className="admin-nav__link" title={collapsed ? label : undefined}>
              <Icon className="size-4 shrink-0" />
              <span className="admin-nav__label">{label}</span>
            </NavLink>
          ))}
          <Link to="/pedido" className="admin-nav__link mt-auto" title={collapsed ? 'Ver página de pedido' : undefined}>
            <ExternalLink className="size-4 shrink-0" />
            <span className="admin-nav__label">Ver página de pedido</span>
          </Link>
        </nav>
        <div className="admin-sidebar__footer">
          <Button variant="ghost" className="admin-nav__button" onClick={sair} title={collapsed ? 'Sair' : undefined}>
            <LogOut />
            <span className="admin-nav__label">Sair</span>
          </Button>
          <Button
            variant="ghost"
            className="admin-nav__button"
            onClick={toggleSidebar}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            title={collapsed ? 'Expandir menu' : undefined}
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            <span className="admin-nav__label">Recolher menu</span>
          </Button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="admin-topbar">
          <div className="admin-topbar__brand"><Brand to="/admin/dashboard" /></div>
          <h1 className="admin-topbar__title">{pageTitle(location.pathname)}</h1>
          <div className="site-header__actions">
            <Link to="/pedido" className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'lg:hidden' })}>Site</Link>
            <NewOrderAlerts />
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Sair" onClick={sair}>
              <LogOut />
            </Button>
          </div>
        </header>
        <nav className="admin-tabs" aria-label="Menu do admin">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className="admin-nav__link">
              <Icon className="size-4" /> {label}
            </NavLink>
          ))}
        </nav>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
