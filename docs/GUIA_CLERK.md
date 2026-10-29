# Guía: migrar la autenticación a Clerk

> **Estado:** backend implementado (migración 004 aplicada, login propio
> eliminado). Lo que difiere de la propuesta original:
> - Los errores de acceso son **403 con `codigo`** (`SIN_EMPRESA`,
>   `EMPRESA_INACTIVA`, `USUARIO_INACTIVO`) en lugar de 404.
> - El SuperAdmin se consulta en `GET /api/auth/superadmin`.
> - Registro: body `{ empresa: {...}, admin?: { nombre, apellido } }`; si no
>   viene `admin`, se usan nombre y apellido del perfil de Clerk.
> - Vincular usuarios existentes: `npm run vincular-clerk -- --usuario <id> --clerk user_...`.
> - Pendiente: webhooks (4.8).

Objetivo: que el SuperAdmin y los usuarios de las empresas inicien sesión con
Clerk, sin perder el modelo multi-tenant actual (empresas, roles, `activa`).

## 1. Idea central: Clerk autentica, la base autoriza

| Responsabilidad | Quién la tiene |
|---|---|
| ¿Quién es esta persona? (login, contraseña, Google, MFA, recuperar contraseña, verificar email) | **Clerk** |
| ¿A qué empresa pertenece, qué rol tiene, la empresa está aprobada? | **Nuestra base** (`usuarios`, `roles`, `empresas`) |

Consecuencias:

- `resolverEmpresa`, `autorizar("admin")`, `exigirEmpresa`, el filtrado por
  `id_empresa`: **no cambian**.
- Lo único que cambia es *cómo* se obtiene el `id_usuario` del request: antes
  salía de nuestro JWT, ahora sale de buscar el `userId` de Clerk en `usuarios`.
- **No usamos Clerk Organizations.** Duplicaría la tabla `empresas` y el flujo
  de aprobación (`activa`) es nuestro. Se puede evaluar más adelante si se
  necesitan invitaciones de equipo gestionadas por Clerk.
- Supuesto: **un usuario de Clerk pertenece a una sola empresa**
  (`clerk_user_id` UNIQUE). Si más adelante una persona necesita operar en
  varias empresas, se agrega un selector de empresa; no hace falta ahora.
- El rol `admin` pertenece a una empresa y sus consultas quedan limitadas a ese
  tenant. El acceso global al panel de empresas es exclusivo del `superadmin`
  configurado en `SUPERADMIN_CLERK_USER_ID`.
- La migración `005_estado_empresas.sql` separa las empresas pendientes de las
  dadas de baja para que el panel permita aprobar, reactivar y desactivar.

### Flujo resultante

```
Empresa nueva
  1. Se registra en Clerk (<SignUp/>) → Clerk verifica el email.
  2. Front: POST /api/empresas/registro  (Bearer token de Clerk + datos de la empresa)
  3. Back: crea empresa (activa=false) + rol admin + usuario con clerk_user_id.
  4. GET /api/auth/me → 403 "pendiente de aprobación" hasta que el SuperAdmin apruebe.

Login de empresa
  1. <SignIn/> de Clerk.
  2. GET /api/auth/me → 200 (usuario + empresa) | 403 (pendiente) | 404 (sin empresa → ir a registro).

SuperAdmin
  1. <SignIn/> de Clerk con SU cuenta (con MFA activado).
  2. Back: getAuth(req).userId === SUPERADMIN_CLERK_USER_ID.
```

## 2. Configuración en el Dashboard de Clerk

1. Crear la aplicación en <https://dashboard.clerk.com>.
2. **User & Authentication → Email**: exigir email y su verificación.
3. Métodos de login: email + contraseña, y opcionalmente Google.
4. Crear la cuenta del SuperAdmin, activarle **MFA** y copiar su **User ID**
   (`user_...`, en *Users*).
5. **API Keys**: copiar `Publishable key` y `Secret key`.

## 3. Base de datos (migración 004)

`database/migraciones/004_usuarios_clerk.sql`:

```sql
-- Vincula cada usuario con su cuenta de Clerk. La contraseña deja de vivir
-- en nuestra base: contrasena_hash pasa a ser opcional (se elimina al final
-- de la migración, cuando ya nadie use el login propio).
BEGIN;

ALTER TABLE usuarios ADD COLUMN clerk_user_id varchar(64);
ALTER TABLE usuarios ADD CONSTRAINT usuarios_clerk_user_id_key UNIQUE (clerk_user_id);
ALTER TABLE usuarios ALTER COLUMN contrasena_hash DROP NOT NULL;

COMMIT;
```

Usuarios que ya existen (hoy, el admin de la empresa 5): crear su cuenta en
Clerk con el mismo email y vincularla a mano:

```sql
UPDATE usuarios SET clerk_user_id = 'user_xxx' WHERE id_usuario = <id>;
```

> No vincular automáticamente "por email" en el primer login: el email es
> único **por empresa**, así que puede haber varias filas con el mismo email.

## 4. Backend

### 4.1 Dependencia y variables

```bash
cd Backend
npm install @clerk/express
```

