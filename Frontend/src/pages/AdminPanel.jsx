import { UserButton } from '@clerk/react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { formatBookingDate } from '../data/catalog'
import { useSession } from '../session/useSession'
import { estadoInfo } from '../utils/estados'

const TABS = [
  { value: 'pendientes', label: 'Pendientes' },
  { value: 'activas', label: 'Activas' },
  { value: 'todas', label: 'Todas' },
]

export function AdminPanel() {
  const { api } = useSession()
  const [tab, setTab] = useState('pendientes')
  const [companies, setCompanies] = useState([])
  const [error, setError] = useState('')
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [loadedKey, setLoadedKey] = useState('')
  const loadingKey = `${tab}-${refreshVersion}`

  useEffect(() => {
    let active = true
    api(`/superadmin/empresas?estado=${tab}`)
      .then((items) => {
        if (active) {
          setCompanies(items)
          setError('')
        }
      })
      .catch((reason) => { if (active) setError(reason.message || 'No se pudieron cargar las empresas.') })
      .finally(() => { if (active) setLoadedKey(loadingKey) })
    return () => { active = false }
  }, [api, loadingKey, refreshVersion, tab])

  async function act(company, action) {
    const prompts = {
      approve: `¿Aprobar a ${company.nombre}?`,
      deactivate: `¿Desactivar a ${company.nombre}? Sus usuarios perderán el acceso.`,
      reject: `¿Rechazar y borrar a ${company.nombre}? Esta acción no se puede deshacer.`,
    }
    if (!window.confirm(prompts[action])) return
    const route = action === 'approve' ? 'aprobar' : action === 'deactivate' ? 'desactivar' : ''
    try {
      setError('')
      await api(`/superadmin/empresas/${company.id_empresa}${route ? `/${route}` : ''}`, {
        method: action === 'reject' ? 'DELETE' : 'PATCH',
      })
      setRefreshVersion((value) => value + 1)
    } catch (reason) {
      setError(reason.status === 409
        ? `${reason.message}. Esta empresa debe desactivarse en lugar de rechazarse.`
        : reason.message || 'No se pudo actualizar la empresa.')
    }
  }

  return <main className="platform-wrap">
    <div className="panel-topline">
      <div><p className="eyebrow">Administración de plataforma</p><h1>Empresas</h1></div>
      <UserButton />
    </div>
    <p className="muted">Solo se administran empresas. Este panel no muestra solicitudes, clientes ni catálogos.</p>
    <div className="tab-list" role="tablist" aria-label="Estado de empresas">
      {TABS.map((item) => <button key={item.value} role="tab" aria-selected={tab === item.value} className={tab === item.value ? 'tab active' : 'tab'} onClick={() => setTab(item.value)}>{item.label}</button>)}
    </div>
    {error && <p className="notice notice-error" role="alert">{error}</p>}
    {loadedKey !== loadingKey ? <p className="notice" role="status">Cargando empresas…</p>
      : companies.length === 0 ? <p className="notice">No hay empresas en esta pestaña.</p>
        : <div className="table-scroll"><table>
          <thead><tr><th>Empresa</th><th>CUIT</th><th>Contacto</th><th>Estado</th><th>Alta</th><th>Acciones</th></tr></thead>
          <tbody>{companies.map((company) => {
            const state = estadoInfo(company.activa ? 'confirmado' : 'inactiva')
            return <tr key={company.id_empresa}>
              <td><strong>{company.nombre}</strong></td>
              <td>{company.cuit}</td>
              <td>{company.email}{company.telefono && <small className="table-subtext">{company.telefono}</small>}</td>
              <td><span className={`status-pill status-${state.color}`}>{company.activa ? 'Activa' : 'Inactiva'}</span></td>
              <td>{formatBookingDate(company.fecha_alta?.slice(0, 10))}</td>
              <td className="table-actions">
                {!company.activa && <>
                  <button className="button button-small" onClick={() => act(company, 'approve')}>Aprobar</button>
                  <button className="button button-small button-danger" onClick={() => act(company, 'reject')}>Rechazar</button>
                </>}
                {company.activa && <button className="button button-small button-secondary" onClick={() => act(company, 'deactivate')}>Desactivar</button>}
              </td>
            </tr>
          })}</tbody>
        </table></div>}
    <p className="muted">Las empresas pendientes y desactivadas todavía aparecen como «Inactiva».</p>
    <Link to="/" className="text-link">Ver zona pública</Link>
  </main>
}
