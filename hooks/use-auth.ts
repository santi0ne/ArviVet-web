'use client'; // Marca este hook como un Client Component de React

import { useState } from 'react'; // Hook de React para estado
import { useRouter } from 'next/navigation'; // Hook de Next.js para navegación

import { authService } from '@/services/auth-service'; // Servicio de autenticación
import type { LoginFormData } from '@/lib/validations/auth'; // Tipo de datos para el formulario de login

// Hook personalizado para manejar la lógica de autenticación
export function useAuth() {
  const [isLoading, setIsLoading] = useState(false); // Estado para indicar si la autenticación está en progreso
  const router = useRouter(); // Inicializa el router para redirecciones

  // Función para iniciar sesión
  const login = async (credentials: LoginFormData) => {
    setIsLoading(true); // Activa el estado de carga

    try {
      const result = await authService.login(credentials); // Llama al servicio de autenticación

      if (result.success) {
        // Redirige al dashboard inmediatamente después del login exitoso
        // Mensaje de bienvenida eliminado (alert)
        if (typeof window !== 'undefined') {
          localStorage.removeItem('selectedUserType');
        }
        router.push('/dashboard'); // Redirige al dashboard
      } else {
        // Mensaje de error de credenciales inválidas eliminado (alert)
        console.error(
          'Login failed:',
          result.error || 'Error al iniciar sesión'
        );
      }
    } catch (error) {
      // Mensaje de error de conexión eliminado (alert)
      console.error('Connection error:', error);
      throw error; // Propaga el error para que pueda ser manejado externamente si es necesario
    } finally {
      setIsLoading(false); // Desactiva el estado de carga al finalizar
    }
  };

  // Función para cerrar sesión
  const logout = async () => {
    try {
      await authService.logout(); // Llama al servicio para cerrar sesión
      // Mensaje de sesión cerrada eliminado (alert)
      router.push('/'); // Redirige a la página principal después de cerrar sesión
    } catch (error) {
      // Mensaje de error al cerrar sesión eliminado (alert)
      console.error('Logout error:', error);
    }
  };

  return {
    login, // Función para iniciar sesión
    logout, // Función para cerrar sesión
    isLoading, // Estado de carga
  };
}
