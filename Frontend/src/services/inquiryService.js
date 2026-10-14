export async function submitInquiry(payload) {
  // TODO: connect to the backend and create an event with status "consultado".
  await new Promise((resolve) => setTimeout(resolve, 700))

  return { ok: true, payload }
}
