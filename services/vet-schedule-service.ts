import { supabase, createSupabaseResponse } from '@/lib/supabase';
import type {
  VetSchedule,
  CreateScheduleData,
  UpdateScheduleData,
  VetWithDetails,
  ApiResponse,
  WeekDay
} from '@/types/database';

/**
 * Servicio para gestión de horarios de veterinarios
 * Maneja la creación, actualización, eliminación y consulta de horarios
 */
class VetScheduleService {
  
  /**
   * Obtiene todos los horarios de un veterinario específico
   */
  async getVetSchedules(vetId: number): Promise<ApiResponse<VetSchedule[]>> {
    try {
      const { data, error } = await supabase
        .from('vet_schedule')
        .select('*')
        .eq('vet_id', vetId)
        .order('weekday', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      return createSupabaseResponse(data || []);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Obtiene horarios de un veterinario para una especialidad específica
   */
  async getVetSchedulesBySpeciality(
    vetId: number, 
    specialityId: number
  ): Promise<ApiResponse<VetSchedule[]>> {
    try {
      const { data, error } = await supabase
        .from('vet_schedule')
        .select('*')
        .eq('vet_id', vetId)
        .eq('speciality_id', specialityId)
        .order('weekday', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      return createSupabaseResponse(data || []);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Obtiene horarios por día de la semana
   */
  async getSchedulesByWeekday(weekday: WeekDay): Promise<ApiResponse<VetSchedule[]>> {
    try {
      const { data, error } = await supabase
        .from('vet_schedule')
        .select(`
          *,
          vet!inner(id, name, email, telephone),
          speciality!inner(id, name, description)
        `)
        .eq('weekday', weekday)
        .order('start_time', { ascending: true });

      if (error) throw error;

      return createSupabaseResponse(data || []);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Crea un nuevo horario para un veterinario
   */
  async createSchedule(scheduleData: CreateScheduleData): Promise<ApiResponse<VetSchedule>> {
    try {
      // Validar que no exista conflicto de horarios
      const conflict = await this.checkScheduleConflict(
        scheduleData.vet_id,
        scheduleData.speciality_id,
        scheduleData.weekday,
        scheduleData.start_time,
        scheduleData.end_time
      );

      if (conflict.data && conflict.data.length > 0) {
        return createSupabaseResponse(null, 'Conflict with existing schedule');
      }

      const { data, error } = await supabase
        .from('vet_schedule')
        .insert(scheduleData)
        .select()
        .single();

      if (error) throw error;

      return createSupabaseResponse(data);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Actualiza un horario existente
   */
  async updateSchedule(
    scheduleId: number, 
    updateData: UpdateScheduleData
  ): Promise<ApiResponse<VetSchedule>> {
    try {
      // Si se actualizan horarios, verificar conflictos
      if (updateData.start_time || updateData.end_time || updateData.weekday) {
        const existingSchedule = await this.getScheduleById(scheduleId);
        if (!existingSchedule.data) {
          return createSupabaseResponse(null, 'Schedule not found');
        }

        const conflict = await this.checkScheduleConflict(
          existingSchedule.data.vet_id,
          existingSchedule.data.speciality_id,
          updateData.weekday || existingSchedule.data.weekday,
          updateData.start_time || existingSchedule.data.start_time,
          updateData.end_time || existingSchedule.data.end_time,
          scheduleId
        );

        if (conflict.data && conflict.data.length > 0) {
          return createSupabaseResponse(null, 'Conflict with existing schedule');
        }
      }

      const { data, error } = await supabase
        .from('vet_schedule')
        .update(updateData)
        .eq('id', scheduleId)
        .select()
        .single();

      if (error) throw error;

      return createSupabaseResponse(data);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Elimina un horario
   */
  async deleteSchedule(scheduleId: number): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('vet_schedule')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;

      return createSupabaseResponse(true);
    } catch (error) {
      return createSupabaseResponse(false, error);
    }
  }

  /**
   * Obtiene un horario por ID
   */
  async getScheduleById(scheduleId: number): Promise<ApiResponse<VetSchedule>> {
    try {
      const { data, error } = await supabase
        .from('vet_schedule')
        .select('*')
        .eq('id', scheduleId)
        .single();

      if (error) throw error;

      return createSupabaseResponse(data);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Verifica conflictos de horarios
   */
  private async checkScheduleConflict(
    vetId: number,
    specialityId: number,
    weekday: number,
    startTime: string,
    endTime: string,
    excludeId?: number
  ): Promise<ApiResponse<VetSchedule[]>> {
    try {
      let query = supabase
        .from('vet_schedule')
        .select('*')
        .eq('vet_id', vetId)
        .eq('speciality_id', specialityId)
        .eq('weekday', weekday)
        .or(`start_time.lte.${endTime},end_time.gte.${startTime}`);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return createSupabaseResponse(data || []);
    } catch (error) {
      return createSupabaseResponse([], error);
    }
  }

  /**
   * Obtiene veterinarios con sus horarios completos
   */
  async getVetsWithSchedules(): Promise<ApiResponse<VetWithDetails[]>> {
    try {
      const { data: vets, error: vetsError } = await supabase
        .from('vet')
        .select(`
          *,
          vets_by_specialities!inner(
            speciality!inner(id, name, description)
          ),
          vet_schedule(
            id,
            speciality_id,
            weekday,
            start_time,
            end_time
          )
        `);

      if (vetsError) throw vetsError;

      // Transformar datos para el tipo VetWithDetails
      const vetsWithDetails: VetWithDetails[] = (vets || []).map(vet => ({
        id: vet.id,
        name: vet.name,
        email: vet.email,
        telephone: vet.telephone,
        specialities: vet.vets_by_specialities?.map((vs: any) => vs.speciality) || [],
        schedules: vet.vet_schedule || []
      }));

      return createSupabaseResponse(vetsWithDetails);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Crea múltiples horarios en lote
   */
  async createBulkSchedules(schedules: CreateScheduleData[]): Promise<ApiResponse<VetSchedule[]>> {
    try {
      // Verificar conflictos para todos los horarios
      for (const schedule of schedules) {
        const conflict = await this.checkScheduleConflict(
          schedule.vet_id,
          schedule.speciality_id,
          schedule.weekday,
          schedule.start_time,
          schedule.end_time
        );

        if (conflict.data && conflict.data.length > 0) {
          return createSupabaseResponse(
            null, 
            `Conflict found for ${schedule.weekday} at ${schedule.start_time}-${schedule.end_time}`
          );
        }
      }

      const { data, error } = await supabase
        .from('vet_schedule')
        .insert(schedules)
        .select();

      if (error) throw error;

      return createSupabaseResponse(data || []);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Elimina todos los horarios de un veterinario para una especialidad
   */
  async deleteVetSchedulesBySpeciality(
    vetId: number, 
    specialityId: number
  ): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('vet_schedule')
        .delete()
        .eq('vet_id', vetId)
        .eq('speciality_id', specialityId);

      if (error) throw error;

      return createSupabaseResponse(true);
    } catch (error) {
      return createSupabaseResponse(false, error);
    }
  }

  /**
   * Obtiene horarios agrupados por día de la semana
   */
  async getSchedulesGroupedByWeekday(
    vetId?: number,
    specialityId?: number
  ): Promise<ApiResponse<Record<WeekDay, VetSchedule[]>>> {
    try {
      let query = supabase
        .from('vet_schedule')
        .select(`
          *,
          vet!inner(id, name, email, telephone),
          speciality!inner(id, name, description)
        `)
        .order('weekday', { ascending: true })
        .order('start_time', { ascending: true });

      if (vetId) {
        query = query.eq('vet_id', vetId);
      }

      if (specialityId) {
        query = query.eq('speciality_id', specialityId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Agrupar por día de la semana
      const grouped = (data || []).reduce((acc, schedule) => {
        const weekday = schedule.weekday as WeekDay;
        if (!acc[weekday]) {
          acc[weekday] = [];
        }
        acc[weekday].push(schedule);
        return acc;
      }, {} as Record<WeekDay, VetSchedule[]>);

      return createSupabaseResponse(grouped);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Valida el formato de tiempo
   */
  private isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  /**
   * Valida que la hora de inicio sea menor que la hora de fin
   */
  private isValidTimeRange(startTime: string, endTime: string): boolean {
    return startTime < endTime;
  }

  /**
   * Valida los datos de un horario antes de crear/actualizar
   */
  validateScheduleData(data: CreateScheduleData | UpdateScheduleData): string[] {
    const errors: string[] = [];

    if ('weekday' in data && data.weekday !== undefined && (data.weekday < 0 || data.weekday > 6)) {
      errors.push('Weekday must be between 0 and 6');
    }

    if ('start_time' in data && data.start_time && !this.isValidTimeFormat(data.start_time)) {
      errors.push('Start time must be in HH:MM format');
    }

    if ('end_time' in data && data.end_time && !this.isValidTimeFormat(data.end_time)) {
      errors.push('End time must be in HH:MM format');
    }

    if ('start_time' in data && 'end_time' in data && 
        data.start_time && data.end_time && 
        !this.isValidTimeRange(data.start_time, data.end_time)) {
      errors.push('Start time must be before end time');
    }

    return errors;
  }
}

export const vetScheduleService = new VetScheduleService();