const MAX_SIDE = 1600
const QUALITY = 0.85

// Achica la foto en el navegador antes de subirla (lado mayor 1600 px, JPEG):
// una foto de celular de 5 MB queda en unos 300 KB.
export async function prepareImage(file) {
  if (!file.type.startsWith('image/')) throw new Error(`«${file.name}» no es una imagen.`)
  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error(`No se pudo leer «${file.name}». Probá con una foto JPG, PNG o WEBP.`)
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error(`No se pudo procesar «${file.name}».`))), 'image/jpeg', QUALITY)
  })
}
