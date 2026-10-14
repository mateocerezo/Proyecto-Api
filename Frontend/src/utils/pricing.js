import { addOns, experiences, spaces } from '../data/catalog'

export function calculateTotalEstimate({
  experienceId,
  guests,
  duration,
  selectedSpaces,
  selectedAddOns,
}) {
  const experience = experiences.find((item) => item.id === experienceId)

  if (!experience) {
    throw new Error(`Experiencia desconocida: ${experienceId}`)
  }

  const selectedOptionalSpaces = spaces.filter(
    (space) => !space.required && selectedSpaces[space.id],
  )
  const spacesCost = selectedOptionalSpaces.reduce((sum, space) => sum + space.price, 0)
  const addOnsCost = addOns.reduce((sum, addon) => {
    if (!selectedAddOns[addon.id]) return sum
    return sum + addon.price * (addon.type === 'perGuest' ? guests : 1)
  }, 0)
  const additionalHours = Math.max(0, duration - 4)
  const additionalHoursCost = additionalHours * 120000

  return {
    experience,
    total: experience.price + spacesCost + addOnsCost + additionalHoursCost,
    spacesCost,
    addOnsCost,
    additionalHours,
    additionalHoursCost,
    optionalSpacesCount: selectedOptionalSpaces.length,
    addOnsCount: addOns.filter((addon) => selectedAddOns[addon.id]).length,
  }
}
