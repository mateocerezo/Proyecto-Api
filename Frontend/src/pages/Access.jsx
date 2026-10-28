import { SignIn, SignUp, useUser } from '@clerk/react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ApiError } from '../services/api'
import { useSession } from '../session/useSession'

export function AccessPage({ mode }) {
  const isSignIn = mode === 'sign-in'
  return <main className="platform-wrap auth-page">
    <div className="page-heading">
      <p className="eyebrow">{isSignIn ? 'Panel privado' : 'Sumate a la plataforma'}</p>
      <h1>{isSignIn ? 'Ingresá a tu cuenta' : 'Creá tu cuenta'}</h1>
      <p>{isSignIn ? 'El acceso a tu panel se define según el estado de tu cuenta.' : 'Después del registro podrás dar de alta tu empresa.'}</p>
    </div>
    <section className="platform-card clerk-card">
      {isSignIn
        ? <SignIn routing="path" path="/ingresar" signUpUrl="/cuenta" forceRedirectUrl="/acceso" fallbackRedirectUrl="/acceso" />
        : <SignUp routing="path" path="/cuenta" signInUrl="/ingresar" forceRedirectUrl="/acceso" fallbackRedirectUrl="/acceso" />}
    </section>
  </main>
}

export function CompanyRegistration() {
  const { user } = useUser()
  const { api, refresh } = useSession()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    nombre: '',
    cuit: '',
    email: '',
    telefono: '',
    adminNombre: user?.firstName || '',
    adminApellido: user?.lastName || '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const body = {
      empresa: {
        nombre: form.nombre.trim(),
        cuit: form.cuit.trim(),
        email: form.email.trim(),
        ...(form.telefono.trim() ? { telefono: form.telefono.trim() } : {}),
      },
      admin: { nombre: form.adminNombre.trim(), apellido: form.adminApellido.trim() },
    }
    try {
      await api('/empresas/registro', { method: 'POST', body })
      refresh()
      navigate('/empresa/pendiente', { replace: true })
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 409) {
        refresh()
        setError(`${reason.message}. Si esta cuenta ya tiene una empresa, te redirigiremos al panel correspondiente.`)
      } else if (reason instanceof ApiError && reason.status === 400 && reason.detalles?.length) {
        setError(reason.detalles.map((item) => item.mensaje).join(' · '))
      } else {
        setError(reason.message || 'No se pudo registrar la empresa.')
      }
    } finally {
      setBusy(false)
    }
  }

  return <main className="platform-wrap">
    <section className="page-heading">
      <p className="eyebrow">Registro de empresa</p>
      <h1>Presentá tu propuesta.</h1>
      <p>La empresa quedará inactiva hasta que el administrador de la plataforma la apruebe.</p>
    </section>
    <form className="platform-card form-card" onSubmit={submit}>
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      <h2>Datos de la empresa</h2>
      <div className="field-grid">
        <label>Nombre comercial<input name="nombre" maxLength="80" value={form.nombre} onChange={update} required /></label>
        <label>CUIT<input name="cuit" value={form.cuit} onChange={update} placeholder="30-71234567-8" required /></label>
        <label>Email de la empresa<input name="email" type="email" maxLength="120" value={form.email} onChange={update} required /></label>
        <label>Teléfono (opcional)<input name="telefono" type="tel" maxLength="30" value={form.telefono} onChange={update} /></label>
      </div>
      <h2>Administrador de la empresa</h2>
      <div className="field-grid">
        <label>Nombre<input name="adminNombre" maxLength="80" value={form.adminNombre} onChange={update} required /></label>
        <label>Apellido<input name="adminApellido" maxLength="80" value={form.adminApellido} onChange={update} required /></label>
      </div>
      <button className="button" disabled={busy}>{busy ? 'Enviando…' : 'Enviar para aprobación'}</button>
    </form>
  </main>
}

export function PendingCompany() {
  const { api, refresh } = useSession()
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function verify() {
    setBusy(true)
    setMessage('')
    try {
      await api('/auth/me')
      refresh()
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 403) {
        setMessage(error.message || 'No se pudo verificar el estado.')
      } else {
        setMessage('La empresa todavía no está habilitada.')
      }
    } finally {
      setBusy(false)
    }
  }

  return <main className="platform-wrap">
    <section className="platform-card status-card">
      <p className="eyebrow">Solicitud recibida</p>
      <h1>Tu empresa está pendiente de aprobación o fue deshabilitada.</h1>
      <p>Cuando el administrador la habilite, podrás ingresar al panel con esta misma cuenta.</p>
      {message && <p className="notice" role="status">{message}</p>}
      <button className="button" onClick={verify} disabled={busy}>{busy ? 'Verificando…' : 'Volver a verificar'}</button>
      <p><Link className="text-link" to="/">Volver al inicio</Link></p>
    </section>
  </main>
}
