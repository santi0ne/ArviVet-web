// Define el servicio de autenticación usando Supabase Auth
import type { LoginFormData } from "@/lib/validations/auth"
import { supabase } from "@/lib/supabase"

// Interfaz para la respuesta de la autenticación
interface AuthResponse {
  success: boolean // Indica si la operación fue exitosa
  data?: {
    // Datos del usuario y token si es exitosa
    user: {
      id: string
      email: string
      name: string
      userType: string
    }
    token: string
  }
  error?: string // Mensaje de error si falla
}

// Clase que encapsula la lógica de autenticación
class AuthService {
  private readonly baseUrl = "/api" // URL base para futuras llamadas a la API (actualmente no usada en el mock)

  // Método para autenticación con Supabase Auth real
  async login(credentials: LoginFormData): Promise<AuthResponse> {
    try {
      const { email, password, userType } = credentials

      // Intentar login con Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        console.error('Supabase auth error:', authError)
        return {
          success: false,
          error: `Error de autenticación: ${authError.message}`,
        }
      }

      if (!authData.user) {
        return {
          success: false,
          error: "No se pudo obtener la información del usuario",
        }
      }

      // Obtener información del usuario de la base de datos
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          id, 
          nombre, 
          correo, 
          rol_id,
          u_roles(nombre)
        `)
        .eq('correo', email)
        .single()

      if (userError) {
        console.error('User data error:', userError)
        // Si no encuentra el usuario en la DB, crear uno básico
        const defaultUser = {
          id: authData.user.id,
          email: authData.user.email || email,
          name: email.split('@')[0],
          userType: userType || 'cliente',
        }

        // Almacenar datos en localStorage para compatibilidad
        if (typeof window !== "undefined") {
          localStorage.setItem("auth-token", authData.session?.access_token || "")
          localStorage.setItem("user-type", userType || 'cliente')
          localStorage.setItem("user-data", JSON.stringify(defaultUser))
        }

        return {
          success: true,
          data: {
            user: defaultUser,
            token: authData.session?.access_token || "",
          },
        }
      }

      // Mapear el rol de la base de datos al userType esperado
      const roleMapping: Record<string, string> = {
        'Administrador': 'administrativo',
        'admin': 'administrativo',
        'Admin': 'administrativo',
        'Veterinario': 'veterinario',
        'veterinario': 'veterinario',
        'Vet': 'veterinario',
        'vet': 'veterinario',
        'Cliente': 'cliente',
        'cliente': 'cliente',
        'Asistente': 'asistente',
        'asistente': 'asistente'
      }

      const dbUserType = Array.isArray(userData.u_roles) && userData.u_roles.length > 0 
        ? userData.u_roles[0].nombre 
        : (userData.u_roles as any)?.nombre || 'Cliente'
      const mappedUserType = roleMapping[dbUserType] || 'cliente'

      // Verificar que el tipo de usuario coincida con el solicitado (si se especificó)
      if (userType && mappedUserType !== userType) {
        await supabase.auth.signOut()
        return {
          success: false,
          error: `Su cuenta está registrada como ${dbUserType}, no como ${userType}`,
        }
      }

      const user = {
        id: authData.user.id,
        email: authData.user.email || email,
        name: userData.nombre,
        userType: mappedUserType,
      }

      // Almacenar datos en localStorage para compatibilidad
      if (typeof window !== "undefined") {
        localStorage.setItem("auth-token", authData.session?.access_token || "")
        localStorage.setItem("user-type", mappedUserType)
        localStorage.setItem("user-data", JSON.stringify(user))
      }

      return {
        success: true,
        data: {
          user,
          token: authData.session?.access_token || "",
        },
      }
    } catch (error) {
      console.error('Login error:', error)
      return {
        success: false,
        error: "Error de conexión con el servidor. Intente nuevamente.",
      }
    }
  }

  // Método para cerrar sesión con Supabase
  async logout(): Promise<void> {
    try {
      // Cerrar sesión en Supabase
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Logout error:', error)
    }
    
    // Elimina los datos de autenticación de localStorage
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth-token")
      localStorage.removeItem("user-type")
      localStorage.removeItem("user-data")
      localStorage.removeItem("selectedUserType")
    }
  }

  // Método para obtener el token de autenticación
  private getToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("auth-token")
    }
    return null
  }

  // Método para verificar si el usuario está autenticado
  isAuthenticated(): boolean {
    return !!this.getToken()
  }

  // Método para obtener el tipo de usuario
  getUserType(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("user-type")
    }
    return null
  }

  // Método para obtener los datos completos del usuario
  getUserData(): any {
    if (typeof window !== "undefined") {
      const userData = localStorage.getItem("user-data")
      return userData ? JSON.parse(userData) : null
    }
    return null
  }
}

// Exporta una instancia del servicio de autenticación
export const authService = new AuthService()
