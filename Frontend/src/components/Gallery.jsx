import { useEffect, useState } from 'react'
import { imageUrl } from '../services/api'

// Tira de miniaturas que abre la foto en grande. images: lista de ids.
export function Gallery({ images, label, size = 'large' }) {
  const [open, setOpen] = useState(null)
  if (!images?.length) return null
  return <>
    <div className={`gallery gallery-${size}`} aria-label={label}>
      {images.map((id, index) => <button type="button" key={id} className="gallery-thumb" aria-label={`Ver foto ${index + 1} de ${label}`}
        onClick={(event) => { event.preventDefault(); setOpen(index) }}>
        <img src={imageUrl(id)} alt="" loading="lazy" />
      </button>)}
    </div>
    {open !== null && <Lightbox images={images} index={open} label={label} onChange={setOpen} onClose={() => setOpen(null)} />}
  </>
}

function Lightbox({ images, index, label, onChange, onClose }) {
  const move = (step) => onChange((index + step + images.length) % images.length)
  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') onChange((index + 1) % images.length)
      if (event.key === 'ArrowLeft') onChange((index - 1 + images.length) % images.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [images.length, index, onChange, onClose])

  return <div className="modal-backdrop lightbox" role="dialog" aria-modal="true" aria-label={label} onClick={onClose}>
    <figure onClick={(event) => event.stopPropagation()}>
      <img src={imageUrl(images[index])} alt={`Foto ${index + 1} de ${label}`} />
      <figcaption>
        {images.length > 1 && <button type="button" className="button button-small button-secondary" onClick={() => move(-1)} aria-label="Foto anterior">←</button>}
        <span>{index + 1} / {images.length}</span>
        {images.length > 1 && <button type="button" className="button button-small button-secondary" onClick={() => move(1)} aria-label="Foto siguiente">→</button>}
        <button type="button" className="button button-small" onClick={onClose} autoFocus>Cerrar</button>
      </figcaption>
    </figure>
  </div>
}
