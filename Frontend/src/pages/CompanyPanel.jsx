import { UserButton } from '@clerk/react'
import { useEffect, useState } from 'react'
import { Link, Outlet, useNavigate, useParams } from 'react-router'
import { formatBookingDate, formatCurrency } from '../data/catalog'
import { useSession } from '../session/useSession'
import { estadoInfo, isPendingResponse } from '../utils/estados'

const EVENT_TABS = [
  { value: 'consultado', label: 'Nuevas' },
  { value: 'reservado', label: 'Confirmadas' },
  { value: 'cancelado', label: 'Descartadas' },
]

export function CompanyPanel() {
  const { user } = useSession()
  return <main className="platform-wrap">
    <div className="panel-topline">
      <div><p className="eyebrow">{user?.empresa || 'Panel de empresa'}</p><h1>Panel de gestión</h1></div>
      <UserButton />
    </div>
    <nav className="panel-nav" aria-label="Panel de empresa">
      <Link to="/panel/solicitudes">Solicitudes</Link>
      <Link to="/panel/catalogo">Catálogo</Link>
    </nav>
    <Outlet />
  </main>
}

export function EventList() {
  const { api } = useSession()
  const [tab, setTab] = useState('consultado')
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [loadedKey, setLoadedKey] = useState('')
  const loaded = loadedKey === `${tab}-${refreshVersion}`

  useEffect(() => {
    let active = true
    api(`/eventos?estado=${tab}`)
      .then((items) => {
        if (active) {
          setEvents(items)
          setError('')
        }
      })
      .catch((reason) => { if (active) setError(reason.message || 'No se pudieron cargar las solicitudes.') })
      .finally(() => { if (active) setLoadedKey(`${tab}-${refreshVersion}`) })
    return () => { active = false }
  }, [api, refreshVersion, tab])

  return <section className="panel-content">
    <div className="section-title-row"><div><p className="eyebrow">Entradas de la web</p><h2>Solicitudes</h2></div><button className="button button-secondary button-small" onClick={() => setRefreshVersion((value) => value + 1)}>Actualizar</button></div>
    <div className="tab-list" role="tablist" aria-label="Estado de solicitudes">
      {EVENT_TABS.map((item) => <button key={item.value} className={tab === item.value ? 'tab active' : 'tab'} role="tab" aria-selected={tab === item.value} onClick={() => setTab(item.value)}>{item.label}</button>)}
    </div>
    {error && <p className="notice notice-error" role="alert">{error}</p>}
    {!loaded ? <p className="notice" role="status">Cargando solicitudes…</p>
      : events.length === 0 ? <p className="notice">No hay solicitudes en esta categoría.</p>
        : <div className="event-list">{events.map((event) => {
          const state = estadoInfo(event.estado)
          const phone = event.cliente?.telefono?.replace(/\D/g, '')
          const endNextDay = event.hora_fin?.slice(0, 5) < event.hora_inicio?.slice(0, 5)
          return <article className="platform-card event-card" key={event.id_evento}>
            <div className="event-card-heading">
              <div><span className={`status-pill status-${state.color}`}>{state.label}</span><h3>{event.nombre || `Solicitud #${event.id_evento}`}</h3></div>
              <strong>{formatCurrency.format(Number(event.monto_total))}</strong>
            </div>
            <p>{event.cliente?.nombre} {event.cliente?.apellido} · homenajeado/a: {event.nombre_homenajeado || '—'}</p>
            <p>{formatBookingDate(event.fecha_evento)} · {event.hora_inicio?.slice(0, 5)} a {event.hora_fin?.slice(0, 5)}{endNextDay ? ' del día siguiente' : ''} · {event.cant_invitados_estimada} invitados</p>
            <div className="event-card-actions">
              <Link className="button button-small" to={`/panel/solicitudes/${event.id_evento}`}>Ver detalle</Link>
              {phone && <a className="button button-small button-secondary" href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer">WhatsApp</a>}
            </div>
          </article>
        })}</div>}
  </section>
}

export function EventDetail() {
  const { api, user } = useSession()
  const { id } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [loadedId, setLoadedId] = useState('')
  const [error, setError] = useState('')
  const [action, setAction] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('transferencia')
  const [reason, setReason] = useState('')
  const [conflicts, setConflicts] = useState([])

  useEffect(() => {
    let active = true
    api(`/eventos/${id}`)
      .then((result) => {
        if (active) {
          setEvent(result)
          setError('')
        }
      })
      .catch((failure) => {
        if (!active) return
        setError(failure.status === 404 ? 'Solicitud no encontrada.' : failure.message || 'No se pudo cargar la solicitud.')
      })
      .finally(() => { if (active) setLoadedId(id) })
    return () => { active = false }
  }, [api, id])

  async function respond(eventObject) {
    eventObject.preventDefault()
    setError('')
    setConflicts([])
    if (action === 'accept') {
      if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0 || Number(amount) > Number(event.monto_total)) {
        setError('La seña debe ser mayor a cero, tener hasta dos decimales y no superar el total.')
        return
      }
    }
    try {
      const body = action === 'accept'
        ? { monto: amount, metodo_pago: paymentMethod, concepto: 'seña' }
        : reason.trim() ? { motivo: reason.trim() } : {}
      setEvent(await api(`/eventos/${id}/${action === 'accept' ? 'aceptar' : 'rechazar'}`, { method: 'POST', body }))
      setAction('')
      setReason('')
    } catch (failure) {
      if (failure.status === 409 && failure.detalles?.length) setConflicts(failure.detalles)
      else if (failure.status === 409) {
        setError(`${failure.message} Se actualizó el detalle.`)
        try {
          setEvent(await api(`/eventos/${id}`))
        } catch (reloadFailure) {
          setError(reloadFailure.message || 'No se pudo actualizar la solicitud.')
        }
      } else if (failure.status === 404) {
        setError('Solicitud no encontrada. Volvé al listado.')
      } else setError(failure.message || 'No se pudo responder la solicitud.')
    }
  }

  if (loadedId !== id) return <p className="notice">Cargando detalle…</p>
  if (!event || event.id_evento !== Number(id)) return <section className="panel-content">{error && <p className="notice notice-error" role="alert">{error}</p>}<Link className="text-link" to="/panel/solicitudes">← Volver a solicitudes</Link></section>
  const state = estadoInfo(event.estado)
  const canRespond = isPendingResponse(event.estado) && user?.rol === 'admin'
  const endNextDay = event.hora_fin?.slice(0, 5) < event.hora_inicio?.slice(0, 5)

  return <section className="panel-content">
    <Link className="text-link" to="/panel/solicitudes">← Volver a solicitudes</Link>
    <div className="section-title-row"><div><p className="eyebrow">Solicitud #{event.id_evento}</p><h2>{event.nombre || event.nombre_homenajeado || 'Detalle de solicitud'}</h2></div><span className={`status-pill status-${state.color}`}>{state.label}</span></div>
    {error && <p className="notice notice-error" role="alert">{error}</p>}
    {conflicts.length > 0 && <div className="notice notice-error"><strong>No hay disponibilidad para estos espacios:</strong>{conflicts.map((item) => <p key={item.id_evento}>{item.nombre} · {formatBookingDate(item.fecha_evento)} · {item.horario} · {item.espacios?.join(', ')}</p>)}</div>}
    <div className="detail-grid">
      <DetailCard title="Fecha y grupo">
        <p>{formatBookingDate(event.fecha_evento)}</p><p>{event.hora_inicio?.slice(0, 5)} a {event.hora_fin?.slice(0, 5)}{endNextDay ? ' del día siguiente' : ''}</p>
        <p>{event.cant_invitados_estimada} invitados · {event.tipo_evento}</p><strong>{formatCurrency.format(Number(event.monto_total))}</strong>
      </DetailCard>
      <DetailCard title="Contacto">
        <p>{event.cliente?.nombre} {event.cliente?.apellido}</p><p>{event.cliente?.email}</p><p>{event.cliente?.telefono}</p>
        {event.cliente?.telefono && <a className="text-link" href={`https://wa.me/${event.cliente.telefono.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">Abrir WhatsApp</a>}
      </DetailCard>
      <DetailCard title="Espacios">
        {event.espacios?.length ? event.espacios.map((space) => <p key={space.id_espacio}>{space.nombre} · capacidad {space.capacidad}</p>) : <p>Sin espacios informados</p>}
      </DetailCard>
      <DetailCard title="Servicios">
        {event.servicios?.length ? event.servicios.map((service) => <p key={service.id_servicio}>{service.nombre} × {service.cantidad} · {formatCurrency.format(Number(service.precio_unitario))} c/u</p>) : <p>Sin servicios adicionales</p>}
      </DetailCard>
      <DetailCard title="Pagos">
        {event.pagos?.length ? event.pagos.map((payment) => <p key={payment.id_pago}>{payment.concepto}: {formatCurrency.format(Number(payment.monto))} · {payment.metodo_pago} ({payment.estado})</p>) : <p>No hay pagos cargados</p>}
      </DetailCard>
      {event.observaciones && <DetailCard title="Observaciones"><p>{event.observaciones}</p></DetailCard>}
    </div>
    {canRespond && <div className="action-row">
      <button className="button" onClick={() => { setAmount(''); setAction('accept') }}>Confirmar solicitud</button>
      <button className="button button-danger" onClick={() => setAction('reject')}>Descartar solicitud</button>
    </div>}
    {action && <div className="modal-backdrop" role="presentation">
      <form className="platform-card action-modal" onSubmit={respond} role="dialog" aria-modal="true" aria-labelledby="response-title">
        <h3 id="response-title">{action === 'accept' ? 'Confirmar solicitud' : 'Descartar solicitud'}</h3>
        {action === 'accept' ? <>
          <p>La seña se registrará como un pago recibido. Total del evento: {formatCurrency.format(Number(event.monto_total))}.</p>
          <label>Seña<input autoFocus type="number" min="0.01" max={event.monto_total} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required /></label>
          <label>Medio de pago<select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}><option value="transferencia">Transferencia</option><option value="efectivo">Efectivo</option><option value="tarjeta">Tarjeta</option></select></label>
        </> : <label>Motivo (opcional)<textarea autoFocus maxLength="500" value={reason} onChange={(e) => setReason(e.target.value)} /></label>}
        <div className="action-row">
          <button type="button" className="button button-secondary" onClick={() => setAction('')}>Cancelar</button>
          <button className={action === 'accept' ? 'button' : 'button button-danger'}>Confirmar</button>
        </div>
      </form>
    </div>}
    <button className="button button-secondary button-small" onClick={() => navigate('/panel/solicitudes')}>Volver al listado</button>
  </section>
}

function DetailCard({ title, children }) {
  return <article className="platform-card detail-card"><h3>{title}</h3>{children}</article>
}

const CATALOG_SECTIONS = [
  { key: 'tipos-evento', title: 'Propuestas', price: 'precio_base', priceLabel: 'Precio base', fields: ['nombre', 'descripcion', 'precio_base'] },
  { key: 'espacios', title: 'Espacios', price: 'precio_adicional', priceLabel: 'Precio adicional', fields: ['nombre', 'descripcion', 'capacidad', 'precio_adicional'] },
  { key: 'servicios', title: 'Servicios', price: 'precio', priceLabel: 'Precio', fields: ['nombre', 'descripcion', 'precio'] },
]
const FIELD_LABELS = { nombre: 'Nombre', descripcion: 'Descripción', capacidad: 'Capacidad', precio_base: 'Precio base', precio_adicional: 'Precio adicional', precio: 'Precio' }

function emptyValues(section) {
  return Object.fromEntries(section.fields.map((field) => [field, '']))
}

export function CatalogManager() {
  const { api, user } = useSession()
  const [selected, setSelected] = useState(CATALOG_SECTIONS[0].key)
  const [itemsByType, setItemsByType] = useState({})
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [loadedVersion, setLoadedVersion] = useState(-1)

  const section = CATALOG_SECTIONS.find((item) => item.key === selected)
  useEffect(() => {
    let active = true
    Promise.all(CATALOG_SECTIONS.map((item) => api(`/catalogos/${item.key}`)))
      .then((results) => {
        if (active) {
          setItemsByType(Object.fromEntries(CATALOG_SECTIONS.map((item, index) => [item.key, results[index]])))
          setError('')
        }
      })
      .catch((failure) => { if (active) setError(failure.message || 'No se pudo cargar el catálogo.') })
      .finally(() => { if (active) setLoadedVersion(refreshVersion) })
    return () => { active = false }
  }, [api, refreshVersion])

  function startCreate() {
    setEditing({ id: null, initial: {} })
    setForm(emptyValues(section))
  }
  function startEdit(item) {
    const values = Object.fromEntries(section.fields.map((field) => [field, item[field] ?? '']))
    setEditing({ id: item.id_tipo_evento || item.id_espacio || item.id_servicio, initial: values })
    setForm(values)
  }
  function closeForm() { setEditing(null); setError('') }

  async function save(event) {
    event.preventDefault()
    const required = section.fields.filter((key) => key !== 'descripcion')
    if (required.some((key) => String(form[key] ?? '').trim() === '')) {
      setError('Completá todos los campos obligatorios.')
      return
    }
    let body
    if (editing.id === null) {
      body = { ...form }
      if (!body.descripcion?.trim()) delete body.descripcion
    } else {
      body = Object.fromEntries(section.fields
        .filter((key) => String(form[key] ?? '') !== String(editing.initial[key] ?? ''))
        .map((key) => [key, form[key]]))
      if (Object.keys(body).length === 0) {
        setError('No hay cambios para guardar.')
        return
      }
    }
    if ('capacidad' in body) body.capacidad = Number(body.capacidad)
    setSaving(true)
    setError('')
    try {
      await api(`/catalogos/${section.key}${editing.id === null ? '' : `/${editing.id}`}`, {
        method: editing.id === null ? 'POST' : 'PATCH',
        body,
      })
      setEditing(null)
      setRefreshVersion((value) => value + 1)
    } catch (failure) {
      setError(failure.status === 409 && failure.message.toLowerCase().includes('us')
        ? `${failure.message}. Podés editar el elemento en lugar de eliminarlo.`
        : failure.message || 'No se pudo guardar el elemento.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(item) {
    const id = item.id_tipo_evento || item.id_espacio || item.id_servicio
    if (!window.confirm(`¿Eliminar «${item.nombre}» del catálogo?`)) return
    try {
      setError('')
      await api(`/catalogos/${section.key}/${id}`, { method: 'DELETE' })
      setRefreshVersion((value) => value + 1)
    } catch (failure) {
      setError(failure.status === 409
        ? `${failure.message}. Si ya se usó en una solicitud, editá el elemento en lugar de eliminarlo.`
        : failure.message || 'No se pudo eliminar el elemento.')
    }
  }

  const canEdit = user?.rol === 'admin'
  const catalogEmpty = CATALOG_SECTIONS.filter((item) => !(itemsByType[item.key]?.length))

  return <section className="panel-content">
    <div className="section-title-row"><div><p className="eyebrow">Contenido público</p><h2>Catálogo</h2></div>{canEdit && <button className="button button-small" onClick={startCreate}>Agregar elemento</button>}</div>
    {catalogEmpty.length > 0 && loadedVersion === refreshVersion && <p className="notice">Faltan elementos en: {catalogEmpty.map((item) => item.title).join(', ')}. Sin un catálogo completo no podrás recibir solicitudes.</p>}
    <div className="tab-list" role="tablist" aria-label="Secciones del catálogo">
      {CATALOG_SECTIONS.map((item) => <button key={item.key} className={selected === item.key ? 'tab active' : 'tab'} role="tab" aria-selected={selected === item.key} onClick={() => { setSelected(item.key); setEditing(null); setError('') }}>{item.title}</button>)}
    </div>
    {error && <p className="notice notice-error" role="alert">{error}</p>}
    {loadedVersion !== refreshVersion ? <p className="notice">Cargando catálogo…</p>
      : !itemsByType[selected]?.length ? <p className="notice">No hay elementos en esta sección.</p>
        : <div className="catalog-grid">{itemsByType[selected].map((item) => {
          const id = item.id_tipo_evento || item.id_espacio || item.id_servicio
          return <article className="platform-card catalog-card" key={id}>
            <h3>{item.nombre}</h3><p>{item.descripcion || 'Sin descripción'}</p>
            {item.capacidad != null && <p>Capacidad: {item.capacidad}</p>}
            <strong>{formatCurrency.format(Number(item[section.price]))}</strong>
            {canEdit && <div className="action-row"><button className="button button-small button-secondary" onClick={() => startEdit(item)}>Editar</button><button className="button button-small button-danger" onClick={() => remove(item)}>Eliminar</button></div>}
          </article>
        })}</div>}
    {editing && <div className="modal-backdrop" role="presentation">
      <form className="platform-card action-modal" onSubmit={save} role="dialog" aria-modal="true">
        <h3>{editing.id === null ? `Agregar ${section.title.toLowerCase()}` : 'Editar elemento'}</h3>
        {section.fields.map((field) => <label key={field}>{FIELD_LABELS[field]}
          {field === 'descripcion' ? <textarea maxLength="255" value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} />
            : <input autoFocus={field === 'nombre'} type={field === 'capacidad' ? 'number' : field.startsWith('precio') || field === 'precio' ? 'number' : 'text'} min={field === 'capacidad' ? 1 : field.startsWith('precio') || field === 'precio' ? 0 : undefined} step={field.startsWith('precio') || field === 'precio' ? '0.01' : undefined} maxLength={field === 'nombre' ? 80 : undefined} value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} required={field !== 'descripcion'} />}
        </label>)}
        <div className="action-row"><button type="button" className="button button-secondary" onClick={closeForm}>Cancelar</button><button className="button" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button></div>
      </form>
    </div>}
  </section>
}
