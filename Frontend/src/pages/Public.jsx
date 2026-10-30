import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { formatCurrency, getDefaultBookingDate, getTodayDate, timeSlots } from '../data/catalog'
import { Gallery } from '../components/Gallery'
import { imageUrl, request } from '../services/api'
import { submitInquiry } from '../services/inquiryService'
import { calculateTotalEstimate } from '../utils/pricing'
import { estadoInfo } from '../utils/estados'

function Loading({ children = 'Cargando…' }) {
  return <p className="notice" role="status">{children}</p>
}

function ErrorNotice({ error }) {
  return <p className="notice notice-error" role="alert">{error}</p>
}

export function CompanyList() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    request('/empresas')
      .then(setCompanies)
      .catch((reason) => setError(reason.message || 'No se pudieron cargar las empresas.'))
      .finally(() => setLoading(false))
  }, [])

  return <main className="platform-wrap">
    <section className="platform-hero">
      <p className="eyebrow">Una noche. Cero reglas.</p>
      <h1>Elegí dónde empieza la celebración.</h1>
      <p>Conocé las propuestas disponibles y enviá una solicitud directamente a la empresa.</p>
      <Link className="text-link" to="/empresa/registro">¿Tenés una empresa? Registrala</Link>
    </section>
    {loading && <Loading>Buscando empresas habilitadas…</Loading>}
    {error && <ErrorNotice error={error} />}
    {!loading && !error && companies.length === 0 && <p className="notice">Todavía no hay empresas habilitadas.</p>}
    <section className="company-grid" aria-label="Empresas habilitadas">
      {companies.map((company) => <article className="platform-card company-card" key={company.id_empresa}>
        {company.id_portada && <img className="company-cover" src={imageUrl(company.id_portada)} alt="" loading="lazy" />}
        <span className="eyebrow">Propuesta disponible</span>
        <h2>{company.nombre}</h2>
        {company.descripcion && <p className="company-summary">{company.descripcion}</p>}
        {company.direccion && <p>{company.direccion}</p>}
        {company.email && <p>{company.email}</p>}
        {company.telefono && <p>{company.telefono}</p>}
        <Link className="button" to={`/empresas/${company.id_empresa}`}>Ver propuestas</Link>
      </article>)}
    </section>
  </main>
}

const initialContact = { nombre: '', apellido: '', homenajeado: '', email: '', telefono: '' }

