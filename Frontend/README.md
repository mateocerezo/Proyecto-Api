# Frontend

React 19 app para la zona pública de empresas, el panel de empresa y el panel
de administración de la plataforma.

## Desarrollo local

1. Copiá `.env.example` como `.env` y completá
   `VITE_CLERK_PUBLISHABLE_KEY` con la clave publicable de Clerk.
2. Iniciá el backend en `http://localhost:3001`.
3. Ejecutá `npm install` y `npm run dev`. Vite exige el puerto `5173`, origen
   autorizado por el backend para las sesiones de Clerk.

`VITE_API_URL` apunta por defecto a `http://localhost:3001/api`. Las rutas
privadas envían el token de sesión automáticamente; el servidor determina
el rol, la empresa y los precios.