`.env` / `.env.example`:

```
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
# User ID de Clerk del SuperAdmin global
SUPERADMIN_CLERK_USER_ID=user_...
# Orígenes del frontend autorizados a usar tokens (separados por coma)
CLERK_AUTHORIZED_PARTIES=http://localhost:5173
```

`src/config/env.js`: reemplazar `superAdmin.email/passwordHash` por
`superAdminClerkId: requerida("SUPERADMIN_CLERK_USER_ID")` y exigir también
`CLERK_SECRET_KEY` con `requerida(...)`. `JWT_SECRET` deja de ser necesario
cuando se elimine el login propio (paso 6).

### 4.2 `app.js`: middleware global de Clerk

```js
import { clerkMiddleware } from "@clerk/express";

app.use(cors());
app.use(express.json({ limit: "100kb" }));
// Solo lee y verifica el token si viene; no bloquea rutas públicas.
app.use(
  clerkMiddleware({
    authorizedParties: process.env.CLERK_AUTHORIZED_PARTIES?.split(",") ?? []
  })
);
```

`authorizedParties` evita que un token emitido para otro sitio sea aceptado
por esta API.

### 4.3 `usuarios.model.js`: buscar por Clerk ID

Reemplaza a `obtenerEstadoAcceso` (misma consulta, otro filtro):

```js
export const obtenerAccesoPorClerkId = async (clerkUserId) => {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS_ACCESO}
     ${JOINS_ACCESO}
      WHERE u.clerk_user_id = $1`,
    [clerkUserId]
  );
  return rows[0] ?? null;
};
```

### 4.4 `auth.middleware.js`

```js
import { getAuth } from "@clerk/express";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

export const ROL_SUPERADMIN = "superadmin";

// Exige una sesión válida de Clerk. Deja req.clerkUserId.
export const autenticar = (req, res, next) => {
  const { isAuthenticated, userId } = getAuth(req);
  if (!isAuthenticated || !userId) {
    throw AppError.unauthorized("Sesión requerida");
  }
  req.clerkUserId = userId;
  next();
};

export const autenticarSuperAdmin = (req, res, next) => {
  const { isAuthenticated, userId } = getAuth(req);
  if (!isAuthenticated) throw AppError.unauthorized("Sesión requerida");
  if (userId !== env.superAdminClerkId) throw AppError.forbidden();
  req.usuario = { rol: ROL_SUPERADMIN };
  next();
};

// autorizar(...roles) queda igual.
```

### 4.5 `tenant.middleware.js`

Solo cambia la búsqueda; el resto (usuario activo, empresa activa, `req.id_empresa`)
queda igual:

```js
export const resolverEmpresa = async (req, res, next) => {
  const acceso = await usuariosModel.obtenerAccesoPorClerkId(req.clerkUserId);

  if (!acceso) {
    // Tiene cuenta en Clerk pero no está dado de alta en ninguna empresa:
    // el frontend lo manda al formulario de registro.
    throw AppError.notFound("La cuenta no está asociada a ninguna empresa");
  }
  if (!acceso.activo) throw AppError.unauthorized("El usuario está deshabilitado");
  if (!acceso.empresa_activa) throw AppError.forbidden(EMPRESA_INACTIVA);

  req.usuario = { /* igual que hoy */ };
  req.id_empresa = acceso.id_empresa;
  next();
};
```

`EMPRESA_INACTIVA` puede moverse de `auth.service.js` a este archivo, ya que el
login propio desaparece.

### 4.6 Registro de empresa

La persona ya existe en Clerk; el body solo trae los datos de la empresa.
Nombre, apellido y email se toman **de Clerk** (email ya verificado), no del body.

`schemas/empresas.schemas.js`:

```js
export const registrarEmpresaSchema = objetoEstricto({
  empresa: objetoEstricto({ /* nombre, cuit, email, telefono: igual que hoy */ })
});
```

`routes/empresas.routes.js`:

```js
router.post("/registro", autenticar, validar({ body: registrarEmpresaSchema }), ctrl.registrar);
```

`controllers/empresas.controller.js`:

```js
export const registrar = async (req, res) => {
  const resultado = await servicio.registrar(req.clerkUserId, req.datos.body.empresa);
  res.status(201).json({ mensaje: "...", ...resultado });
};
```

`services/empresas.service.js`:

```js
import { clerkClient } from "@clerk/express";

