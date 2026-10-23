-- Login con Clerk: cada usuario se vincula con su cuenta de Clerk y la
-- contraseña deja de guardarse en nuestra base. Idempotente.
-- Ejecutar una sola vez (SQL Editor de Supabase).

BEGIN;

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS clerk_user_id varchar(64);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_clerk_user_id_key') THEN
    ALTER TABLE usuarios ADD CONSTRAINT usuarios_clerk_user_id_key UNIQUE (clerk_user_id);
  END IF;
END $$;

ALTER TABLE usuarios ALTER COLUMN contrasena_hash DROP NOT NULL;

COMMIT;

-- Cuando todos los usuarios estén vinculados a Clerk se puede eliminar:
-- ALTER TABLE usuarios DROP COLUMN contrasena_hash;
