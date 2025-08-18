# 🔐 Migración de Autenticación a Supabase

## 🚨 **PROBLEMA IDENTIFICADO**

Tu sistema de login **NO ESTÁ CONECTADO A SUPABASE**. Actualmente usa:

- ❌ Credenciales hardcodeadas en el código
- ❌ `localStorage` para simular autenticación
- ❌ No hay conexión real con Supabase Auth
- ❌ Las políticas RLS fallan porque no reconoce usuarios reales

## 📋 **PLAN DE MIGRACIÓN**

### **Archivos Creados:**

1. `services/supabase-auth-service.ts` - Servicio real de Supabase Auth
2. `hooks/use-supabase-auth.ts` - Hook actualizado para Supabase
3. `components/auth/auth-provider.tsx` - Provider de contexto
4. `database/setup-auth-users.sql` - Script para crear usuarios

### **Migración Paso a Paso:**

---

## 🔧 **PASO 1: Configurar Usuarios en Supabase (CRÍTICO)**

### **1.1. Ejecutar SQL en Supabase Dashboard:**

```sql
-- Ir a Supabase Dashboard > SQL Editor
-- Ejecutar todo el contenido de: database/setup-auth-users.sql
```

### **1.2. Crear Usuarios en Supabase Auth:**

En **Supabase Dashboard > Authentication > Users**:

**Crear estos usuarios manualmente:**

1. **Email:** `admin@arvivet.com` **Password:** `admin123`
2. **Email:** `vet@arvivet.com` **Password:** `vet123`
3. **Email:** `cliente@test.com` **Password:** `test123`

### **1.3. Verificar Creación:**

Ejecutar en SQL Editor:

```sql
-- Verificar usuarios en la tabla
SELECT u.nombre, u.correo, r.nombre as rol
FROM users u
JOIN u_roles r ON u.rol_id = r.id;

-- Verificar mascotas de prueba
SELECT p.name, u.nombre as owner
FROM pet p
JOIN users u ON p.owner_id = u.id;
```

---

## 🔧 **PASO 2: Actualizar el Sistema de Login**

### **2.1. Reemplazar el hook de autenticación:**

**Editar:** `components/auth/login-form.tsx`

```typescript
// CAMBIAR ESTA LÍNEA:
import { useAuth } from '@/hooks/use-auth';

// POR ESTA:
import { useAuth } from '@/hooks/use-supabase-auth';
```

### **2.2. Actualizar páginas que usan autenticación:**

**Editar:** `app/dashboard/patients/page.tsx`

```typescript
// CAMBIAR:
import { authService } from '@/services/auth-service';

// POR:
import { useAuthContext } from '@/components/auth/auth-provider';

// Y cambiar la verificación:
// DE: if (!authService.isAuthenticated())
// A: const { isAuthenticated } = useAuthContext();
//    if (!isAuthenticated())
```

### **2.3. Envolver la app con AuthProvider:**

**Editar:** `app/layout.tsx`

```typescript
import { AuthProvider } from '@/components/auth/auth-provider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
```

---

## 🔧 **PASO 3: Probar la Migración**

### **3.1. Iniciar el servidor:**

```bash
npm run dev
```

### **3.2. Probar login:**

1. Ir a `http://localhost:3000/login`
2. Usar credenciales: `admin@arvivet.com` / `admin123`
3. Verificar que redirige al dashboard
4. Verificar que aparecen las mascotas

### **3.3. Verificar en consola del navegador:**

```javascript
// Debería mostrar:
// "User authenticated with Supabase: admin@arvivet.com"
// "Pets fetched successfully: X"
```

---

## 🔧 **PASO 4: Solucionar Problemas Comunes**

### **Error: "Usuario no autenticado"**

1. Verificar que el usuario existe en Supabase Auth
2. Verificar que existe en la tabla `users`
3. Verificar políticas RLS

### **Error: "Row Level Security policy violation"**

1. Ejecutar políticas temporales del SQL
2. Verificar que `auth.email()` retorna el email correcto

### **Error: "Failed to fetch"**

1. Verificar conexión a Supabase
2. Verificar variables de entorno
3. Verificar CORS en Supabase

---

## 🧪 **MODO DE TESTING RÁPIDO**

Si quieres probar inmediatamente sin migración completa:

### **Deshabilitar RLS temporalmente:**

```sql
-- TEMPORAL (solo para testing)
ALTER TABLE public.pet DISABLE ROW LEVEL SECURITY;
```

### **Usar el sistema viejo pero con Supabase conectado:**

Cambiar solo el servicio de mascotas para usar sesiones reales.

---

## 📊 **CRONOGRAMA DE MIGRACIÓN**

### **OPCIÓN A: Migración Completa (Recomendado)**

- ⏱️ **Tiempo:** 2-3 horas
- ✅ **Beneficios:** Sistema robusto y seguro
- 🔧 **Pasos:** Todos los pasos 1-4

### **OPCIÓN B: Fix Rápido**

- ⏱️ **Tiempo:** 30 minutos
- ⚠️ **Limitaciones:** Menos seguro
- 🔧 **Pasos:** Solo crear usuarios + deshabilitar RLS

### **OPCIÓN C: Híbrido (Para despliegue rápido)**

- ⏱️ **Tiempo:** 1 hora
- 🎯 **Objetivo:** Funciona para demo
- 🔧 **Pasos:** Paso 1 + políticas permisivas

---

## 🚀 **RECOMENDACIÓN FINAL**

**Para desplegar YA:**

1. Ejecutar `database/setup-auth-users.sql`
2. Crear usuarios en Supabase Auth manualmente
3. Usar políticas RLS permisivas temporales
4. Desplegar con el sistema actual
5. Migrar completamente después del despliegue

**¿Por qué esta estrategia?**

- ✅ Te permite desplegar inmediatamente
- ✅ Las mascotas funcionarán
- ✅ El login funcionará con Supabase
- ✅ Puedes optimizar después

---

## 📞 **Siguiente Paso INMEDIATO**

**Ejecuta AHORA en Supabase Dashboard:**

```sql
-- Política temporal MUY permisiva
DROP POLICY IF EXISTS "pet_select_owner" ON public.pet;
CREATE POLICY "pet_select_all_authenticated" ON public.pet
  FOR SELECT USING (auth.role() = 'authenticated');
```

**Y crea estos usuarios en Authentication > Users:**

- `admin@arvivet.com` / `admin123`
- `vet@arvivet.com` / `vet123`

¡Con esto tu app funcionará inmediatamente! 🎉