export const registrar = async (clerkUserId, empresa) => {
  const persona = await clerkClient.users.getUser(clerkUserId);
  const email = persona.primaryEmailAddress?.emailAddress?.toLowerCase();
  if (!email) throw AppError.badRequest("La cuenta no tiene un email verificado");

  try {
    return await enTransaccion(async (client) => {
      const nueva = await modelo.crearPendiente(client, empresa);
      const idRol = await modelo.crearRol(client, nueva.id_empresa, ROL_ADMIN);
      const usuario = await modelo.crearUsuario(client, {
        idEmpresa: nueva.id_empresa,
        idRol,
        clerkUserId,
        nombre: persona.firstName || "Sin nombre",
        apellido: persona.lastName || "-",
        email
      });
      return { empresa: nueva, usuario: { ...usuario, rol: ROL_ADMIN } };
    });
  } catch (error) {
    throw traducirErrorPg(error, {
      // UNIQUE de empresas (nombre/cuit) o de usuarios.clerk_user_id
      duplicado: "Ya existe una empresa con ese nombre o CUIT, o la cuenta ya tiene una empresa"
    });
  }
};
```

En `models/empresas.model.js`, `crearUsuario` inserta `clerk_user_id` en lugar
de `contrasena_hash`. Si querés distinguir los dos casos de duplicado, mirá
`error.constraint` (`usuarios_clerk_user_id_key` vs `empresas_cuit_key`).

### 4.7 Rutas de auth y SuperAdmin

- `routes/auth.routes.js`: eliminar `POST /login`. Queda
  `GET /me` → `autenticar, resolverEmpresa, perfil`.
- `routes/superadmin.routes.js`: eliminar `POST /login`. El resto queda igual
  (ya usa `autenticarSuperAdmin`).
- Agregar `GET /api/superadmin/me` (solo `autenticarSuperAdmin`) para que el
  frontend sepa si mostrar el panel de administración.

### 4.8 Webhooks (opcional, recomendado más adelante)

Mantienen la base sincronizada cuando algo cambia en Clerk:

- `user.deleted` → `UPDATE usuarios SET activo = false WHERE clerk_user_id = $1`
- `user.updated` → actualizar nombre/apellido/email.

Se configuran en *Dashboard → Webhooks*, apuntando a `POST /api/webhooks/clerk`.
La firma **siempre** se verifica (helper `verifyWebhook` del SDK, ver
[docs de webhooks](https://clerk.com/docs/webhooks/sync-data)), y esa ruta
necesita el body crudo, así que se registra **antes** de `express.json()`.
En desarrollo local hace falta un túnel (ngrok o similar).

## 5. Frontend (resumen; se detalla al trabajar el front)

```bash
cd Frontend
npm install @clerk/react
```

`.env`: `VITE_CLERK_PUBLISHABLE_KEY=pk_test_...`

`main.jsx`: envolver `<App />` con `<ClerkProvider>`.

Llamadas a la API con el token de la sesión:

```js
import { useAuth } from "@clerk/react";

const { getToken } = useAuth();
const token = await getToken();
await fetch(`${API_URL}/eventos?estado=consultado`, {
  headers: { Authorization: `Bearer ${token}` }
});
```

Pantallas y lógica:

| Situación | Qué muestra el front |
|---|---|
| Sin sesión de Clerk | Landing pública + botones de ingreso/registro |
| `GET /api/auth/superadmin` = 200 | Panel del SuperAdmin |
| `GET /api/auth/me` = 403 `codigo: SIN_EMPRESA` | Formulario "Registrá tu salón" → `POST /api/empresas/registro` |
| `GET /api/auth/me` = 403 `codigo: EMPRESA_INACTIVA` | "Tu empresa está pendiente de aprobación" |
| `GET /api/auth/me` = 403 `codigo: USUARIO_INACTIVO` | "Tu usuario fue deshabilitado" |
| `GET /api/auth/me` = 200 | Panel de la empresa (catálogo, solicitudes) |

Componentes de Clerk útiles: `<SignIn/>`, `<SignUp/>`, `<UserButton/>`,
`<Show when="signed-in">` / `<Show when="signed-out">`.

## 6. Orden de implementación sugerido

1. Dashboard de Clerk (sección 2) y migración 004.
2. Backend: secciones 4.1 a 4.7. Mantener el login propio **solo** hasta
   terminar de probar; después borrar:
   `POST /api/auth/login`, `loginSuperAdmin`, `HASH_SENUELO`, `hashearPassword`,
   `scripts/hash-password.js`, `scripts/crear-usuario.js`, `JWT_SECRET`,
   `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD_HASH` y las dependencias
   `bcryptjs` / `jsonwebtoken`.
3. Vincular los usuarios existentes (sección 3).
4. Frontend (sección 5).
5. Cuando nadie use contraseñas propias:
   `ALTER TABLE usuarios DROP COLUMN contrasena_hash;`
6. Webhooks (4.8).

## 7. Pruebas mínimas antes de dar por terminado

- [ ] Sin token: rutas de `/api/eventos`, `/api/catalogos`, `/api/superadmin` → 401.
- [ ] Cuenta de Clerk sin empresa: `/api/auth/me` → 404; registro → 201.
- [ ] Registrar dos veces con la misma cuenta → 409.
- [ ] Empresa pendiente: `/api/auth/me` → 403. Aprobada → 200.
- [ ] Usuario de empresa en `/api/superadmin/*` → 403.
- [ ] SuperAdmin en `/api/eventos` → 404 (no tiene empresa).
- [ ] Desactivar empresa con sesión abierta → el siguiente request da 403.
- [ ] Un usuario no ve eventos de otra empresa (404).
- [ ] Rutas públicas (`/api/empresas`, `/api/consultas`) siguen sin pedir sesión.
