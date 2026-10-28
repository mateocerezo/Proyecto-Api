export const EXTRA_HOUR_PRICE = 120000
export const INCLUDED_HOURS = 4
export const timeSlots = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`)

export const formatCurrency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 2,
})

export function getTodayDate() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

export function getDefaultBookingDate() {
  const date = new Date()
  date.setDate(date.getDate() + 30)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function formatBookingDate(value) {
  if (!value) return 'A definir'
  const [year, month, day] = value.slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}
