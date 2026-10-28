const ESTADOS = {
  consultado: { label: 'Nueva solicitud', color: 'blue' },
  reservado: { label: 'Confirmada', color: 'green' },
  confirmado: { label: 'Confirmada', color: 'green' },
  cancelado: { label: 'Descartada', color: 'red' },
  descartado: { label: 'Descartada', color: 'red' },
}

export function estadoInfo(estado) {
  return ESTADOS[estado] || { label: 'Inactiva', color: 'gray' }
}

export function isPendingResponse(estado) {
  return estado === 'consultado'
}
