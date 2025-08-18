# 📋 Configuración Externa de Supabase para ArviVet

Esta documentación describe todas las configuraciones que deben realizarse externamente en Supabase Dashboard y en el entorno de desarrollo para que el módulo de calendario funcione correctamente.

## 🚀 **Configuración Inicial de Supabase**

### 1. **Crear Proyecto en Supabase**

1. Ir a [supabase.com](https://supabase.com)
2. Crear una nueva cuenta o iniciar sesión
3. Crear un nuevo proyecto:
   - **Nombre del proyecto**: `arvi-vet-calendar`
   - **Contraseña de la base de datos**: [Generar una contraseña segura]
   - **Región**: Seleccionar la más cercana a los usuarios

### 2. **Obtener Credenciales del Proyecto**

Una vez creado el proyecto, obtener de **Settings > API**:

- **Project URL**: `https://[tu-proyecto].supabase.co`
- **anon/public key**: `eyJ...` (clave pública)
- **service_role key**: `eyJ...` (clave privada - **NO USAR EN FRONTEND**)

## 🔧 **Variables de Entorno**

### **Archivo `.env.local`** (raíz del proyecto)

```bash
# Variables públicas de Supabase (expuestas al frontend)
NEXT_PUBLIC_SUPABASE_URL=https://[tu-proyecto].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ[tu-anon-key]

# Variables privadas (solo para server-side)
SUPABASE_SERVICE_ROLE_KEY=eyJ[tu-service-role-key]

# URLs de la aplicación
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Configuración de timezone
NEXT_PUBLIC_TIMEZONE=America/Guayaquil
```

### **Archivo `.env.example`** (para el equipo)

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Timezone
NEXT_PUBLIC_TIMEZONE=America/Guayaquil
```

## 🗄️ **Configuración de Base de Datos**

### **1. Ejecutar Scripts SQL**

En **Supabase Dashboard > SQL Editor**, ejecutar en este orden:

#### **a) Verificar tablas existentes** (opcional)

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

#### **b) Ejecutar políticas RLS**

Copiar y ejecutar todo el contenido de `database/rls-policies.sql`

#### **c) Verificar políticas creadas**

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### **2. Crear Datos de Ejemplo** (opcional para testing)

```sql
-- Insertar roles de usuario
INSERT INTO public.u_roles (nombre, descripcion) VALUES
('admin', 'Administrador del sistema'),
('veterinario', 'Médico veterinario'),
('asistente', 'Asistente veterinario'),
('cliente', 'Cliente/dueño de mascota');

-- Insertar especialidades
INSERT INTO public.speciality (name, description) VALUES
('Consulta General', 'Consultas veterinarias generales'),
('Cirugía', 'Procedimientos quirúrgicos'),
('Vacunación', 'Aplicación de vacunas'),
('Emergencias', 'Atención de emergencias'),
('Dermatología', 'Especialista en piel y pelaje');

-- Insertar sucursales
INSERT INTO public.branch (direction, telephone) VALUES
('Av. Principal 123, Guayaquil', '+593-4-123-4567'),
('Calle Secundaria 456, Quito', '+593-2-987-6543');

-- Insertar usuario admin de ejemplo
INSERT INTO public.users (nombre, correo, contrasena, rol_id, telefono, direccion) VALUES
('Administrador', 'admin@arvivet.com', 'hashed_password', 1, '+593-99-123-4567', 'Oficina Principal');

-- Insertar veterinario de ejemplo
INSERT INTO public.vet (name, email, telephone) VALUES
('Dr. Juan Pérez', 'juan.perez@arvivet.com', '+593-99-111-2222'),
('Dra. María García', 'maria.garcia@arvivet.com', '+593-99-333-4444');

-- Insertar días festivos comunes
INSERT INTO public.holiday (name, date) VALUES
('Año Nuevo', '2024-01-01'),
('Día del Trabajo', '2024-05-01'),
('Independencia de Guayaquil', '2024-10-09'),
('Navidad', '2024-12-25');
```

## 🔐 **Configuración de Autenticación**

### **1. Configurar Proveedores de Auth** (Supabase Dashboard > Authentication > Providers)

#### **Email/Password** (recomendado)

- ✅ **Enable email confirmations**: `true`
- ✅ **Enable secure email change**: `true`
- ✅ **Double confirm email changes**: `true`

#### **Configuración de Email** (Authentication > Settings)

```
Site URL: http://localhost:3000
Redirect URLs:
  - http://localhost:3000/auth/callback
  - https://[tu-dominio].com/auth/callback
```

### **2. Configurar Templates de Email** (opcional)

- **Confirm signup**: Personalizar mensaje de confirmación
- **Magic link**: Configurar enlace mágico
- **Change email address**: Personalizar cambio de email
- **Reset password**: Personalizar recuperación de contraseña

## 🔒 **Configuración de Seguridad**

### **1. JWT Settings** (Authentication > Settings)

- **JWT expiry**: `3600` (1 hora)
- **Refresh token expiry**: `604800` (1 semana)

### **2. Rate Limiting** (recomendado para producción)

```json
{
  "email": {
    "max_frequency": "1 per 60s"
  },
  "sms": {
    "max_frequency": "1 per 60s"
  }
}
```

### **3. Configurar CAPTCHA** (para producción)

- Obtener claves de **hCaptcha** o **reCAPTCHA**
- Configurar en **Authentication > Settings**

## 🌐 **Configuración de API**

### **1. API Settings** (Settings > API)

- **Enable REST API**: ✅ `true`
- **Enable GraphQL API**: ⬜ `false` (no necesario)
- **Enable Realtime**: ✅ `true`

### **2. CORS Settings**

```
Allowed origins:
- http://localhost:3000
- http://localhost:3001
- https://[tu-dominio].com
```

## 📡 **Configuración de Realtime** (opcional)

### **1. Habilitar Realtime** (Database > Replication)

Habilitar realtime para las siguientes tablas:

```sql
-- Para actualizaciones en tiempo real del calendario
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointment;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointment_block;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vet_schedule;
```

### **2. Configurar filtros de Realtime** (opcional)

```sql
-- Solo escuchar cambios de citas activas
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointment
WHERE status NOT IN ('cancelada', 'completada');
```

## 💾 **Configuración de Backup**

### **1. Backup Automático** (Settings > Database)

- **Enable point-in-time recovery**: ✅ `true` (para proyectos Pro)
- **Backup retention**: `7 days` (mínimo recomendado)

### **2. Backup Manual**

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Backup de la base de datos
supabase db dump --db-url "postgresql://[connection-string]" > backup.sql
```

## 🔧 **Configuración de Performance**

### **1. Connection Pooling** (Settings > Database)

- **Pool mode**: `Transaction`
- **Pool size**: `15` (para proyectos pequeños)
- **Max client connections**: `100`

### **2. Índices Personalizados** (si es necesario)

Ejecutar en SQL Editor si se detectan consultas lentas:

```sql
-- Índice para consultas frecuentes de disponibilidad
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointment_vet_date_status
ON public.appointment (vet_id, date, status)
WHERE status NOT IN ('cancelada');

-- Índice para bloqueos por veterinario y fecha
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointment_block_vet_date
ON public.appointment_block (vet_id, date);

-- Índice para horarios por veterinario y día
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vet_schedule_vet_weekday
ON public.vet_schedule (vet_id, weekday);
```

## 📊 **Configuración de Monitoring**

### **1. Logs y Monitoring** (Settings > Logs)

- **Enable logs**: ✅ `true`
- **Log retention**: `1 week` (Free) / `3 months` (Pro)

### **2. Alertas** (Settings > Database)

```
CPU usage > 80%
Memory usage > 80%
Connection count > 80
```

## 🚀 **Configuración de Deployment**

### **1. Variables de Entorno para Producción**

```bash
# Vercel
NEXT_PUBLIC_SUPABASE_URL=https://[proyecto-prod].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key-prod]
NEXT_PUBLIC_APP_URL=https://arvivet.com
NEXT_PUBLIC_API_URL=https://arvivet.com/api

# Railway/Netlify/AWS
# Similar configuración con URLs de producción
```

### **2. Configurar Custom Domain** (opcional)

- **Settings > Custom Domains**
- Configurar `api.arvivet.com` → Supabase API
- Actualizar variables de entorno con nuevo dominio

## 🧪 **Configuración de Testing**

### **1. Base de Datos de Testing**

```bash
# Variables para testing
NEXT_PUBLIC_SUPABASE_URL=https://[proyecto-test].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key-test]
```

### **2. Reset de BD para Tests**

```sql
-- Script para limpiar datos de test
TRUNCATE TABLE public.appointment CASCADE;
TRUNCATE TABLE public.appointment_block CASCADE;
TRUNCATE TABLE public.vet_schedule CASCADE;
-- Mantener datos maestros (roles, especialidades, etc.)
```

## ✅ **Checklist de Configuración**

### **Configuración Básica**

- [ ] Proyecto Supabase creado
- [ ] Variables de entorno configuradas
- [ ] Políticas RLS ejecutadas
- [ ] Datos de ejemplo insertados (opcional)

### **Seguridad**

- [ ] Autenticación configurada
- [ ] Templates de email personalizados
- [ ] Rate limiting habilitado
- [ ] CORS configurado correctamente

### **Performance**

- [ ] Connection pooling configurado
- [ ] Índices de rendimiento creados
- [ ] Realtime configurado (si se usa)

### **Producción**

- [ ] Backup automático habilitado
- [ ] Monitoring y alertas configuradas
- [ ] Variables de entorno de producción
- [ ] Custom domain configurado (opcional)

### **Testing**

- [ ] Entorno de testing configurado
- [ ] Scripts de reset de BD creados
- [ ] CI/CD configurado con variables de test

## 🚨 **Solución de Problemas Comunes**

### **Error: "Invalid API key"**

- Verificar que `NEXT_PUBLIC_SUPABASE_ANON_KEY` sea correcta
- Verificar que no haya espacios extra en las variables

### **Error: "Row Level Security policy violation"**

- Verificar que las políticas RLS estén correctamente aplicadas
- Verificar que el usuario tenga el rol correcto en la BD

### **Error: "Failed to fetch"**

- Verificar configuración de CORS
- Verificar que la URL de Supabase sea correcta

### **Lentitud en consultas**

- Revisar índices en Database > Indexes
- Analizar queries lentas en Logs
- Considerar optimización de políticas RLS

### **Problemas de autenticación**

- Verificar configuración de Site URL y Redirect URLs
- Revisar logs de autenticación en Dashboard
- Verificar que el usuario esté confirmado

## 📞 **Soporte y Recursos**

- **Documentación oficial**: [docs.supabase.com](https://docs.supabase.com)
- **Discord de Supabase**: [discord.supabase.com](https://discord.supabase.com)
- **Status page**: [status.supabase.com](https://status.supabase.com)
- **Dashboard de proyecto**: `https://app.supabase.com/project/[project-id]`

---

**⚠️ Importante**: Mantener las claves `service_role` seguras y nunca exponerlas en el frontend. Solo usar en operaciones del servidor que requieran permisos elevados.
