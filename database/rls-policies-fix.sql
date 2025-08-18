-- ========================================
-- CORRECCIÓN DE POLÍTICAS RLS PARA MASCOTAS
-- ========================================
-- Ejecutar estas correcciones en Supabase Dashboard

-- 1. DESHABILITAR TEMPORALMENTE RLS PARA DEBUGGING
-- (Solo para identificar el problema - luego rehabilitar)
-- ALTER TABLE public.pet DISABLE ROW LEVEL SECURITY;

-- 2. ELIMINAR POLÍTICAS EXISTENTES PROBLEMÁTICAS
DROP POLICY IF EXISTS "pet_select_owner" ON public.pet;
DROP POLICY IF EXISTS "pet_select_medical_staff" ON public.pet;

-- 3. CREAR POLÍTICAS CORREGIDAS MÁS PERMISIVAS

-- Política temporal para permitir a todos los usuarios autenticados ver mascotas
-- (Esto es temporal hasta configurar roles correctamente)
CREATE POLICY "pet_select_all_authenticated" ON public.pet
  FOR SELECT USING (auth.role() = 'authenticated');

-- Política para que los dueños vean sus mascotas (cuando tengamos usuarios correctos)
CREATE POLICY "pet_select_owner_corrected" ON public.pet
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = pet.owner_id 
      AND u.correo = auth.email()
    )
  );

-- Política para personal médico (admins, veterinarios, asistentes)
CREATE POLICY "pet_select_medical_staff_corrected" ON public.pet
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.u_roles r ON u.rol_id = r.id
      WHERE u.correo = auth.email()
      AND r.nombre IN ('admin', 'veterinario', 'asistente')
    )
  );

-- ========================================
-- VERIFICAR DATOS DE EJEMPLO EN USUARIOS
-- ========================================

-- Verificar si existen usuarios y roles
SELECT 'Usuarios existentes:' as info, count(*) as cantidad FROM public.users;
SELECT 'Roles existentes:' as info, count(*) as cantidad FROM public.u_roles;

-- Mostrar usuarios existentes
SELECT u.id, u.nombre, u.correo, r.nombre as rol 
FROM public.users u 
LEFT JOIN public.u_roles r ON u.rol_id = r.id;

-- Mostrar mascotas y sus dueños
SELECT p.id, p.name, p.owner_id, u.nombre as owner_name, u.correo as owner_email
FROM public.pet p
LEFT JOIN public.users u ON p.owner_id = u.id
LIMIT 5;

-- ========================================
-- CREAR USUARIO TEMPORAL PARA TESTING
-- ========================================

-- Insertar rol admin si no existe
INSERT INTO public.u_roles (nombre, descripcion) 
VALUES ('admin', 'Administrador del sistema')
ON CONFLICT (nombre) DO NOTHING;

-- Insertar usuario temporal admin
INSERT INTO public.users (nombre, correo, contrasena, rol_id, telefono, direccion)
VALUES (
  'Admin Temporal',
  'admin@arvivet.test',
  'temp_password',
  (SELECT id FROM public.u_roles WHERE nombre = 'admin'),
  '+593-99-999-9999',
  'Sistema'
) ON CONFLICT (correo) DO NOTHING;

-- ========================================
-- POLÍTICA TEMPORAL MUY PERMISIVA
-- ========================================
-- Solo usar en desarrollo para debugging

-- Permitir a cualquier usuario autenticado ver todas las mascotas
-- COMENTAR DESPUÉS DE SOLUCIONAR EL PROBLEMA DE USUARIOS
/*
DROP POLICY IF EXISTS "pet_select_all_authenticated" ON public.pet;
CREATE POLICY "pet_select_all_temp" ON public.pet
  FOR SELECT USING (true);
*/

-- ========================================
-- COMANDOS DE VERIFICACIÓN
-- ========================================

-- Verificar políticas activas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'pet';

-- Verificar RLS habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'pet';