export const experiences = [
  {
    id: 'essential',
    name: 'Esencial',
    price: 650000,
    description: 'Salón privado, equipo de sonido y personal de sala.',
  },
  {
    id: 'vip',
    name: 'VIP',
    price: 920000,
    description: 'Todo lo de Esencial, más barra premium y DJ durante el evento.',
  },
  {
    id: 'thematic',
    name: 'Temática',
    price: 1280000,
    description: 'Todo lo de VIP, más decoración temática y coordinador personal.',
  },
]

export const spaces = [
  {
    id: 'main',
    name: 'Salón principal',
    capacity: 20,
    price: 0,
    required: true,
    description: 'Siempre incluido en la propuesta.',
  },
  {
    id: 'lounge',
    name: 'Lounge VIP',
    capacity: 12,
    price: 180000,
    description: '+12 lugares para tener más espacio.',
  },
  {
    id: 'terrace',
    name: 'Terraza',
    capacity: 16,
    price: 140000,
    description: '+16 lugares al aire libre.',
  },
]

export const addOns = [
  {
    id: 'bar',
    name: 'Barra de tragos',
    type: 'perGuest',
    price: 18000,
    description: 'Clásicos y tragos de autor.',
    defaultSelected: true,
  },
  {
    id: 'food',
    name: 'Finger food',
    type: 'perGuest',
    price: 24000,
    description: 'Ocho piezas por persona.',
    defaultSelected: true,
  },
  {
    id: 'dj',
    name: 'DJ set extendido',
    type: 'fixed',
    price: 95000,
    description: 'Una hora extra de música.',
    defaultSelected: false,
  },
]

export const timeSlots = ['19:00', '20:00', '21:00', '22:00', '23:00']

function toLocalDateString(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getTodayDate() {
  return toLocalDateString(new Date())
}

export function getDefaultBookingDate() {
  const date = new Date()
  date.setDate(date.getDate() + 30)
  return toLocalDateString(date)
}

export const formatCurrency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

export function formatBookingDate(value) {
  if (!value) return 'A definir'
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'long' }).format(
    new Date(`${value}T12:00:00`),
  )
}
