import { addOnCatalog, experiences, spaceCatalog } from '../data/catalog'

export function calculateTotalEstimate({
  experienceId,
  guests,
  duration,
  selectedSpaces,
  selectedAddOns,
}) {
  const experience = experiences.find((item) => item.id === experienceId) ?? experiences[1]

  const optionalSpaces = spaceCatalog.filter(
    (space) => space.id !== 'main' && Boolean(selectedSpaces?.[space.id]),
  )

  const optionalSpacesCost = optionalSpaces.reduce((total, space) => total + space.price, 0)

  const perGuestAddOns = addOnCatalog.filter(
    (addon) => addon.type === 'perGuest' && Boolean(selectedAddOns?.[addon.id]),
  )

  const perGuestAddOnsCost = perGuestAddOns.reduce(
    (total, addon) => total + addon.pricePerGuest * guests,
    0,
  )

  const fixedAddOnsCost = addOnCatalog
    .filter((addon) => addon.type === 'fixed' && Boolean(selectedAddOns?.[addon.id]))
    .reduce((total, addon) => total + addon.price, 0)

  const additionalHours = Math.max(0, duration - 4)
  const additionalHoursCost = additionalHours * 120000

  const total =
    experience.price +
    optionalSpacesCost +
    perGuestAddOnsCost +
    fixedAddOnsCost +
    additionalHoursCost

  return {
    experience,
    total,
    optionalSpacesCost,
    perGuestAddOnsCost,
    fixedAddOnsCost,
    additionalHours,
    additionalHoursCost,
    selectedSpacesCount: optionalSpaces.length,
    selectedAddOnsCount:
      addOnCatalog.filter((addon) => Boolean(selectedAddOns?.[addon.id])).length,
  }
}
