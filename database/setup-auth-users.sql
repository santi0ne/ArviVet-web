-- ========================================
-- CONFIGURACIÓN DE USUARIOS PARA SUPABASE AUTH
-- ========================================
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. VERIFICAR Y CREAR ROLES SI NO EXISTEN
INSERT INTO public.u_roles (nombre, descripcion) VALUES
('admin', 'Administrador del sistema'),
('veterinario', 'Médico veterinario'),
('asistente', 'Asistente veterinario'),
('cliente', 'Cliente/dueño de mascota')
ON CONFLICT (nombre) DO NOTHING;

-- 2. VERIFICAR ROLES CREADOS
SELECT * FROM public.u_roles ORDER BY id;

-- 3. CREAR USUARIOS EN LA TABLA USERS
-- IMPORTANTE: Los usuarios deben crearse primero en Supabase Auth
-- y luego se agregan a esta tabla con el mismo email

-- Usuario Admin
INSERT INTO public.users (nombre, correo, contrasena, rol_id, telefono, direccion) VALUES
(
  'Administrador ArviVet',
  'admin@arvivet.com',
  'hashed_password_not_used', -- La contraseña real está en Supabase Auth
  (SELECT id FROM public.u_roles WHERE nombre = 'admin'),
  '+593-99-111-1111',
  'Oficina Central ArviVet'
) ON CONFLICT (correo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  rol_id = EXCLUDED.rol_id,
  telefono = EXCLUDED.telefono,
  direccion = EXCLUDED.direccion;

-- Usuario Veterinario
INSERT INTO public.users (nombre, correo, contrasena, rol_id, telefono, direccion) VALUES
(
  'Dr. Juan Veterinario',
  'vet@arvivet.com',
  'hashed_password_not_used',
  (SELECT id FROM public.u_roles WHERE nombre = 'veterinario'),
  '+593-99-222-2222',
  'Clínica Veterinaria Principal'
) ON CONFLICT (correo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  rol_id = EXCLUDED.rol_id,
  telefono = EXCLUDED.telefono,
  direccion = EXCLUDED.direccion;

-- Usuario Cliente de prueba
INSERT INTO public.users (nombre, correo, contrasena, rol_id, telefono, direccion) VALUES
(
  'Cliente Test',
  'cliente@test.com',
  'hashed_password_not_used',
  (SELECT id FROM public.u_roles WHERE nombre = 'cliente'),
  '+593-99-333-3333',
  'Dirección del cliente'
) ON CONFLICT (correo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  rol_id = EXCLUDED.rol_id,
  telefono = EXCLUDED.telefono,
  direccion = EXCLUDED.direccion;

-- 4. VERIFICAR USUARIOS CREADOS
SELECT 
  u.id,
  u.nombre,
  u.correo,
  r.nombre as rol,
  u.telefono
FROM public.users u
LEFT JOIN public.u_roles r ON u.rol_id = r.id
ORDER BY u.id;

-- 5. CREAR ALGUNAS MASCOTAS DE PRUEBA VINCULADAS A USUARIOS
INSERT INTO public.pet (name, specie, breed, sex, birth_date, weigth, owner_id, pic) VALUES
(
  'Max',
  'Perro',
  'Golden Retriever',
  'Macho',
  '2020-05-15',
  25.5,
  (SELECT id FROM public.users WHERE correo = 'cliente@test.com'),
  null
),
(
  'Luna',
  'Gato',
  'Persa',
  'Hembra',
  '2021-03-20',
  4.2,
  (SELECT id FROM public.users WHERE correo = 'cliente@test.com'),
  null
),
(
  'Rocky',
  'Perro',
  'Pastor Alemán',
  'Macho',
  '2019-08-10',
  32.0,
  (SELECT id FROM public.users WHERE correo = 'admin@arvivet.com'),
  null
) ON CONFLICT DO NOTHING;

-- 6. VERIFICAR MASCOTAS CREADAS
SELECT 
  p.id,
  p.name,
  p.specie,
  p.breed,
  u.nombre as owner_name,
  u.correo as owner_email
FROM public.pet p
LEFT JOIN public.users u ON p.owner_id = u.id
ORDER BY p.id;

-- 7. POLÍTICAS RLS TEMPORALES PARA PRUEBAS
-- (Más permisivas durante el desarrollo)

-- Eliminar políticas restrictivas existentes
DROP POLICY IF EXISTS "pet_select_owner" ON public.pet;
DROP POLICY IF EXISTS "pet_select_medical_staff" ON public.pet;
DROP POLICY IF EXISTS "pet_select_owner_corrected" ON public.pet;
DROP POLICY IF EXISTS "pet_select_medical_staff_corrected" ON public.pet;

-- Crear política temporal muy permisiva para debugging
CREATE POLICY "pet_select_authenticated_temp" ON public.pet
  FOR SELECT USING (auth.role() = 'authenticated');

-- Política para INSERT (permitir a usuarios autenticados)
CREATE POLICY "pet_insert_authenticated" ON public.pet
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política para UPDATE (permitir a usuarios autenticados)
CREATE POLICY "pet_update_authenticated" ON public.pet
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 8. VERIFICAR POLÍTICAS ACTIVAS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'pet'
ORDER BY policyname;

-- 9. VERIFICAR QUE RLS ESTÁ HABILITADO
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'pet';

-- ========================================
-- INSTRUCCIONES PARA SUPABASE AUTH
-- ========================================

/*
DESPUÉS DE EJECUTAR ESTE SQL, DEBES:

1. Ir a Supabase Dashboard > Authentication > Users
2. Crear manualmente estos usuarios (o usar la aplicación):
   - Email: admin@arvivet.com, Password: admin123
   - Email: vet@arvivet.com, Password: vet123
   - Email: cliente@test.com, Password: test123

3. O usar el método programático desde la app:
   - Llamar a supabaseAuthService.createTestUsers()

4. Verificar que los usuarios pueden hacer login
5. Comprobar que aparecen las mascotas

CREDENCIALES DE PRUEBA:
- admin@arvivet.com / admin123 (Administrador)
- vet@arvivet.com / vet123 (Veterinario)  
- cliente@test.com / test123 (Cliente)
*/