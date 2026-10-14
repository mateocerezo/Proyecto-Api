import { useEffect, useMemo, useRef, useState } from 'react'
import heroImage from './assets/hero-night-bar.png'
import {
  addOns,
  experiences,
  formatBookingDate,
  formatCurrency,
  getDefaultBookingDate,
  getTodayDate,
  spaces,
  timeSlots,
} from './data/catalog'
import { submitInquiry } from './services/inquiryService'
import { calculateTotalEstimate } from './utils/pricing'
import './App.css'

const initialSpaces = { main: true, lounge: false, terrace: false }
const initialAddOns = { bar: true, food: true, dj: false }
const initialContact = {
  firstName: '',
  lastName: '',
  honoree: '',
  email: '',
  phone: '',
}

function App() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('noche-brava-theme') === 'light' ? 'light' : 'dark'
    } catch {
      return 'dark'
    }
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const [experienceId, setExperienceId] = useState('vip')
  const [date, setDate] = useState(getDefaultBookingDate)
  const [time, setTime] = useState('21:00')
  const [guests, setGuests] = useState(18)
  const [duration, setDuration] = useState(4)
  const [selectedSpaces, setSelectedSpaces] = useState(initialSpaces)
  const [selectedAddOns, setSelectedAddOns] = useState(initialAddOns)
  const [contact, setContact] = useState(initialContact)
  const [errors, setErrors] = useState({})
  const [formMessage, setFormMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitted, setSubmitted] = useState(null)

  const dialogRef = useRef(null)
  const closeButtonRef = useRef(null)
  const triggerRef = useRef(null)

  const experience = experiences.find((item) => item.id === experienceId)
  const capacity = spaces.reduce(
    (total, space) => total + (selectedSpaces[space.id] ? space.capacity : 0),
    0,
  )
  const quote = useMemo(
    () =>
      calculateTotalEstimate({
        experienceId,
        guests,
        duration,
        selectedSpaces,
        selectedAddOns,
      }),
    [experienceId, guests, duration, selectedSpaces, selectedAddOns],
  )

  useEffect(() => {
    document.body.dataset.theme = theme
    try {
      localStorage.setItem('noche-brava-theme', theme)
    } catch {
      // Theme remains usable for this page view if storage is unavailable.
    }
  }, [theme])

  useEffect(() => {
    if (!dialogOpen) return undefined

    const selector =
      'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    const dialog = dialogRef.current
    const focusable = () =>
      Array.from(dialog?.querySelectorAll(selector) ?? []).filter(
        (element) => !element.disabled,
      )

    closeButtonRef.current?.focus()
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setDialogOpen(false)
        return
      }
      if (event.key !== 'Tab') return

      const items = focusable()
      if (!items.length) {
        event.preventDefault()
        return
      }
      if (event.shiftKey && document.activeElement === items[0]) {
        event.preventDefault()
        items[items.length - 1].focus()
      } else if (!event.shiftKey && document.activeElement === items[items.length - 1]) {
        event.preventDefault()
        items[0].focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [dialogOpen])

  useEffect(() => {
    if (dialogOpen) return
    triggerRef.current?.focus()
  }, [dialogOpen])

  function updateContact(event) {
    const { name, value } = event.target
    setContact((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
  }

  function validate() {
    const nextErrors = {}
    if (capacity < guests) {
      nextErrors.capacity = `Faltan ${guests - capacity} lugares. Sumá otro espacio para continuar.`
    }
    if (!contact.firstName.trim()) nextErrors.firstName = 'Ingresá tu nombre.'
    if (!contact.lastName.trim()) nextErrors.lastName = 'Ingresá tu apellido.'
    if (!contact.honoree.trim()) nextErrors.honoree = 'Ingresá el nombre de la persona agasajada.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) {
      nextErrors.email = 'Ingresá un email válido.'
    }
    const phone = contact.phone.trim()
    const phoneDigits = phone.replace(/\D/g, '')
    if (!/^\+?[\d\s().-]+$/.test(phone) || phoneDigits.length < 7 || phoneDigits.length > 15) {
      nextErrors.phone = 'Ingresá un número de WhatsApp válido con código de país, por ejemplo +54 9 11 0000 0000.'
    }
    return nextErrors
  }

  function focusError(field) {
    const target = document.getElementById(field === 'capacity' ? 'capacity-status' : field)
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    target?.focus?.()
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      setFormMessage('Revisá los datos indicados antes de enviar la consulta.')
      focusError(Object.keys(nextErrors)[0])
      return
    }

    const payload = {
      experience: { id: experience.id, name: experience.name },
      date,
      time,
      duration,
      guests,
      spaces: spaces.filter((space) => selectedSpaces[space.id]).map((space) => space.id),
      addOns: addOns.filter((addon) => selectedAddOns[addon.id]).map((addon) => addon.id),
      contact: { ...contact },
      total: quote.total,
    }

    triggerRef.current = document.activeElement
    setSubmitting(true)
    setFormMessage('')
    try {
      await submitInquiry(payload)
      setSubmitted(payload)
      setDialogOpen(true)
    } catch {
      setFormMessage('No se pudo registrar la consulta. Intentá nuevamente.')
    } finally {
      setSubmitting(false)
    }
  }

  function toggleSpace(id) {
    if (id === 'main') return
    setSelectedSpaces((current) => ({ ...current, [id]: !current[id] }))
  }

  function toggleAddOn(id) {
    setSelectedAddOns((current) => ({ ...current, [id]: !current[id] }))
  }

  function closeDialog() {
    setDialogOpen(false)
  }

  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <a className="brand" href="#inicio" aria-label="Noche Brava, inicio">
            <span className="brand-mark">NB</span>
            <span>Noche Brava</span>
          </a>
          <nav className={`main-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Navegación principal">
            <a href="#experiencias" onClick={() => setMenuOpen(false)}>Experiencias</a>
            <a href="#salon" onClick={() => setMenuOpen(false)}>El salón</a>
            <a href="#configurador" onClick={() => setMenuOpen(false)}>Reserva</a>
          </nav>
          <div className="header-actions">
            <button
              className="icon-button theme-toggle"
              type="button"
              aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
              aria-pressed={theme === 'light'}
              onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
            >
              {theme === 'dark' ? '☼' : '☾'}
            </button>
            <a className="button button-small header-cta" href="#configurador">Organizar mi noche</a>
            <button
              className="icon-button menu-toggle"
              type="button"
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((current) => !current)}
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>

      <main id="inicio">
        <section className="hero-section">
          <div className="container hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">Una noche. Cero reglas.</p>
              <h1>La última gran noche empieza aquí.</h1>
              <p className="hero-intro">
                Una casa nocturna privada para celebrar a su manera. Nosotros nos ocupamos
                de cada detalle; ustedes, de la historia que van a contar.
              </p>
              <div className="hero-actions">
                <a className="button" href="#configurador">Diseñar mi despedida</a>
                <a className="text-link" href="#experiencias">Ver experiencias <span aria-hidden="true">↘</span></a>
              </div>
              <div className="social-proof">
                <div className="rating" aria-label="Calificación: 4,9 de 5">
                  <span className="rating-number">4,9</span>
                  <span className="stars" aria-hidden="true">★★★★★</span>
                </div>
                <span className="proof-caption">Más de 240 noches inolvidables</span>
                <div className="avatar-stack" aria-hidden="true">
                  <span>MC</span><span>AN</span><span>RL</span>
                </div>
              </div>
            </div>
            <figure className="hero-visual">
              <img
                src={heroImage}
                alt="Bar privado de noche, con barra iluminada en violeta y estantes de bebidas"
              />
              <div className="hero-shade" aria-hidden="true" />
              <figcaption className="photo-credit">Una casa, solo para ustedes.</figcaption>
              <span className="availability-badge"><i /> Próximas fechas disponibles</span>
              <div className="hero-facts">
                <span>360 m²</span><span>Hasta 40 personas</span><span>Sonido profesional</span>
              </div>
            </figure>
          </div>
        </section>

        <section className="benefits" aria-label="Beneficios">
          <div className="container benefits-inner">
            <span>Privacidad total</span><i>·</i><span>Todo organizado</span><i>·</i>
            <span>Sin sorpresas en el precio</span><i>·</i><span>Una noche bien de ustedes</span>
          </div>
        </section>

        <section className="section experiences-section" id="experiencias">
          <div className="container">
            <p className="kicker">01 <span>Elegí tu experiencia</span></p>
            <div className="section-heading">
              <h2>Tres formas de vivir una noche que no se repite.</h2>
              <p>Elegí el punto de partida. Después podés ajustar cada detalle.</p>
            </div>
            <div className="experience-grid">
              {experiences.map((item, index) => {
                const active = experienceId === item.id
                return (
                  <button
                    className={`experience-card ${active ? 'is-active' : ''}`}
                    type="button"
                    key={item.id}
                    aria-pressed={active}
                    onClick={() => setExperienceId(item.id)}
                  >
                    <span className="experience-number">0{index + 1}</span>
                    <span className="selection-mark" aria-hidden="true">{active ? '✓' : '+'}</span>
                    <h3>{item.name}</h3>
                    <strong className="experience-price">{formatCurrency.format(item.price)}</strong>
                    <p>{item.description}</p>
                    <span className="card-select">{active ? 'Experiencia elegida' : 'Elegir experiencia'}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        <section className="section configurator-section" id="configurador">
          <div className="container">
            <div className="configurator-intro">
              <p className="kicker">02 <span>Tu noche, a medida</span></p>
              <h2>Armemos el plan.</h2>
            </div>
            <div className="configurator-layout">
              <form className="booking-form" id="bookingForm" onSubmit={handleSubmit} noValidate>
                <fieldset className="form-step">
                  <legend><span>01</span> Fecha y hora</legend>
                  <div className="field-grid">
                    <div className="field">
                      <label htmlFor="eventDate">Fecha</label>
                      <input
                        id="eventDate"
                        type="date"
                        min={getTodayDate()}
                        value={date}
                        onChange={(event) => setDate(event.target.value)}
                        required
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="eventTime">Horario de inicio</label>
                      <select id="eventTime" value={time} onChange={(event) => setTime(event.target.value)}>
                        {timeSlots.map((slot) => <option key={slot} value={slot}>{slot} hs</option>)}
                      </select>
                    </div>
                  </div>
                </fieldset>

                <fieldset className="form-step">
                  <legend><span>02</span> Grupo y duración</legend>
                  <div className="field-grid">
                    <div className="field">
                      <label htmlFor="guests">Invitados</label>
                      <div className="stepper">
                        <button type="button" aria-label="Quitar una persona" onClick={() => setGuests((value) => Math.max(8, value - 1))}>−</button>
                        <output id="guests">{guests} <small>personas</small></output>
                        <button type="button" aria-label="Sumar una persona" onClick={() => setGuests((value) => Math.min(40, value + 1))}>+</button>
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor="duration">Duración</label>
                      <div className="stepper">
                        <button type="button" aria-label="Quitar una hora" onClick={() => setDuration((value) => Math.max(3, value - 1))}>−</button>
                        <output id="duration">{duration} <small>horas</small></output>
                        <button type="button" aria-label="Sumar una hora" onClick={() => setDuration((value) => Math.min(8, value + 1))}>+</button>
                      </div>
                    </div>
                  </div>
                </fieldset>

                <fieldset className="form-step">
                  <legend><span>03</span> Espacios</legend>
                  <div className="choice-list">
                    {spaces.map((space) => {
                      const active = Boolean(selectedSpaces[space.id])
                      return (
                        <button
                          className={`choice-row ${active ? 'is-selected' : ''}`}
                          type="button"
                          key={space.id}
                          aria-pressed={active}
                          disabled={space.required}
                          onClick={() => toggleSpace(space.id)}
                        >
                          <span className="choice-check" aria-hidden="true">{active ? '✓' : '+'}</span>
                          <span className="choice-copy"><strong>{space.name}</strong><small>{space.description}</small></span>
                          <span className="choice-price">{space.price ? formatCurrency.format(space.price) : 'Incluido'}</span>
                        </button>
                      )
                    })}
                  </div>
                  <p
                    className={`capacity-status ${capacity < guests ? 'is-invalid' : ''}`}
                    id="capacity-status"
                    tabIndex="-1"
                    aria-live="polite"
                  >
                    {capacity >= guests
                      ? `✓ Capacidad seleccionada: ${capacity} personas`
                      : `Faltan ${guests - capacity} lugares`}
                  </p>
                  {errors.capacity && <p className="field-error">{errors.capacity}</p>}
                </fieldset>

                <fieldset className="form-step">
                  <legend><span>04</span> Adicionales</legend>
                  <div className="choice-list">
                    {addOns.map((addon) => {
                      const active = Boolean(selectedAddOns[addon.id])
                      return (
                        <button
                          className={`choice-row ${active ? 'is-selected' : ''}`}
                          type="button"
                          key={addon.id}
                          aria-pressed={active}
                          onClick={() => toggleAddOn(addon.id)}
                        >
                          <span className="choice-check" aria-hidden="true">{active ? '✓' : '+'}</span>
                          <span className="choice-copy"><strong>{addon.name}</strong><small>{addon.description}</small></span>
                          <span className="choice-price">
                            {formatCurrency.format(addon.price)}{addon.type === 'perGuest' ? ' / persona' : ' / evento'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </fieldset>

                <fieldset className="form-step">
                  <legend><span>05</span> Datos de contacto</legend>
                  <p className="privacy-note">Usamos estos datos solo para contactarte con la propuesta.</p>
                  <div className="field-grid contact-grid">
                    <ContactField id="firstName" label="Nombre" value={contact.firstName} error={errors.firstName} onChange={updateContact} placeholder="Tu nombre" />
                    <ContactField id="lastName" label="Apellido" value={contact.lastName} error={errors.lastName} onChange={updateContact} placeholder="Tu apellido" />
                    <ContactField id="honoree" label="Persona agasajada" value={contact.honoree} error={errors.honoree} onChange={updateContact} placeholder="¿A quién celebramos?" />
                    <ContactField id="email" label="Email" type="email" value={contact.email} error={errors.email} onChange={updateContact} placeholder="nombre@ejemplo.com" />
                    <ContactField id="phone" label="WhatsApp" type="tel" value={contact.phone} error={errors.phone} onChange={updateContact} placeholder="+54 9 11 0000 0000" />
                  </div>
                </fieldset>
              </form>

              <aside className="summary-card" aria-label="Resumen de presupuesto">
                <p className="summary-kicker">Tu propuesta</p>
                <h3>Una noche a medida.</h3>
                <dl className="summary-list">
                  <div><dt>Experiencia</dt><dd>{experience.name}</dd></div>
                  <div><dt>Fecha</dt><dd>{formatBookingDate(date)}</dd></div>
                  <div><dt>Horario</dt><dd>{time} hs</dd></div>
                  <div><dt>Duración</dt><dd>{duration} horas</dd></div>
                  <div><dt>Invitados</dt><dd>{guests} personas</dd></div>
                  <div><dt>Espacios extra</dt><dd>{quote.optionalSpacesCount}</dd></div>
                  <div><dt>Adicionales</dt><dd>{quote.addOnsCount}</dd></div>
                  {quote.additionalHours > 0 && (
                    <div><dt>Horas extra</dt><dd>{quote.additionalHours}</dd></div>
                  )}
                </dl>
                <div className="summary-total">
                  <span>Precio estimado</span>
                  <strong>{formatCurrency.format(quote.total)}</strong>
                </div>
                <p className="tax-note">Impuestos incluidos</p>
                <button
                  className="button submit-button"
                  type="submit"
                  form="bookingForm"
                  disabled={submitting}
                >
                  {submitting ? 'Enviando…' : 'Enviar consulta'}
                  <span aria-hidden="true">↗</span>
                </button>
                <p className="submit-note">Sin pago ahora. Te confirmaremos la fecha en menos de 24 horas.</p>
                {formMessage && <p className="form-message" role="alert">{formMessage}</p>}
              </aside>
            </div>
          </div>
        </section>

        <section className="closing-section" id="salon">
          <div className="container closing-inner">
            <p className="kicker">Nosotros ponemos el lugar</p>
            <h2>Ustedes ponen<br />las historias.</h2>
            <a className="closing-cta" href="#configurador" aria-label="Empezar a organizar la noche">↗</a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <div>
            <a className="brand" href="#inicio"><span className="brand-mark">NB</span><span>Noche Brava</span></a>
            <p>Despedidas privadas, diseñadas en Buenos Aires.</p>
          </div>
          <nav aria-label="Enlaces del pie de página">
            <a href="#experiencias">Experiencias</a>
            <a href="#configurador">Reservar</a>
            <a href="#configurador">Contacto</a>
            <a href="#aviso">Aviso de prototipo</a>
          </nav>
          <p id="aviso" className="prototype-note">Prototipo · sin pagos ni reservas reales</p>
        </div>
      </footer>

      {dialogOpen && submitted && (
        <div
          className="dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog()
          }}
        >
          <section
            className="success-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="success-title"
            ref={dialogRef}
          >
            <button
              className="dialog-close"
              type="button"
              aria-label="Cerrar"
              ref={closeButtonRef}
              onClick={closeDialog}
            >×</button>
            <span className="success-icon" aria-hidden="true">✓</span>
            <p className="summary-kicker">Consulta registrada</p>
            <h2 id="success-title">Esta noche promete.</h2>
            <div className="dialog-details">
              <span>{submitted.experience.name}</span>
              <span>{submitted.guests} invitados</span>
              <strong>{formatCurrency.format(submitted.total)}</strong>
            </div>
            <p>En la versión futura se creará un evento con estado “consultado”.</p>
            <button className="button" type="button" onClick={closeDialog}>Seguir explorando</button>
          </section>
        </div>
      )}
    </>
  )
}

function ContactField({ id, label, type = 'text', value, error, onChange, placeholder }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={id === 'firstName' ? 'given-name' : id === 'lastName' ? 'family-name' : id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        required
      />
      {error && <small className="field-error" id={`${id}-error`} role="alert">{error}</small>}
    </div>
  )
}

export default App
