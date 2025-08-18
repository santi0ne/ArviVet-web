'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Session, User } from '@supabase/supabase-js';
import { supabaseAuthService } from '@/services/supabase-auth-service';

// Interfaz para el estado del usuario
interface UserData {
  id: number;
  nombre: string;
  correo: string;
  telefono?: string;
  rol: string;
}

// Interfaz para credenciales de login
interface LoginCredentials {
  email: string;
  password: string;
  userType?: string;
}

// Hook personalizado para manejar autenticación con Supabase
export function useSupabaseAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Efecto para inicializar la autenticación y escuchar cambios
  useEffect(() => {
    initializeAuth();

    // Escuchar cambios en el estado de autenticación
    const { data: authListener } = supabaseAuthService.onAuthStateChange(
      async session => {
        console.log('Auth state changed:', session?.user?.email);
        setSession(session);
        setUser(session?.user || null);

        if (session?.user) {
          // Obtener datos adicionales del usuario
          await loadUserData(session.user.email!);
        } else {
          setUserData(null);
          clearStorageData();
        }

        setIsInitializing(false);
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Función para inicializar la autenticación
  const initializeAuth = async () => {
    try {
      const currentSession = await supabaseAuthService.getCurrentSession();
      setSession(currentSession);
      setUser(currentSession?.user || null);

      if (currentSession?.user) {
        await loadUserData(currentSession.user.email!);
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  // Función para cargar datos del usuario desde la base de datos
  const loadUserData = async (email: string) => {
    try {
      // Aquí podrías hacer una consulta directa a la tabla users
      // Por ahora usamos el método del servicio
      const userType = await supabaseAuthService.getUserType();

      // Actualizar localStorage para compatibilidad
      if (typeof window !== 'undefined' && session) {
        localStorage.setItem('auth-token', session.access_token);
        localStorage.setItem('user-type', userType || '');
        localStorage.setItem(
          'user-data',
          JSON.stringify({
            id: user?.id,
            email: user?.email,
            name: email,
            userType: userType || '',
          })
        );
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // Función para limpiar datos del localStorage
  const clearStorageData = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-token');
      localStorage.removeItem('user-type');
      localStorage.removeItem('user-data');
      localStorage.removeItem('selectedUserType');
    }
  };

  // Función para iniciar sesión
  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await supabaseAuthService.login(credentials);

      if (result.success && result.data) {
        console.log('Login successful:', result.data.user.email);

        // La redirección se manejará automáticamente por el listener
        // pero podemos forzarla aquí también
        setTimeout(() => {
          router.push('/dashboard');
        }, 100);

        return result;
      } else {
        const errorMessage = result.error || 'Error al iniciar sesión';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error de conexión';
      setError(errorMessage);
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Función para cerrar sesión
  const logout = async () => {
    setIsLoading(true);
    try {
      await supabaseAuthService.logout();
      setSession(null);
      setUser(null);
      setUserData(null);
      clearStorageData();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      setError('Error al cerrar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para verificar si el usuario está autenticado
  const isAuthenticated = (): boolean => {
    return !!(session && user);
  };

  // Función para obtener el tipo de usuario
  const getUserType = (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('user-type');
    }
    return null;
  };

  // Función para obtener datos del usuario
  const getUserData = () => {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem('user-data');
      return data ? JSON.parse(data) : null;
    }
    return null;
  };

  // Función para limpiar errores
  const clearError = () => {
    setError(null);
  };

  // Función para crear usuarios de prueba (solo desarrollo)
  const createTestUsers = async () => {
    if (process.env.NODE_ENV === 'development') {
      try {
        await supabaseAuthService.createTestUsers();
        console.log('Test users created successfully');
      } catch (error) {
        console.error('Error creating test users:', error);
      }
    }
  };

  return {
    // Estados
    isLoading,
    isInitializing,
    session,
    user,
    userData,
    error,

    // Funciones
    login,
    logout,
    isAuthenticated,
    getUserType,
    getUserData,
    clearError,
    createTestUsers,
  };
}

// Hook de compatibilidad que mantiene la misma interfaz que el anterior
export function useAuth() {
  const { isLoading, login, logout, error, clearError } = useSupabaseAuth();

  return {
    isLoading,
    login,
    logout,
    error,
    clearError,
  };
}
