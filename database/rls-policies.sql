-- ========================================
-- POLÍTICAS DE SEGURIDAD RLS PARA ARVI VET
-- ========================================
-- Estas políticas deben ejecutarse en el dashboard de Supabase
-- o mediante el SQL Editor

-- Habilitar RLS en todas las tablas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.u_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speciality ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vet_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_block ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holiday ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vets_by_specialities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_by_specialities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history_pet ENABLE ROW LEVEL SECURITY;

-- ========================================
-- FUNCIONES AUXILIARES PARA POLÍTICAS
-- ========================================

-- Función para obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT r.nombre
    FROM public.users u
    JOIN public.u_roles r ON u.rol_id = r.id
    WHERE u.correo = auth.email()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si el usuario es admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si el usuario es veterinario
CREATE OR REPLACE FUNCTION is_veterinarian()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role() IN ('admin', 'veterinario');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si el usuario es personal médico (admin, veterinario, asistente)
CREATE OR REPLACE FUNCTION is_medical_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role() IN ('admin', 'veterinario', 'asistente');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener el ID del usuario actual
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT id
    FROM public.users
    WHERE correo = auth.email()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener el ID del veterinario actual (si es veterinario)
CREATE OR REPLACE FUNCTION get_current_vet_id()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT v.id
    FROM public.vet v
    JOIN public.users u ON v.email = u.correo
    WHERE u.correo = auth.email()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- POLÍTICAS PARA TABLA USERS
-- ========================================

-- Los usuarios pueden ver su propia información
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (correo = auth.email());

-- Los admins pueden ver todos los usuarios
CREATE POLICY "users_select_admin" ON public.users
  FOR SELECT USING (is_admin());

-- El personal médico puede ver información de clientes
CREATE POLICY "users_select_medical_staff" ON public.users
  FOR SELECT USING (
    is_medical_staff() AND 
    EXISTS (
      SELECT 1 FROM public.u_roles r 
      WHERE r.id = rol_id AND r.nombre = 'cliente'
    )
  );

-- Solo admins pueden insertar usuarios
CREATE POLICY "users_insert_admin" ON public.users
  FOR INSERT WITH CHECK (is_admin());

-- Los usuarios pueden actualizar su propia información (excepto rol)
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (correo = auth.email())
  WITH CHECK (correo = auth.email() AND rol_id = OLD.rol_id);

-- Los admins pueden actualizar cualquier usuario
CREATE POLICY "users_update_admin" ON public.users
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

-- Solo admins pueden eliminar usuarios
CREATE POLICY "users_delete_admin" ON public.users
  FOR DELETE USING (is_admin());

-- ========================================
-- POLÍTICAS PARA TABLA U_ROLES
-- ========================================

-- Todos pueden ver los roles
CREATE POLICY "u_roles_select_all" ON public.u_roles
  FOR SELECT USING (true);

-- Solo admins pueden modificar roles
CREATE POLICY "u_roles_admin_only" ON public.u_roles
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ========================================
-- POLÍTICAS PARA TABLA VET
-- ========================================

-- Todos los usuarios autenticados pueden ver veterinarios
CREATE POLICY "vet_select_authenticated" ON public.vet
  FOR SELECT USING (auth.role() = 'authenticated');

-- Solo admins pueden modificar veterinarios
CREATE POLICY "vet_admin_only" ON public.vet
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ========================================
-- POLÍTICAS PARA TABLA SPECIALITY
-- ========================================

-- Todos los usuarios autenticados pueden ver especialidades
CREATE POLICY "speciality_select_authenticated" ON public.speciality
  FOR SELECT USING (auth.role() = 'authenticated');

-- Solo admins pueden modificar especialidades
CREATE POLICY "speciality_admin_only" ON public.speciality
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ========================================
-- POLÍTICAS PARA TABLA BRANCH
-- ========================================

-- Todos los usuarios autenticados pueden ver sucursales
CREATE POLICY "branch_select_authenticated" ON public.branch
  FOR SELECT USING (auth.role() = 'authenticated');

-- Solo admins pueden modificar sucursales
CREATE POLICY "branch_admin_only" ON public.branch
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ========================================
-- POLÍTICAS PARA TABLA PET
-- ========================================

-- Los dueños pueden ver sus propias mascotas
CREATE POLICY "pet_select_owner" ON public.pet
  FOR SELECT USING (
    owner_id = get_current_user_id()
  );

