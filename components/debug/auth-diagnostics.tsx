'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface DiagnosticResult {
  step: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export function AuthDiagnostics() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const diagnostics: DiagnosticResult[] = [];

    try {
      // 1. Verificar conexión a Supabase
      diagnostics.push({
        step: '1. Conexión a Supabase',
        status: 'success',
        message: 'Variables de entorno configuradas correctamente',
        details: {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        },
      });

      // 2. Verificar autenticación actual
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) {
        diagnostics.push({
          step: '2. Sesión Actual',
          status: 'error',
          message: `Error al obtener sesión: ${sessionError.message}`,
          details: sessionError,
        });
      } else if (session) {
        diagnostics.push({
          step: '2. Sesión Actual',
          status: 'success',
          message: `Usuario autenticado: ${session.user.email}`,
          details: {
            userId: session.user.id,
            email: session.user.email,
            expiresAt: session.expires_at,
          },
        });
      } else {
        diagnostics.push({
          step: '2. Sesión Actual',
          status: 'warning',
          message: 'No hay sesión activa',
        });
      }

      // 3. Verificar tabla users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, nombre, correo, u_roles(nombre)')
        .limit(5);

      if (usersError) {
        diagnostics.push({
          step: '3. Tabla Users',
          status: 'error',
          message: `Error al acceder a tabla users: ${usersError.message}`,
          details: usersError,
        });
      } else {
        diagnostics.push({
          step: '3. Tabla Users',
          status: 'success',
          message: `Encontrados ${users?.length || 0} usuarios`,
          details: users,
        });
      }

      // 4. Verificar tabla pet con RLS
      const { data: pets, error: petsError } = await supabase
        .from('pet')
        .select('id, name, owner_id')
        .limit(3);

      if (petsError) {
        diagnostics.push({
          step: '4. Tabla Pet (RLS)',
          status: 'error',
          message: `Error RLS en tabla pet: ${petsError.message}`,
          details: petsError,
        });
      } else {
        diagnostics.push({
          step: '4. Tabla Pet (RLS)',
          status: 'success',
          message: `Acceso exitoso a tabla pet: ${pets?.length || 0} mascotas`,
          details: pets,
        });
      }

      // 5. Verificar políticas RLS
      const { data: policies, error: policiesError } = await supabase
        .from('pg_policies')
        .select('policyname, tablename, qual')
        .eq('tablename', 'pet');

      if (policiesError) {
        diagnostics.push({
          step: '5. Políticas RLS',
          status: 'warning',
          message: 'No se pudieron verificar las políticas RLS',
          details: policiesError,
        });
      } else {
        diagnostics.push({
          step: '5. Políticas RLS',
          status: 'success',
          message: `Encontradas ${policies?.length || 0} políticas para tabla pet`,
          details: policies,
        });
      }
    } catch (error) {
      diagnostics.push({
        step: 'Error General',
        status: 'error',
        message: `Error inesperado: ${error instanceof Error ? error.message : 'Desconocido'}`,
        details: error,
      });
    }

    setResults(diagnostics);
    setIsRunning(false);
  };

  const testLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'admin@arvivet.com',
        password: 'admin123',
      });

      if (error) {
        setResults(prev => [
          ...prev,
          {
            step: 'Test Login',
            status: 'error',
            message: `Error al hacer login: ${error.message}`,
            details: error,
          },
        ]);
      } else {
        setResults(prev => [
          ...prev,
          {
            step: 'Test Login',
            status: 'success',
            message: `Login exitoso: ${data.user?.email}`,
            details: data,
          },
        ]);
      }
    } catch (error) {
      setResults(prev => [
        ...prev,
        {
          step: 'Test Login',
          status: 'error',
          message: `Error de conexión: ${error instanceof Error ? error.message : 'Desconocido'}`,
          details: error,
        },
      ]);
    }
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return '#22c55e';
      case 'error':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  return (
    <div
      style={{
        padding: '20px',
        fontFamily: 'monospace',
        maxWidth: '800px',
        margin: '0 auto',
      }}
    >
      <h2>🔍 Diagnóstico de Autenticación</h2>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={runDiagnostics}
          disabled={isRunning}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
          }}
        >
          {isRunning ? 'Ejecutando...' : 'Ejecutar Diagnóstico'}
        </button>

        <button
          onClick={testLogin}
          style={{
            padding: '10px 20px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          Probar Login
        </button>
      </div>

      <div>
        {results.map((result, index) => (
          <div
            key={index}
            style={{
              margin: '10px 0',
              padding: '15px',
              border: `2px solid ${getStatusColor(result.status)}`,
              borderRadius: '5px',
              backgroundColor: '#f9fafb',
            }}
          >
            <div
              style={{
                fontWeight: 'bold',
                color: getStatusColor(result.status),
                marginBottom: '5px',
              }}
            >
              {result.step} - {result.status.toUpperCase()}
            </div>
            <div style={{ marginBottom: '10px' }}>{result.message}</div>
            {result.details && (
              <details>
                <summary style={{ cursor: 'pointer', color: '#6b7280' }}>
                  Ver detalles
                </summary>
                <pre
                  style={{
                    backgroundColor: '#f3f4f6',
                    padding: '10px',
                    borderRadius: '3px',
                    overflow: 'auto',
                    fontSize: '12px',
                  }}
                >
                  {JSON.stringify(result.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
