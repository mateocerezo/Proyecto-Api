import { Link, Navigate, Route, Routes, useLocation } from 'react-router'
import { UserButton, useAuth } from '@clerk/react'
import { PLATFORM } from './config/platform'
import { useSession } from './session/useSession'
import { AdminPanel } from './pages/AdminPanel'
import { AccessPage, CompanyRegistration, PendingCompany } from './pages/Access'
import { CompanyPanel, CompanyProfile, EventDetail, EventList, CatalogManager } from './pages/CompanyPanel'
import { CompanyBooking, CompanyList } from './pages/Public'
import './Platform.css'

function destination(status) {
  if (status === 'admin') return '/admin'
  if (status === 'active') return '/panel'
  if (status === 'no-company') return '/empresa/registro'
  if (status === 'inactive-company') return '/empresa/pendiente'
  if (status === 'inactive-user') return '/cuenta-inactiva'
  return '/ingresar'
}

// Enlace al panel que corresponde según el estado de la sesión.
const PANEL_LINKS = {
  admin: { to: '/admin', label: 'Administración' },
  active: { to: '/panel', label: 'Mi panel' },
  'no-company': { to: '/empresa/registro', label: 'Registrar empresa' },
  'inactive-company': { to: '/empresa/pendiente', label: 'Estado de mi empresa' },
  'inactive-user': { to: '/cuenta-inactiva', label: 'Mi cuenta' },
}

function SiteHeader() {
  const { isSignedIn } = useAuth()
  const session = useSession()
  const panel = PANEL_LINKS[session.status]
  return <header className="platform-header">
    <Link to="/" className="platform-brand"><span className="brand-mark">{PLATFORM.mark}</span> {PLATFORM.name}</Link>
    <nav aria-label="Navegación">
      <Link to="/">Empresas</Link>
      {isSignedIn ? <>
        {panel && <Link to={panel.to}>{panel.label}</Link>}
        <UserButton />
      </> : <>
        <Link className="nav-secondary" to="/cuenta">Registrar empresa</Link>
        <Link to="/ingresar">Ingresar</Link>
      </>}
    </nav>
  </header>
}

function RouteGate({ allow, children }) {
  const session = useSession()
  const location = useLocation()
  if (session.status === 'loading') return <PageMessage title="Verificando acceso…" />
  if (session.status === 'error') {
    return <PageMessage title="No se pudo verificar el acceso" detail={session.error}>
      <button className="button" onClick={session.refresh}>Volver a intentar</button>
    </PageMessage>
  }
  if (!allow.includes(session.status)) {
    return <Navigate to={destination(session.status)} replace state={{ from: location.pathname }} />
  }
  return children
}

function PageMessage({ title, detail, children }) {
  return <main className="platform-wrap"><section className="platform-card">
    <h1>{title}</h1>
    {detail && <p role="status">{detail}</p>}
    {children}
  </section></main>
}

function AccountInactive() {
  return <PageMessage title="Tu usuario está deshabilitado" detail="Contactá al administrador de tu empresa o cerrá la sesión.">
    <UserButton />
  </PageMessage>
}

function AccessRedirect() {
  const session = useSession()
  if (session.status === 'loading') return <PageMessage title="Verificando acceso…" />
  if (session.status === 'error') return <PageMessage title="No se pudo verificar el acceso" detail={session.error}>
    <button className="button" onClick={session.refresh}>Volver a intentar</button>
  </PageMessage>
  return <Navigate to={destination(session.status)} replace />
}

function NotFound() {
  return <PageMessage title="No encontramos esta página">
    <Link className="button" to="/">Ir al inicio</Link>
  </PageMessage>
}

export default function App() {
  return <>
    <SiteHeader />
    <Routes>
      <Route path="/" element={<CompanyList />} />
      <Route path="/empresas/:id" element={<CompanyBooking />} />
      <Route path="/ingresar/*" element={<AccessPage mode="sign-in" />} />
      <Route path="/cuenta/*" element={<AccessPage mode="sign-up" />} />
      <Route path="/acceso" element={<AccessRedirect />} />
      <Route path="/empresa/registro" element={<RouteGate allow={['no-company']}><CompanyRegistration /></RouteGate>} />
      <Route path="/empresa/pendiente" element={<RouteGate allow={['inactive-company']}><PendingCompany /></RouteGate>} />
      <Route path="/cuenta-inactiva" element={<RouteGate allow={['inactive-user']}><AccountInactive /></RouteGate>} />
      <Route path="/admin" element={<RouteGate allow={['admin']}><AdminPanel /></RouteGate>} />
      <Route path="/panel" element={<RouteGate allow={['active']}><CompanyPanel /></RouteGate>}>
        <Route index element={<Navigate to="solicitudes" replace />} />
        <Route path="solicitudes" element={<EventList />} />
        <Route path="solicitudes/:id" element={<EventDetail />} />
        <Route path="catalogo" element={<CatalogManager />} />
        <Route path="propuesta" element={<CompanyProfile />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
    <footer className="platform-footer">Solicitudes y propuestas para celebrar a tu manera.</footer>
  </>
}