-- El personal médico puede ver todas las mascotas
CREATE POLICY "pet_select_medical_staff" ON public.pet
  FOR SELECT USING (is_medical_staff());

-- Los dueños pueden insertar sus propias mascotas
CREATE POLICY "pet_insert_owner" ON public.pet
  FOR INSERT WITH CHECK (owner_id = get_current_user_id());

-- El personal médico puede insertar mascotas
CREATE POLICY "pet_insert_medical_staff" ON public.pet
  FOR INSERT WITH CHECK (is_medical_staff());

-- Los dueños pueden actualizar sus propias mascotas
CREATE POLICY "pet_update_owner" ON public.pet
  FOR UPDATE USING (owner_id = get_current_user_id())
  WITH CHECK (owner_id = get_current_user_id());

-- El personal médico puede actualizar cualquier mascota
CREATE POLICY "pet_update_medical_staff" ON public.pet
  FOR UPDATE USING (is_medical_staff()) WITH CHECK (is_medical_staff());

-- Solo admins pueden eliminar mascotas
CREATE POLICY "pet_delete_admin" ON public.pet
  FOR DELETE USING (is_admin());

-- ========================================
-- POLÍTICAS PARA TABLA APPOINTMENT
-- ========================================

-- Los clientes pueden ver sus propias citas
CREATE POLICY "appointment_select_client" ON public.appointment
  FOR SELECT USING (user_id = get_current_user_id());

-- Los veterinarios pueden ver sus propias citas
CREATE POLICY "appointment_select_vet" ON public.appointment
  FOR SELECT USING (vet_id = get_current_vet_id());

-- El personal médico puede ver todas las citas
CREATE POLICY "appointment_select_medical_staff" ON public.appointment
  FOR SELECT USING (is_medical_staff());

-- El personal médico puede insertar citas
CREATE POLICY "appointment_insert_medical_staff" ON public.appointment
  FOR INSERT WITH CHECK (is_medical_staff());

-- Los clientes pueden insertar sus propias citas
CREATE POLICY "appointment_insert_client" ON public.appointment
  FOR INSERT WITH CHECK (user_id = get_current_user_id());

-- Los veterinarios pueden actualizar sus propias citas
CREATE POLICY "appointment_update_vet" ON public.appointment
  FOR UPDATE USING (vet_id = get_current_vet_id())
  WITH CHECK (vet_id = get_current_vet_id());

-- El personal médico puede actualizar cualquier cita
CREATE POLICY "appointment_update_medical_staff" ON public.appointment
  FOR UPDATE USING (is_medical_staff()) WITH CHECK (is_medical_staff());

-- Los clientes pueden actualizar sus propias citas (solo ciertos campos)
CREATE POLICY "appointment_update_client" ON public.appointment
  FOR UPDATE USING (
    user_id = get_current_user_id() AND 
    status IN ('programada', 'confirmada')
  ) WITH CHECK (
    user_id = get_current_user_id() AND 
    user_id = OLD.user_id AND
    vet_id = OLD.vet_id AND
    pet_id = OLD.pet_id
  );

-- Solo admins y el personal médico pueden eliminar citas
CREATE POLICY "appointment_delete_medical_staff" ON public.appointment
  FOR DELETE USING (is_medical_staff());

-- ========================================
-- POLÍTICAS PARA TABLA VET_SCHEDULE
-- ========================================

-- Todos pueden ver horarios de veterinarios
CREATE POLICY "vet_schedule_select_all" ON public.vet_schedule
  FOR SELECT USING (auth.role() = 'authenticated');

-- Solo admins pueden modificar horarios
CREATE POLICY "vet_schedule_admin_only" ON public.vet_schedule
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Los veterinarios pueden ver y modificar sus propios horarios
CREATE POLICY "vet_schedule_own_vet" ON public.vet_schedule
  FOR ALL USING (vet_id = get_current_vet_id())
  WITH CHECK (vet_id = get_current_vet_id());

-- ========================================
-- POLÍTICAS PARA TABLA APPOINTMENT_BLOCK
-- ========================================

-- Todos pueden ver bloqueos (para calcular disponibilidad)
CREATE POLICY "appointment_block_select_all" ON public.appointment_block
  FOR SELECT USING (auth.role() = 'authenticated');

-- Solo admins pueden crear/modificar bloqueos
CREATE POLICY "appointment_block_admin_only" ON public.appointment_block
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Los veterinarios pueden crear/modificar sus propios bloqueos
CREATE POLICY "appointment_block_own_vet" ON public.appointment_block
  FOR ALL USING (vet_id = get_current_vet_id())
  WITH CHECK (vet_id = get_current_vet_id());

