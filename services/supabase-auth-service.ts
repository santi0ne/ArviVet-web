import { supabase } from '@/lib/supabase';
import type { User, Session, AuthError } from '@supabase/supabase-js';

// Tipos para la respuesta de autenticación
interface AuthResponse {
  success: boolean;
  data?: {
    user: User;
    session: Session;
    userData?: {
      id: number;
      nombre: string;
      correo: string;
      rol: string;
      telefono?: string;
    };
  };
  error?: string;
}

// Interfaz para los datos de login
interface LoginCredentials {
  email: string;
  password: string;
  userType?: string; // Para compatibilidad con el sistema actual
}

// Interfaz para registro de usuarios
interface RegisterData {
  email: string;
  password: string;
  nombre: string;
  telefono?: string;
  direccion?: string;
  rol_id: number;
}

class SupabaseAuthService {
  
  // Método para iniciar sesión con Supabase
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const { email, password } = credentials;

      // 1. Autenticar con Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error('Supabase auth error:', authError);
        return {
          success: false,
          error: this.getErrorMessage(authError),
        };
      }

      if (!authData.user || !authData.session) {
        return {
          success: false,
          error: 'Error de autenticación: datos incompletos',
        };
      }

      // 2. Obtener datos del usuario desde la tabla users
      const userData = await this.getUserData(authData.user.email!);

      // 3. Almacenar información en localStorage para compatibilidad
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth-token', authData.session.access_token);
        localStorage.setItem('user-type', userData?.rol || '');
        localStorage.setItem('user-data', JSON.stringify({
          id: userData?.id || authData.user.id,
          email: authData.user.email,
          name: userData?.nombre || authData.user.email,
          userType: userData?.rol || '',
        }));
      }

      return {
        success: true,
        data: {
          user: authData.user,
          session: authData.session,
          userData: userData || undefined,
        },
      };

    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Error de conexión. Intente nuevamente.',
      };
    }
  }

  // Método para registrar nuevos usuarios
  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      // 1. Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
      });

      if (authError) {
        return {
          success: false,
          error: this.getErrorMessage(authError),
        };
      }

      if (!authData.user) {
        return {
          success: false,
          error: 'Error al crear el usuario',
        };
      }

      // 2. Crear registro en la tabla users
      const { error: dbError } = await supabase
        .from('users')
        .insert({
          correo: userData.email,
          nombre: userData.nombre,
          telefono: userData.telefono,
          direccion: userData.direccion,
          rol_id: userData.rol_id,
          // La contraseña se maneja en Supabase Auth, no en la tabla
        });

      if (dbError) {
        console.error('Database error:', dbError);
        // Si falla la inserción en la tabla, eliminar el usuario de Auth
        await supabase.auth.admin.deleteUser(authData.user.id);
        return {
          success: false,
          error: 'Error al crear el perfil del usuario',
        };
      }

      return {
        success: true,
        data: {
          user: authData.user,
          session: authData.session!,
        },
      };

    } catch (error) {
      console.error('Register error:', error);
      return {
        success: false,
        error: 'Error de conexión. Intente nuevamente.',
      };
    }
  }

  // Método para cerrar sesión
  async logout(): Promise<void> {
    try {
      await supabase.auth.signOut();
      
      // Limpiar localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-token');
        localStorage.removeItem('user-type');
        localStorage.removeItem('user-data');
        localStorage.removeItem('selectedUserType');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  // Método para obtener la sesión actual
  async getCurrentSession(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession();
    return data.session;
  }

  // Método para obtener el usuario actual
  async getCurrentUser(): Promise<User | null> {
    const { data } = await supabase.auth.getUser();
    return data.user;
  }

  // Método para verificar si el usuario está autenticado
  async isAuthenticated(): Promise<boolean> {
    const session = await this.getCurrentSession();
    return !!session && !!session.user;
  }

  // Método para obtener datos del usuario desde la base de datos
  private async getUserData(email: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          nombre,
          correo,
          telefono,
          u_roles:rol_id (
            nombre
          )
        `)
        .eq('correo', email)
        .single();

      if (error) {
        console.error('Error fetching user data:', error);
        return null;
      }

      return {
        id: data.id,
        nombre: data.nombre,
        correo: data.correo,
        telefono: data.telefono,
        rol: Array.isArray(data.u_roles) && data.u_roles.length > 0 
          ? data.u_roles[0].nombre 
          : (data.u_roles as any)?.nombre || '',
      };
    } catch (error) {
      console.error('getUserData error:', error);
      return null;
    }
  }

  // Método para obtener el tipo de usuario
  async getUserType(): Promise<string | null> {
    const session = await this.getCurrentSession();
    if (!session) return null;

    const userData = await this.getUserData(session.user.email!);
    return userData?.rol || null;
  }

  // Método para manejar cambios en el estado de autenticación
  onAuthStateChange(callback: (session: Session | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      callback(session);
    });
  }

  // Método para resetear contraseña
  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        return {
          success: false,
          error: this.getErrorMessage(error),
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Error de conexión. Intente nuevamente.',
      };
    }
  }

  // Método privado para obtener mensajes de error legibles
  private getErrorMessage(error: AuthError): string {
    switch (error.message) {
      case 'Invalid login credentials':
        return 'Credenciales inválidas. Verifique su email y contraseña.';
      case 'Email not confirmed':
        return 'Por favor confirme su email antes de iniciar sesión.';
      case 'Too many requests':
        return 'Demasiados intentos. Intente nuevamente en unos minutos.';
      case 'User already registered':
        return 'Este email ya está registrado.';
      default:
        return error.message || 'Error de autenticación';
    }
  }

  // Método para crear usuarios de prueba
  async createTestUsers(): Promise<void> {
    const testUsers = [
      {
        email: 'admin@arvivet.com',
        password: 'admin123',
        nombre: 'Administrador ArviVet',
        rol_id: 1, // admin
      },
      {
        email: 'vet@arvivet.com',
        password: 'vet123',
        nombre: 'Dr. Veterinario',
        rol_id: 2, // veterinario
      },
    ];

    for (const user of testUsers) {
      try {
        await this.register(user);
        console.log(`Usuario de prueba creado: ${user.email}`);
      } catch (error) {
        console.log(`Usuario ${user.email} ya existe o error:`, error);
      }
    }
  }
}

// Exportar instancia del servicio
export const supabaseAuthService = new SupabaseAuthService();