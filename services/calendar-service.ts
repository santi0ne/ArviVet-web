import { supabase } from '@/lib/supabase';
import type { Appointment } from '@/types/appointment';
import type { UserPermissions } from '@/hooks/use-permissions';

export interface CalendarFilters {
  startDate?: string;
  endDate?: string;
  vetId?: number;
  status?: string[];
  specialityId?: number;
}

export interface AppointmentWithDetails {
  id: number;
  user_id: number;
  date: string;
  hour: string;
  duration_minutes: number;
  speciality_id: number;
  pet_id: number;
  branch_id: number;
  vet_id: number;
  status: string;
  pet?: {
    id: number;
    name: string;
    specie: string;
    breed: string;
  };
  users?: {
    id: number;
    nombre: string;
    correo: string;
    telefono?: string;
    direccion?: string;
  };
  vet?: {
    id: number;
    name: string;
    email: string;
    telephone: string;
  };
  speciality?: {
    id: number;
    name: string;
  };
  branch?: {
    id: number;
    direction: string;
    telephone: string;
  };
}

class CalendarService {
  
  // Obtener citas con filtros y permisos aplicados
  async getAppointments(
    filters: CalendarFilters = {}, 
    permissions: UserPermissions
  ): Promise<{ data: AppointmentWithDetails[] | null; error: string | null }> {
    try {
      let query = supabase
        .from('appointment')
        .select(`
          id,
          user_id,
          date,
          hour,
          duration_minutes,
          speciality_id,
          pet_id,
          branch_id,
          vet_id,
          status,
          pet!pet_id (
            id,
            name,
            breed
          ),
          users!user_id (
            id,
            nombre,
            correo,
            telefono,
            direccion
          ),
          vet!vet_id (
            id,
            name,
            email,
            telephone
          ),
          speciality!speciality_id (
            id,
            name
          ),
          branch!branch_id (
            id,
            direction,
            telephone
          )
        `);

      // Aplicar filtros basados en permisos
      if (permissions.isVet && permissions.currentVetId) {
        // Veterinarios solo ven sus propias citas
        query = query.eq('vet_id', permissions.currentVetId);
      }

      // Aplicar filtros adicionales
      if (filters.vetId && permissions.canViewAllVets) {
        query = query.eq('vet_id', filters.vetId);
      }

      if (filters.startDate) {
        query = query.gte('date', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('date', filters.endDate);
      }

      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters.specialityId) {
        query = query.eq('speciality_id', filters.specialityId);
      }

      // Ordenar por fecha y hora
      query = query.order('date', { ascending: true })
                  .order('hour', { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching appointments:', error);
        return { data: null, error: error.message };
      }

      // Mapear los datos para asegurar compatibilidad de tipos
      const mappedData: AppointmentWithDetails[] = data.map(appointment => ({
        ...appointment,
        pet: appointment.pet,
        users: appointment.users,
        vet: appointment.vet,
        speciality: appointment.speciality,
        branch: appointment.branch
      }));

      return { data: mappedData, error: null };

    } catch (error) {
      console.error('Calendar service error:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  // Actualizar una cita existente
  async updateAppointment(
    appointmentId: number,
    updateData: {
      date?: string;
      hour?: string;
      vet_id?: number;
      status?: string;
      duration_minutes?: number;
    }
  ): Promise<{ data: AppointmentWithDetails | null; error: string | null }> {
    try {
      console.log('Updating appointment:', appointmentId, updateData);

      const { data, error } = await supabase
        .from('appointment')
        .update(updateData)
        .eq('id', appointmentId)
        .select(`
          id,
          user_id,
          date,
          hour,
          duration_minutes,
          speciality_id,
          pet_id,
          branch_id,
          vet_id,
          status,
          pet!pet_id (
            id,
            name,
            breed
          ),
          users!user_id (
            id,
            nombre,
            correo,
            telefono,
            direccion
          ),
          vet!vet_id (
            id,
            name,
            email,
            telephone
          ),
          speciality!speciality_id (
            id,
            name
          )
        `)
        .single();

      if (error) {
        console.error('Error updating appointment:', error);
        return { data: null, error: error.message };
      }

      console.log('Updated appointment data:', data);
      return { data, error: null };

    } catch (error) {
      console.error('Calendar service update error:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Error desconocido al actualizar' 
      };
    }
  }

  // Obtener veterinarios disponibles
  async getAvailableVets(): Promise<{ data: {id: number, name: string}[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('vet')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('Error fetching vets:', error);
        return { data: null, error: error.message };
      }

      return { data: data || [], error: null };

    } catch (error) {
      console.error('Error fetching vets:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Error al obtener veterinarios' 
      };
    }
  }

  // Obtener citas para una semana específica
  async getWeekAppointments(
    startDate: string, 
    permissions: UserPermissions,
    vetId?: number
  ): Promise<{ data: AppointmentWithDetails[] | null; error: string | null }> {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    return this.getAppointments({
      startDate,
      endDate: endDate.toISOString().split('T')[0],
      vetId: vetId || undefined,
    }, permissions);
  }

  // Crear nueva cita (solo para admins)
  async createAppointment(
    appointmentData: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>,
    permissions: UserPermissions
  ): Promise<{ data: Appointment | null; error: string | null }> {
    try {
      if (!permissions.canModifySchedules) {
        return { data: null, error: 'Sin permisos para crear citas' };
      }

      const { data, error } = await supabase
        .from('appointment')
        .insert(appointmentData)
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data, error: null };

    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Error creando cita' 
      };
    }
  }

  // Actualizar cita existente
  async updateAppointment(
    appointmentId: number,
    updateData: Partial<Appointment>,
    permissions: UserPermissions
  ): Promise<{ data: Appointment | null; error: string | null }> {
    try {
      // Verificar permisos para esta cita específica
      const { data: existingAppointment } = await supabase
        .from('appointment')
        .select('vet_id')
        .eq('id', appointmentId)
        .single();

      if (!existingAppointment) {
        return { data: null, error: 'Cita no encontrada' };
      }

      // Verificar si puede editar esta cita
      const canEdit = permissions.canModifySchedules || 
        (permissions.isVet && permissions.currentVetId === existingAppointment.vet_id);

      if (!canEdit) {
        return { data: null, error: 'Sin permisos para editar esta cita' };
      }

      const { data, error } = await supabase
        .from('appointment')
        .update(updateData)
        .eq('id', appointmentId)
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data, error: null };

    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Error actualizando cita' 
      };
    }
  }

  // Cancelar cita
  async cancelAppointment(
    appointmentId: number,
    permissions: UserPermissions,
    reason?: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const updateResult = await this.updateAppointment(
        appointmentId,
        { 
          status: 'cancelada'
        },
        permissions
      );

      if (updateResult.error) {
        return { success: false, error: updateResult.error };
      }

      return { success: true, error: null };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error cancelando cita' 
      };
    }
  }

  // Obtener estadísticas del calendario
  async getCalendarStats(
    permissions: UserPermissions,
    dateRange?: { start: string; end: string }
  ): Promise<{ 
    data: {
      totalAppointments: number;
      confirmedAppointments: number;
      cancelledAppointments: number;
      pendingAppointments: number;
    } | null; 
    error: string | null 
  }> {
    try {
      let query = supabase
        .from('appointment')
        .select('status');

      // Aplicar filtros de permisos
      if (permissions.isVet && permissions.currentVetId) {
        query = query.eq('vet_id', permissions.currentVetId);
      }

      // Aplicar rango de fechas si se proporciona
      if (dateRange) {
        query = query.gte('date', dateRange.start)
                    .lte('date', dateRange.end);
      }

      const { data, error } = await query;

      if (error) {
        return { data: null, error: error.message };
      }

      const stats = {
        totalAppointments: data.length,
        confirmedAppointments: data.filter(a => a.status === 'confirmada').length,
        cancelledAppointments: data.filter(a => a.status === 'cancelada').length,
        pendingAppointments: data.filter(a => a.status === 'programada').length,
      };

      return { data: stats, error: null };

    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Error obteniendo estadísticas' 
      };
    }
  }

  // Obtener veterinarios disponibles (solo para admins)
  async getAvailableVeterinarians(
    permissions: UserPermissions
  ): Promise<{ data: Array<{id: number; name: string; email: string}> | null; error: string | null }> {
    try {
      if (!permissions.canViewAllVets) {
        return { data: null, error: 'Sin permisos para ver veterinarios' };
      }

      const { data, error } = await supabase
        .from('vet')
        .select('id, name, email')
        .order('name');

      if (error) {
        return { data: null, error: error.message };
      }

      return { data, error: null };

    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Error cargando veterinarios' 
      };
    }
  }
}

export const calendarService = new CalendarService();