-- ========================================
-- POLÍTICAS PARA TABLA HOLIDAY
-- ========================================

-- Todos pueden ver días festivos
CREATE POLICY "holiday_select_all" ON public.holiday
  FOR SELECT USING (auth.role() = 'authenticated');

-- Solo admins pueden modificar días festivos
CREATE POLICY "holiday_admin_only" ON public.holiday
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ========================================
-- POLÍTICAS PARA TABLAS DE RELACIÓN
-- ========================================

-- VETS_BY_SPECIALITIES
CREATE POLICY "vets_by_specialities_select_all" ON public.vets_by_specialities
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "vets_by_specialities_admin_only" ON public.vets_by_specialities
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- BRANCH_BY_SPECIALITIES
CREATE POLICY "branch_by_specialities_select_all" ON public.branch_by_specialities
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "branch_by_specialities_admin_only" ON public.branch_by_specialities
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ========================================
-- POLÍTICAS PARA TABLA HISTORY_PET
-- ========================================

-- Los dueños pueden ver el historial de sus mascotas
CREATE POLICY "history_pet_select_owner" ON public.history_pet
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pet p 
      WHERE p.id = id_pet AND p.owner_id = get_current_user_id()
    )
  );

-- El personal médico puede ver todo el historial
CREATE POLICY "history_pet_select_medical_staff" ON public.history_pet
  FOR SELECT USING (is_medical_staff());

-- Solo el personal médico puede insertar historiales
CREATE POLICY "history_pet_insert_medical_staff" ON public.history_pet
  FOR INSERT WITH CHECK (is_medical_staff());

-- Solo el personal médico puede actualizar historiales
CREATE POLICY "history_pet_update_medical_staff" ON public.history_pet
  FOR UPDATE USING (is_medical_staff()) WITH CHECK (is_medical_staff());

-- Solo admins pueden eliminar historiales
CREATE POLICY "history_pet_delete_admin" ON public.history_pet
  FOR DELETE USING (is_admin());

-- ========================================
-- POLÍTICAS ADICIONALES DE SEGURIDAD
-- ========================================

-- Crear función para log de actividades críticas (COMENTADA - CREAR TABLA activity_log PRIMERO)
/*
CREATE TABLE IF NOT EXISTS public.activity_log (
  id SERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  user_email TEXT,
  old_data JSONB,
  new_data JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION log_critical_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Log para operaciones críticas (eliminaciones, cambios de estado importantes)
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_log (
      table_name,
      operation,
      user_email,
      old_data,
      timestamp
    ) VALUES (
      TG_TABLE_NAME,
      TG_OP,
      auth.email(),
      row_to_json(OLD),
      NOW()
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.activity_log (
      table_name,
      operation,
      user_email,
      old_data,
      new_data,
      timestamp
    ) VALUES (
      TG_TABLE_NAME,
      TG_OP,
      auth.email(),
      row_to_json(OLD),
      row_to_json(NEW),
      NOW()
    );
    RETURN NEW;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/

-- Aplicar trigger de auditoría a tablas críticas
-- CREATE TRIGGER appointment_audit_trigger
--   AFTER UPDATE OR DELETE ON public.appointment
--   FOR EACH ROW EXECUTE FUNCTION log_critical_activity();

-- CREATE TRIGGER vet_schedule_audit_trigger
--   AFTER UPDATE OR DELETE ON public.vet_schedule
--   FOR EACH ROW EXECUTE FUNCTION log_critical_activity();

-- ========================================
-- CONFIGURACIÓN DE REALTIME (OPCIONAL)
-- ========================================

-- Habilitar realtime para tablas específicas
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.appointment;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.appointment_block;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.vet_schedule;

-- ========================================
-- NOTAS IMPORTANTES
-- ========================================

/*
1. Estas políticas deben ejecutarse después de crear las tablas
2. Algunas funciones requieren que existan datos de ejemplo en las tablas users y u_roles
3. Para pruebas, puede ser necesario insertar usuarios de ejemplo primero
4. Las políticas de realtime son opcionales y pueden afectar el rendimiento
5. Se recomienda crear índices adicionales en campos utilizados en las políticas
6. La tabla activity_log debe crearse si se desea usar auditoría
7. Ajustar las políticas según los requisitos específicos de negocio
*/