import { useEffect, useMemo, useRef, useState } from 'react'
import heroImage from './assets/hero-night-bar.png'
import {
  addOnCatalog,
  currencyFormatter,
  experiences,
  getDefaultBookingDate,
  spaceCatalog,
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
  honoreeName: '',
  email: '',
  phone: '',
}

function App() {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('noche-brava-theme')
    return savedTheme || 'dark'
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedExperience, setSelectedExperience] = useState('vip')
  const [selectedDate, setSelectedDate] = useState(getDefaultBookingDate())
  const [selectedHour, setSelectedHour] = useState('21:00')
  const [guestCount, setGuestCount] = useState(18)
  const [duration, setDuration] = useState(4)
  const [spaces, setSpaces] = useState(initialSpaces)
  const [addOns, setAddOns] = useState(initialAddOns)
  const [contact, setContact] = useState(initialContact)
  const [errors, setErrors] = useState({})
  const [summaryError, setSummaryError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submittedData, setSubmittedData] = useState(null)

  const modalTriggerRef = useRef(null)
  const dialogRef = useRef(null)
  const summaryRef = useRef(null)

  useEffect(() => {
    document.body.dataset.theme = theme
    localStorage.setItem('noche-brava-theme', theme)
  }, [theme])

  const selectedExperienceData =
    experiences.find((experience) => experience.id === selectedExperience) ?? experiences[1]

  const capacityTotal = spaceCatalog.reduce((total, space) => {
    if (space.id === 'main' || spaces[space.id]) {
      return total + space.capacity
    }
    return total
  }, 0)

  const quote = useMemo(
    () =>
      calculateTotalEstimate({
        experienceId: selectedExperience,
        guests: guestCount,
        duration,
        selectedSpaces: spaces,
        selectedAddOns: addOns,
      }),
    [selectedExperience, guestCount, duration, spaces, addOns],
  )

  const capacityMessage =
    capacityTotal >= guestCount
      ? `Capacidad seleccionada: ${capacityTotal} personas`
      : `Faltan ${guestCount - capacityTotal} lugares`

  const handleContactChange = (event) => {
    const { name, value } = event.target
    setContact((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
  }

  const handleSpaceToggle = (spaceId) => {
    if (spaceId === 'main') return

    setSpaces((current) => ({
      ...current,
      [spaceId]: !current[spaceId],
    }))
  }

  const handleAddOnToggle = (addonId) => {
    setAddOns((current) => ({
      ...current,
      [addonId]: !current[addonId],
    }))
  }

  const validateForm = () => {
    const nextErrors = {}

    if (capacityTotal < guestCount) {
      nextErrors.capacity = 'La capacidad seleccionada es insuficiente para el evento.'
    }

    if (!contact.firstName.trim()) {
      nextErrors.firstName = 'Ingresá el nombre del cliente.'
    }

    if (!contact.lastName.trim()) {
      nextErrors.lastName = 'Ingresá el apellido del cliente.'
    }

    if (!contact.honoreeName.trim()) {
      nextErrors.honoreeName = 'Ingresá el nombre de la persona agasajada.'
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
      nextErrors.email = 'Ingresá un email válido.'
    }

    if (!/^\+54\s?9?\s?11\s?\d{4}\s?\d{4}$/.test(contact.phone.trim())) {
      nextErrors.phone = 'Ingresá un WhatsApp argentino válido.'
    }

    return nextErrors
  }

  const scrollToError = (fieldName) => {
    const field = document.getElementById(fieldName)
    if (field) {
      field.scrollIntoView({ behavior: 'smooth', block: 'center' })
      field.focus()
    }
    summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const closeModal = () => {
    setIsModalOpen(false)
    requestAnimationFrame(() => {
      modalTriggerRef.current?.focus()
    })
  }

  useEffect(() => {
    if (!isModalOpen) return undefined

    const focusableSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    const focusableElements = Array.from(
      dialogRef.current?.querySelectorAll(focusableSelector) ?? [],
    )

    const firstElement = focusableElements[0]
    firstElement?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeModal()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return

      const currentElements = Array.from(
        dialogRef.current.querySelectorAll(focusableSelector),
      ).filter((element) => !element.disabled)

      if (!currentElements.length) {
        event.preventDefault()
        return
      }

      const first = currentElements[0]
      const last = currentElements[currentElements.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isModalOpen])

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nextErrors = validateForm()
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      setSummaryError('Revisá los datos del formulario antes de enviar la consulta.')
      const firstField = Object.keys(nextErrors)[0]
      scrollToError(firstField)
      return
    }

    const payload = {
      experience: selectedExperienceData.name,
      date: selectedDate,
      horario: selectedHour,
      duracion: duration,
      invitados: guestCount,
      espacios: spaceCatalog.filter((space) => space.id !== 'main' && spaces[space.id]),
      adicionales: addOnCatalog.filter((addon) => addOns[addon.id]),
      contacto: { ...contact },
      total: quote.total,
    }

    setSummaryError('')

    try {
      modalTriggerRef.current = document.activeElement
      await submitInquiry(payload)
      setSubmittedData(payload)
      setIsModalOpen(true)
    } catch {
      setSummaryError('La consulta no pudo enviarse. Intentá nuevamente.')
    }
  }

  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <a href="#top" className="brand" aria-label="Noche Brava inicio">
            <span className="brand-mark">NB</span>
            <span className="brand-name">Noche Brava</span>
          </a>

          <nav className={`main-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Navegación principal">
            <a href="#experiencias">Experiencias</a>
            <a href="#salon">El salón</a>
            <a href="#configurator">Reserva</a>
          </nav>

          <div className="header-actions">
            <button
              type="button"
              className="theme-toggle"
              aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
              aria-pressed={theme === 'light'}
              onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
            >
              {theme === 'dark' ? '☀' : '☾'}
            </button>

            <button type="button" className="nav-toggle" aria-label="Abrir menú" onClick={() => setMenuOpen((current) => !current)}>
              <span />
              <span />
              <span />
            </button>

            <a href="#configurator" className="primary-button desktop-only">
              Organizar mi noche
            </a>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="container hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">Una noche. Cero reglas.</p>
              <h1>La última gran noche empieza aquí.</h1>
              <p className="hero-text">
                Diseñamos despedidas de solteros con espacio, música y un clima que se siente
                exclusivo desde la primera copa.
              </p>

              <div className="cta-row">
                <a href="#configurator" className="primary-button">
                  Diseñar mi despedida
                </a>
                <a href="#experiencias" className="secondary-link">
                  Ver experiencias
                </a>
              </div>

              <div className="social-proof" aria-label="Opiniones de clientes">
                <div className="stars" aria-hidden="true">★★★★★</div>
                <div className="proof-copy">
                  <strong>4,9</strong>
                  <span>Más de 240 noches inolvidables</span>
                </div>
                <div className="avatars" aria-label="Clientes satisfechos">
                  <span>MC</span>
                  <span>AN</span>
                  <span>RL</span>
                </div>
              </div>
            </div>

            <div className="hero-visual" aria-label="Salón elegante con ambiente nocturno">
              <div className="hero-image-wrap">
                <img
                  src={heroImage}
                  alt="Bar nocturno con luces cálidas y estilo elegante para una despedida"
                />
                <div className="image-overlay" aria-hidden="true" />
                <div className="floating-badge">Próximas fechas disponibles</div>
                <div className="space-meta">
                  <span>360 m²</span>
                  <span>Hasta 40 personas</span>
                  <span>Sonido profesional</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="benefits-strip" aria-label="Beneficios">
          <div className="container benefits-inner">
            <span>Privacidad total</span>
            <span className="dot" aria-hidden="true">•</span>
            <span>Todo organizado</span>
            <span className="dot" aria-hidden="true">•</span>
            <span>Sin sorpresas en el precio</span>
            <span className="dot" aria-hidden="true">•</span>
            <span>Una noche bien de ustedes</span>
          </div>
        </section>

        <section id="experiencias" className="section experiences-section">
          <div className="container">
            <p className="section-kicker">01</p>
            <h2>Elegí tu experiencia</h2>
            <p className="section-lead">
              Tres formas de vivir una noche que no se repite.
            </p>

            <div className="experience-grid">
              {experiences.map((experience) => {
                const isActive = selectedExperience === experience.id

                return (
                  <button
                    key={experience.id}
                    type="button"
                    className={`experience-card ${isActive ? 'is-active' : ''}`}
                    onClick={() => setSelectedExperience(experience.id)}
                    aria-pressed={isActive}
                  >
                    <span className="radio-indicator" aria-hidden="true">
                      {isActive ? '●' : '○'}
                    </span>
                    <div className="card-topline">
                      <h3>{experience.name}</h3>
                      <span className="price-tag">{currencyFormatter.format(experience.price)}</span>
                    </div>
                    <p>{experience.summary}</p>
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        <section id="configurator" className="section configurator-section">
          <div className="container configurator-layout">
            <div className="configurator-form-wrapper">
              <div className="section-header compact">
                <p className="section-kicker">02</p>
                <h2>Configurá tu reserva</h2>
              </div>

              <form onSubmit={handleSubmit} className="booking-form">
                <div className="form-block">
                  <h3>Paso 1 — Fecha y hora</h3>
                  <div className="field-grid two-columns">
                    <div className="field">
                      <label htmlFor="eventDate">Fecha</label>
                      <input
                        id="eventDate"
                        type="date"
                        min={getDefaultBookingDate()}
                        value={selectedDate}
                        onChange={(event) => setSelectedDate(event.target.value)}
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="eventTime">Horario</label>
                      <select
                        id="eventTime"
                        value={selectedHour}
                        onChange={(event) => setSelectedHour(event.target.value)}
                      >
                        {timeSlots.map((slot) => (
                          <option key={slot} value={slot}>
                            {slot} hs
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-block">
                  <h3>Paso 2 — Grupo y duración</h3>
                  <div className="field-grid two-columns">
                    <div className="field">
                      <label>Invitados</label>
                      <div className="stepper" aria-label="Cantidad de invitados">
                        <button type="button" onClick={() => setGuestCount((current) => Math.max(8, current - 1))} aria-label="Restar invitado">
                          −
                        </button>
                        <span>{guestCount}</span>
                        <button type="button" onClick={() => setGuestCount((current) => Math.min(40, current + 1))} aria-label="Sumar invitado">
                          +
                        </button>
                      </div>
                    </div>

                    <div className="field">
                      <label>Duración</label>
                      <div className="stepper" aria-label="Duración del evento en horas">
                        <button type="button" onClick={() => setDuration((current) => Math.max(3, current - 1))} aria-label="Restar hora">
                          −
                        </button>
                        <span>{duration} hs</span>
                        <button type="button" onClick={() => setDuration((current) => Math.min(8, current + 1))} aria-label="Sumar hora">
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-block">
                  <h3>Paso 3 — Espacios</h3>
                  <div className="option-grid">
                    {spaceCatalog.map((space) => {
                      const isSelected = space.id === 'main' || spaces[space.id]
                      const isRequired = space.required

                      return (
                        <button
                          key={space.id}
                          type="button"
                          className={`option-tile ${isSelected ? 'is-selected' : ''}`}
                          aria-pressed={isSelected}
                          onClick={() => handleSpaceToggle(space.id)}
                          disabled={isRequired}
                        >
                          <div>
                            <strong>{space.name}</strong>
                            <span>{space.description}</span>
                          </div>
                          <span className="option-price">
                            {space.price === 0 ? 'Incluido' : currencyFormatter.format(space.price)}
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  <p className={`capacity-line ${capacityTotal < guestCount ? 'is-invalid' : ''}`}>
                    {capacityMessage}
                  </p>
                  {errors.capacity ? (
                    <p className="field-error" aria-live="polite">
                      {errors.capacity}
                    </p>
                  ) : null}
                </div>

                <div className="form-block">
                  <h3>Paso 4 — Adicionales</h3>
                  <div className="option-grid extras-grid">
                    {addOnCatalog.map((addon) => {
                      const isSelected = !!addOns[addon.id]
                      return (
                        <button
                          key={addon.id}
                          type="button"
                          className={`option-tile ${isSelected ? 'is-selected' : ''}`}
                          aria-pressed={isSelected}
                          onClick={() => handleAddOnToggle(addon.id)}
                        >
                          <div>
                            <strong>{addon.name}</strong>
                            <span>{addon.description}</span>
                          </div>
                          <span className="option-price">
                            {addon.type === 'perGuest'
                              ? `${currencyFormatter.format(addon.pricePerGuest)} por persona`
                              : currencyFormatter.format(addon.price)}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="form-block contact-block">
                  <h3>Paso 5 — Datos de la consulta</h3>
                  <p className="contact-note">
                    Los datos se usan solo para contactar al cliente con la propuesta.
                  </p>
                  <div className="field-grid two-columns">
                    <div className="field">
                      <label htmlFor="firstName">Nombre</label>
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        value={contact.firstName}
                        onChange={handleContactChange}
                        aria-invalid={Boolean(errors.firstName)}
                        aria-describedby={errors.firstName ? 'firstNameError' : undefined}
                        placeholder="Ej.: Sofía"
                      />
                      {errors.firstName ? (
                        <small id="firstNameError" className="field-error" aria-live="polite">
                          {errors.firstName}
                        </small>
                      ) : null}
                    </div>

                    <div className="field">
                      <label htmlFor="lastName">Apellido</label>
                      <input
                        id="lastName"
                        name="lastName"
                        type="text"
                        value={contact.lastName}
                        onChange={handleContactChange}
                        aria-invalid={Boolean(errors.lastName)}
                        aria-describedby={errors.lastName ? 'lastNameError' : undefined}
                        placeholder="Ej.: Martínez"
                      />
                      {errors.lastName ? (
                        <small id="lastNameError" className="field-error" aria-live="polite">
                          {errors.lastName}
                        </small>
                      ) : null}
                    </div>

                    <div className="field full-width">
                      <label htmlFor="honoreeName">Persona agasajada</label>
                      <input
                        id="honoreeName"
                        name="honoreeName"
                        type="text"
                        value={contact.honoreeName}
                        onChange={handleContactChange}
                        aria-invalid={Boolean(errors.honoreeName)}
                        aria-describedby={errors.honoreeName ? 'honoreeNameError' : undefined}
                        placeholder="Ej.: Tomás"
                      />
                      {errors.honoreeName ? (
                        <small id="honoreeNameError" className="field-error" aria-live="polite">
                          {errors.honoreeName}
                        </small>
                      ) : null}
                    </div>

                    <div className="field">
                      <label htmlFor="email">Email</label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        value={contact.email}
                        onChange={handleContactChange}
                        aria-invalid={Boolean(errors.email)}
                        aria-describedby={errors.email ? 'emailError' : undefined}
                        placeholder="mail@ejemplo.com"
                      />
                      {errors.email ? (
                        <small id="emailError" className="field-error" aria-live="polite">
                          {errors.email}
                        </small>
                      ) : null}
                    </div>

                    <div className="field">
                      <label htmlFor="phone">WhatsApp</label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={contact.phone}
                        onChange={handleContactChange}
                        aria-invalid={Boolean(errors.phone)}
                        aria-describedby={errors.phone ? 'phoneError' : undefined}
                        placeholder="+54 9 11 0000 0000"
                      />
                      {errors.phone ? (
                        <small id="phoneError" className="field-error" aria-live="polite">
                          {errors.phone}
                        </small>
                      ) : null}
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <aside className="summary-panel" ref={summaryRef}>
              <div className="summary-header">
                <p className="summary-kicker">Resumen</p>
                <h3>Tu propuesta</h3>
              </div>

              <dl className="summary-list">
                <div>
                  <dt>Experiencia</dt>
                  <dd>{selectedExperienceData.name}</dd>
                </div>
                <div>
                  <dt>Fecha</dt>
                  <dd>{selectedDate}</dd>
                </div>
                <div>
                  <dt>Horario</dt>
                  <dd>{selectedHour} hs</dd>
                </div>
                <div>
                  <dt>Duración</dt>
                  <dd>{duration} hs</dd>
                </div>
                <div>
                  <dt>Invitados</dt>
                  <dd>{guestCount}</dd>
                </div>
                <div>
                  <dt>Espacios</dt>
                  <dd>{spaceCatalog.filter((space) => space.id !== 'main' && spaces[space.id]).length}</dd>
                </div>
                <div>
                  <dt>Adicionales</dt>
                  <dd>{addOnCatalog.filter((addon) => addOns[addon.id]).length}</dd>
                </div>
              </dl>

              <div className="summary-total">
                <span>Precio estimado</span>
                <strong>{currencyFormatter.format(quote.total)}</strong>
              </div>

              <p className="tax-note">Impuestos incluidos</p>

              <button type="submit" className="submit-button" onClick={handleSubmit}>
                Enviar consulta
              </button>
              <p className="submit-note">Sin pago ahora. Te confirmaremos la fecha en menos de 24 horas.</p>

              {summaryError ? (
                <p className="summary-error" aria-live="assertive">
                  {summaryError}
                </p>
              ) : null}
            </aside>
          </div>
        </section>

        <section id="salon" className="section closing-section">
          <div className="container closing-container">
            <p className="section-kicker">Nosotros ponemos el lugar</p>
            <h2>Ustedes ponen las historias</h2>
            <button type="button" className="circular-cta" onClick={() => document.getElementById('configurator')?.scrollIntoView({ behavior: 'smooth' })} aria-label="Reservar una noche">
              →
            </button>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <div>
            <div className="brand footer-brand">
              <span className="brand-mark">NB</span>
              <span className="brand-name">Noche Brava</span>
            </div>
            <p>Despedidas privadas, diseñadas en Buenos Aires</p>
          </div>

          <nav className="footer-nav" aria-label="Enlaces del footer">
            <a href="#experiencias">Experiencias</a>
            <a href="#configurator">Reservar</a>
            <a href="#top">Contacto</a>
            <a href="#top">Aviso de prototipo</a>
          </nav>
        </div>
      </footer>

      {isModalOpen ? (
        <div className="modal-backdrop" onClick={(event) => event.target === event.currentTarget && closeModal()}>
          <div className="success-modal" role="dialog" aria-modal="true" aria-labelledby="successTitle" ref={dialogRef}>
            <button type="button" className="close-modal" onClick={closeModal} aria-label="Cerrar modal">
              ×
            </button>

            <div className="modal-badge" aria-hidden="true">✓</div>
            <p className="modal-kicker">Consulta registrada</p>
            <h3 id="successTitle">Esta noche promete.</h3>

            <div className="modal-summary">
              <span>{submittedData?.experience}</span>
              <span>{submittedData?.invitados} invitados</span>
              <strong>{currencyFormatter.format(submittedData?.total ?? 0)}</strong>
            </div>

            <p className="modal-copy">
              En la versión futura se creará un evento en estado "consultado".
            </p>

            <button type="button" className="primary-button" onClick={closeModal}>
              Seguir explorando
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default App
