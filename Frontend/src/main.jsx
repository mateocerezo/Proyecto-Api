import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.jsx'
import { SessionProvider } from './session/SessionContext.jsx'

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {publishableKey ? <ClerkProvider publishableKey={publishableKey}>
      <BrowserRouter>
        <SessionProvider><App /></SessionProvider>
      </BrowserRouter>
    </ClerkProvider> : <main className="platform-wrap">
      <section className="platform-card">
        <h1>Configurá el acceso</h1>
        <p>Definí VITE_CLERK_PUBLISHABLE_KEY en Frontend/.env con la clave publicable de Clerk y reiniciá Vite.</p>
      </section>
    </main>}
  </StrictMode>,
)
