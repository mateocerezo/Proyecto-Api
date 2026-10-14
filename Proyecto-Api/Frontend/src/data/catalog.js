export const experiences = [
  {
    id: 'essential',
    name: 'Esencial',
    price: 650000,
    summary: 'Salón privado, sonido, personal de sala y una noche sin fricciones.',
  },
  {
    id: 'vip',
    name: 'VIP',
    price: 920000,
    summary: 'Todo lo de Esencial + barra premium y DJ durante el evento.',
    featured: true,
  },
  {
    id: 'thematic',
    name: 'Temática',
    price: 1280000,
    summary: 'Todo lo de VIP + decoración temática y coordinador personal.',
  },
]

export const spaceCatalog = [
  {
    id: 'main',
    name: 'Salón principal',
    price: 0,
    capacity: 20,
    required: true,
    description: 'Incluido en el precio base.',
  },
  {
    id: 'lounge',
    name: 'Lounge VIP',
    price: 180000,
    capacity: 12,
    description: 'Amplía la zona de encuentro para más aire y descanso.',
  },
  {
    id: 'terrace',
    name: 'Terraza',
    price: 140000,
    capacity: 16,
    description: 'Más espacio para fotos, charla y ambientación exterior.',
  },
]

export const addOnCatalog = [
  {
    id: 'bar',
    name: 'Barra de tragos',
    pricePerGuest: 18000,
    description: 'Clásicos y de autor.',
    type: 'perGuest',
    defaultSelected: true,
  },
  {
    id: 'food',
    name: 'Finger food',
    pricePerGuest: 24000,
    description: 'Ocho piezas por persona.',
    type: 'perGuest',
    defaultSelected: true,
  },
  {
    id: 'dj',
    name: 'DJ set extendido',
    price: 95000,
    description: 'Una hora adicional de música.',
    type: 'fixed',
    defaultSelected: false,
  },
]

export const timeSlots = ['19:00', '20:00', '21:00', '22:00', '23:00']

export const getDefaultBookingDate = () => {
  const date = new Date()
  date.setDate(date.getDate() + 30)
  return date.toISOString().split('T')[0]
}

export const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})
