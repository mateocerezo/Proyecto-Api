import { addOns, experiences, spaces } from '../data/catalog'

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api').replace(/\/$/, '')

// El backend identifica el catálogo por nombre y calcula los precios por su cuenta.
function toRequestBody({ experience, date, time, duration, guests, spaces: spaceIds, addOns: addOnIds, contact }) {
  return {
    experiencia: experiences.find((item) => item.id === experience.id).name,
    fecha: date,
    hora_inicio: time,
    duracion_horas: duration,
    invitados: guests,
    espacios: spaces.filter((space) => spaceIds.includes(space.id)).map((space) => space.name),
    servicios: addOns
      .filter((addon) => addOnIds.includes(addon.id))
      .map((addon) => ({ nombre: addon.name, cantidad: addon.type === 'perGuest' ? guests : 1 })),
    contacto: {
      nombre: contact.firstName.trim(),
      apellido: contact.lastName.trim(),
      homenajeado: contact.honoree.trim(),
      email: contact.email.trim(),
      telefono: contact.phone.trim(),
    },
  }
}

export async function submitInquiry(payload) {
  const response = await fetch(`${API_URL}/consultas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toRequestBody(payload)),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detalle = data.detalles?.map((item) => item.mensaje).join(' ')
    throw new Error([data.mensaje, detalle].filter(Boolean).join(': ') || `Error ${response.status}`)
  }

  return { ok: true, event: data, payload }
}
