'use client';

import { useState, useEffect } from 'react';
import { authService } from '@/services/auth-service';
import { supabase } from '@/lib/supabase';

export interface UserPermissions {
  canModifySchedules: boolean;
  canViewAllVets: boolean;
  canViewAllPets: boolean;
  canManageStaff: boolean;
  canViewReports: boolean;
  isAdmin: boolean;
  isVet: boolean;
  currentUserId?: string;
  currentVetId?: number;
  userRole: string;
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<UserPermissions>({
    canModifySchedules: false,
    canViewAllVets: false,
    canViewAllPets: false,
    canManageStaff: false,
    canViewReports: false,
    isAdmin: false,
    isVet: false,
    userRole: '',
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserPermissions();
  }, []);

  const loadUserPermissions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Verificar autenticación
      if (!authService.isAuthenticated()) {
        throw new Error('Usuario no autenticado');
      }

      // Obtener datos del usuario
      const userData = authService.getUserData();
      const userType = authService.getUserType();

      if (!userData || !userType) {
        throw new Error('Datos de usuario no disponibles');
      }

      // Obtener sesión de Supabase para ID real
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;

      // Obtener información del veterinario si es veterinario
      let currentVetId: number | undefined;
      if (userType === 'veterinario') {
        const { data: vetData } = await supabase
          .from('vet')
          .select('id')
          .eq('email', userData.email)
          .single();

        currentVetId = vetData?.id;
      }

      // Determinar permisos basados en el rol
      const isAdmin = userType === 'administrativo';
      const isVet = userType === 'veterinario';

      const userPermissions: UserPermissions = {
        canModifySchedules: isAdmin, // Solo admins pueden modificar horarios
        canViewAllVets: isAdmin, // Solo admins ven todos los veterinarios
        canViewAllPets: isAdmin, // Solo admins ven todas las mascotas
        canManageStaff: isAdmin, // Solo admins pueden gestionar personal
        canViewReports: isAdmin, // Solo admins ven reportes completos
        isAdmin,
        isVet,
        currentUserId,
        currentVetId,
        userRole: userType,
      };

      setPermissions(userPermissions);
    } catch (err) {
      console.error('Error loading permissions:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (
    permission: keyof Omit<
      UserPermissions,
      'currentUserId' | 'currentVetId' | 'userRole'
    >
  ): boolean => {
    return permissions[permission];
  };

  const canEditAppointment = (appointment: any): boolean => {
    if (permissions.isAdmin) return true;
    if (permissions.isVet && permissions.currentVetId) {
      return appointment.vet_id === permissions.currentVetId;
    }
    return false;
  };

  const canViewAppointment = (appointment: any): boolean => {
    if (permissions.isAdmin) return true;
    if (permissions.isVet && permissions.currentVetId) {
      return appointment.vet_id === permissions.currentVetId;
    }
    return false;
  };

  const canCreateScheduleFor = (vetId: number): boolean => {
    if (permissions.isAdmin) return true;
    if (permissions.isVet && permissions.currentVetId) {
      return vetId === permissions.currentVetId;
    }
    return false;
  };

  return {
    permissions: {
      ...permissions,
      canEditAppointment,
      canViewAppointment,
      canCreateScheduleFor,
    },
    loading,
    error,
    hasPermission,
    canEditAppointment,
    canViewAppointment,
    canCreateScheduleFor,
    refetch: loadUserPermissions,
  };
}
