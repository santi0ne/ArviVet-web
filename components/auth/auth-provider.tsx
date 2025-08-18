'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';
import type { Session, User } from '@supabase/supabase-js';

// Contexto de autenticación
interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isInitializing: boolean;
  login: (credentials: any) => Promise<any>;
  logout: () => Promise<void>;
  isAuthenticated: () => boolean;
  getUserType: () => string | null;
  createTestUsers: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider de autenticación
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useSupabaseAuth();

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

// Hook para usar el contexto de autenticación
export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

// Componente para mostrar el estado de autenticación (debugging)
export function AuthDebugger() {
  const { session, user, isLoading, isInitializing, error } = useAuthContext();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '12px',
        zIndex: 9999,
        maxWidth: '300px',
      }}
    >
      <div>
        <strong>Auth Debug</strong>
      </div>
      <div>Initializing: {isInitializing ? 'Yes' : 'No'}</div>
      <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
      <div>Session: {session ? 'Active' : 'None'}</div>
      <div>User: {user?.email || 'None'}</div>
      {error && <div style={{ color: 'red' }}>Error: {error}</div>}
    </div>
  );
}

// Componente de protección de rutas
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitializing, session } = useAuthContext();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (!isInitializing) {
      if (isAuthenticated()) {
        setShowContent(true);
      } else {
        // Redirigir al login si no está autenticado
        window.location.href = '/login';
      }
    }
  }, [isAuthenticated, isInitializing]);

  if (isInitializing) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <div>Verificando autenticación...</div>
      </div>
    );
  }

  if (!showContent || !session) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <div>Redirigiendo al login...</div>
      </div>
    );
  }

  return <>{children}</>;
}
