export async function submitInquiry(payload) {
  // TODO: replace with real async call and create an event in "consultado" status.
  await new Promise((resolve) => setTimeout(resolve, 700))

  return {
    ok: true,
    payload,
    message: 'Consulta registrada correctamente.',
  }
}
