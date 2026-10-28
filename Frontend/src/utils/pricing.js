import { EXTRA_HOUR_PRICE, INCLUDED_HOURS } from '../data/catalog'

export function calculateTotalEstimate({
  catalog,
  experienceName,
  selectedSpaces,
  selectedServices,
  duration,
}) {
  const experience = catalog.tipos_evento.find((item) => item.nombre === experienceName)
  const spacesCost = catalog.espacios
    .filter((item) => selectedSpaces.includes(item.nombre))
    .reduce((sum, item) => sum + Number(item.precio_adicional), 0)
  const servicesCost = catalog.servicios.reduce((sum, item) => {
    const service = selectedServices[item.nombre]
    const quantity = service?.enabled ? Number(service.cantidad || 0) : 0
    return sum + Number(item.precio) * quantity
  }, 0)
  const additionalHours = Math.max(0, duration - INCLUDED_HOURS)
  const additionalHoursCost = additionalHours * EXTRA_HOUR_PRICE

  return {
    experience,
    spacesCost,
    servicesCost,
    additionalHours,
    additionalHoursCost,
    total: Number(experience?.precio_base || 0) + spacesCost + servicesCost + additionalHoursCost,
  }
}