export function CompanyBooking() {
  const { id } = useParams()
  const [catalog, setCatalog] = useState(null)
  const [catalogId, setCatalogId] = useState('')
  const [requestedCatalogId, setRequestedCatalogId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [experience, setExperience] = useState('')
  const [date, setDate] = useState(getDefaultBookingDate)
  const [time, setTime] = useState('21:00')
  const [duration, setDuration] = useState(4)
  const [guests, setGuests] = useState(18)
  const [selectedSpaces, setSelectedSpaces] = useState([])
  const [selectedServices, setSelectedServices] = useState({})
  const [contact, setContact] = useState(initialContact)
  const [submitted, setSubmitted] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    request(`/empresas/${id}/catalogo`)
      .then((result) => {
        if (!active) return
        setCatalog(result)
        setCatalogId(id)
        setError('')
        setSubmitted(null)
        setExperience(result.tipos_evento[0]?.nombre || '')
        setSelectedServices(Object.fromEntries(result.servicios.map((item) => [item.nombre, { enabled: false, cantidad: 18 }])))
      })
      .catch((reason) => {
        if (active) setError(reason.status === 404 ? 'La empresa ya no está disponible.' : reason.message)
      })
      .finally(() => {
        if (active) {
          setLoading(false)
          setRequestedCatalogId(id)
        }
      })
    return () => { active = false }
  }, [id])

  const selectedCapacity = useMemo(
    () => catalog?.espacios
      .filter((item) => selectedSpaces.includes(item.nombre))
      .reduce((sum, item) => sum + Number(item.capacidad), 0) || 0,
    [catalog, selectedSpaces],
  )
  const estimate = useMemo(() => catalog && calculateTotalEstimate({
    catalog, experienceName: experience, selectedSpaces, selectedServices, duration,
  }), [catalog, experience, selectedSpaces, selectedServices, duration])

  function toggleSpace(name) {
    setSelectedSpaces((current) => current.includes(name)
      ? current.filter((value) => value !== name)
      : [...current, name])
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (!selectedSpaces.length) {
      setError('Elegí al menos un espacio para continuar.')
      return
    }
    if (selectedCapacity < guests) {
      setError(`Los espacios seleccionados tienen capacidad para ${selectedCapacity} personas y son ${guests} invitados.`)
      return
    }
    if (!Number.isInteger(Number(guests)) || Number(guests) < 1 || Number(guests) > 5000) {
      setError('La cantidad de invitados debe estar entre 1 y 5000.')
      return
    }
    if (!Number.isInteger(Number(duration)) || Number(duration) < 1 || Number(duration) > 24) {
      setError('La duración debe ser de entre 1 y 24 horas.')
      return
    }
    if (!contact.nombre.trim()) {
      setError('Ingresá tu nombre.')
      return
    }
    if (!contact.apellido.trim()) {
      setError('Ingresá tu apellido.')
      return
    }
    if (!contact.homenajeado.trim()) {
      setError('Ingresá el nombre de la persona agasajada.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) {
      setError('Ingresá un email válido.')
      return
    }
    const phone = contact.telefono.trim()
    const phoneDigits = phone.replace(/\D/g, '')
    if (!/^\+?[\d\s().-]+$/.test(phone) || phoneDigits.length < 7 || phoneDigits.length > 15) {
      setError('Ingresá un número de WhatsApp válido con código de país, por ejemplo +54 9 11 0000 0000.')
      return
    }
    setSubmitting(true)
    const body = {
      id_empresa: Number(id),
      experiencia: experience,
      fecha: date,
      hora_inicio: time,
      duracion_horas: Number(duration),
      invitados: Number(guests),
      espacios: selectedSpaces,
      servicios: Object.entries(selectedServices)
        .filter(([, service]) => service.enabled && Number(service.cantidad) > 0)
        .map(([nombre, service]) => ({ nombre, cantidad: Number(service.cantidad) })),
      contacto: Object.fromEntries(Object.entries(contact).map(([key, value]) => [key, value.trim()])),
    }
    try {
      const result = await submitInquiry(body)
      setSubmitted(result)
    } catch (reason) {
      if (reason.status === 404) setError('La empresa ya no está disponible.')
      else if (reason.status === 409) setError(reason.message)
      else if (reason.status === 400 && reason.detalles?.length) {
        setError(reason.detalles.map((detail) => `${detail.campo}: ${detail.mensaje}`).join(' · '))
      } else setError(reason.message || 'No se pudo enviar la solicitud. Intentá nuevamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || requestedCatalogId !== id) return <main className="platform-wrap"><Loading>Cargando catálogo…</Loading></main>
  if (error && catalogId !== id) return <main className="platform-wrap"><ErrorNotice error={error} /><Link to="/">Volver a empresas</Link></main>
  if (!catalog || catalogId !== id) return null

  return <main className="platform-wrap">
    <div className="page-heading">
      <Link to="/" className="text-link">← Todas las empresas</Link>
      <p className="eyebrow">Propuesta para celebrar</p>
      <h1>{catalog.empresa.nombre}</h1>
      {catalog.empresa.descripcion && <p className="company-description">{catalog.empresa.descripcion}</p>}
      {(catalog.empresa.direccion || catalog.empresa.telefono || catalog.empresa.email) && <p className="muted">
        {[catalog.empresa.direccion, catalog.empresa.telefono, catalog.empresa.email].filter(Boolean).join(' · ')}
      </p>}
      <p>Elegí una propuesta, los espacios y servicios. La empresa revisará tu solicitud.</p>
    </div>
    <Gallery images={catalog.empresa.imagenes} label={catalog.empresa.nombre} />
    {submitted ? <section className="platform-card success-card" role="status">
      <p className="eyebrow">Solicitud enviada</p>
      <h2>¡Gracias! La empresa recibió tu solicitud.</h2>
      <p>Tu solicitud #{submitted.id_evento} está en estado <span className={`status-pill status-${estadoInfo(submitted.estado).color}`}>{estadoInfo(submitted.estado).label}</span>. Todavía no es una confirmación.</p>
      <strong className="price-large">{formatCurrency.format(Number(submitted.monto_total))}</strong>
      <p>Este es el importe calculado por el servidor.</p>
      <button className="button button-secondary" onClick={() => setSubmitted(null)}>Enviar otra solicitud</button>
    </section> : <form className="platform-card booking-card" onSubmit={submit}>
      {error && <ErrorNotice error={error} />}
      <fieldset className="form-section">
        <legend>1. Elegí la propuesta</legend>
        <div className="choice-grid">
          {catalog.tipos_evento.map((item) => <label className="choice-card" key={item.id_tipo_evento}>
            <input type="radio" name="experience" value={item.nombre} checked={experience === item.nombre} onChange={() => setExperience(item.nombre)} required />
            <strong>{item.nombre}</strong><span>{item.descripcion}</span>
            <b>{formatCurrency.format(Number(item.precio_base))}</b>
          </label>)}
        </div>
      </fieldset>
      <fieldset className="form-section">
        <legend>2. Fecha, horario y grupo</legend>
        <div className="field-grid">
          <label>Fecha<input type="date" min={getTodayDate()} value={date} onChange={(event) => setDate(event.target.value)} required /></label>
          <label>Hora de inicio<select value={time} onChange={(event) => setTime(event.target.value)}>{timeSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}</select></label>
          <label>Duración (horas)<input type="number" min="1" max="24" value={duration} onChange={(event) => setDuration(event.target.value)} required /></label>
          <label>Invitados<input type="number" min="1" max="5000" value={guests} onChange={(event) => {
            const value = Number(event.target.value)
            setGuests(event.target.value)
            setSelectedServices((current) => Object.fromEntries(Object.entries(current).map(([name, service]) => [
              name, { ...service, cantidad: Number(service.cantidad) === Number(guests) ? value : service.cantidad },
            ])))
          }} required /></label>
        </div>
      </fieldset>
      <fieldset className="form-section">
        <legend>3. Espacios</legend>
        <div className="option-list">
          {catalog.espacios.map((item) => <label className="option-row" key={item.id_espacio}>
            <input type="checkbox" checked={selectedSpaces.includes(item.nombre)} onChange={() => toggleSpace(item.nombre)} />
            <span><strong>{item.nombre}</strong><small>{item.descripcion} · Capacidad {item.capacidad}</small>
              <Gallery images={item.imagenes} label={item.nombre} size="small" /></span>
            <b>{formatCurrency.format(Number(item.precio_adicional))}</b>
          </label>)}
        </div>
        <p className={selectedCapacity < Number(guests) ? 'capacity-warning' : 'capacity-ok'}>
          Capacidad seleccionada: {selectedCapacity} / {guests || 0} invitados
        </p>
      </fieldset>
      <fieldset className="form-section">
        <legend>4. Servicios opcionales</legend>
        <div className="option-list">
          {catalog.servicios.map((item) => <label className="option-row" key={item.id_servicio}>
            <input aria-label={`Incluir ${item.nombre}`} type="checkbox" checked={selectedServices[item.nombre]?.enabled || false} onChange={(event) => setSelectedServices((current) => ({ ...current, [item.nombre]: { ...current[item.nombre], enabled: event.target.checked } }))} />
            <span><strong>{item.nombre}</strong><small>{item.descripcion} · {formatCurrency.format(Number(item.precio))} por unidad</small></span>
            <input aria-label={`Cantidad de ${item.nombre}`} type="number" min="1" max="5000" value={selectedServices[item.nombre]?.cantidad ?? guests} onChange={(event) => setSelectedServices((current) => ({ ...current, [item.nombre]: { ...current[item.nombre], cantidad: event.target.value } }))} disabled={!selectedServices[item.nombre]?.enabled} />
            <small>unidades</small>
          </label>)}
        </div>
      </fieldset>
      <fieldset className="form-section">
        <legend>5. Tus datos</legend>
        <div className="field-grid">
          <label>Nombre<input maxLength="80" value={contact.nombre} onChange={(event) => setContact({ ...contact, nombre: event.target.value })} required /></label>
          <label>Apellido<input maxLength="80" value={contact.apellido} onChange={(event) => setContact({ ...contact, apellido: event.target.value })} required /></label>
          <label>Persona homenajeada<input maxLength="100" value={contact.homenajeado} onChange={(event) => setContact({ ...contact, homenajeado: event.target.value })} required /></label>
          <label>Email<input type="email" maxLength="150" value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} required /></label>
          <label>Teléfono<input type="tel" maxLength="30" value={contact.telefono} onChange={(event) => setContact({ ...contact, telefono: event.target.value })} required /></label>
        </div>
      </fieldset>
      <aside className="estimate-box">
        <span>Estimación · el importe final lo calcula el servidor</span>
        <strong>{formatCurrency.format(estimate?.total || 0)}</strong>
      </aside>
      <button className="button" disabled={submitting || !selectedSpaces.length || selectedCapacity < Number(guests) || !date || Number(duration) < 1 || Number(guests) < 1}>
        {submitting ? 'Enviando solicitud…' : 'Enviar solicitud'}
      </button>
      <p className="muted">Enviar la solicitud no confirma una reserva ni compromete los espacios.</p>
    </form>}
  </main>
}
