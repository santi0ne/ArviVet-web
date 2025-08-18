import { supabase, createSupabaseResponse } from '@/lib/supabase';
import { vetScheduleService } from './vet-schedule-service';
import { appointmentBlockService } from './appointment-block-service';
import { holidayService } from './holiday-service';
import type {
  ScheduleSlot,
  DayAvailability,
  WeekAvailability,
  AvailabilityQuery,
  ApiResponse,
  Appointment,
  VetSchedule,
  AppointmentBlock,
  Holiday,
  WeekDay
} from '@/types/database';

/**
 * Servicio principal para calcular disponibilidad de veterinarios
 * Integra horarios, bloqueos, días festivos y citas existentes
 */
class AvailabilityService {

  /**
   * Obtiene la disponibilidad de un veterinario para una fecha específica
   */
  async getVetAvailability(
    vetId: number,
    specialityId: number,
    date: string,
    durationMinutes: number = 30
  ): Promise<ApiResponse<DayAvailability>> {
    try {
      // Verificar si es día festivo
      const holidayResult = await holidayService.isHoliday(date);
      if (holidayResult.error) {
        return createSupabaseResponse(null, holidayResult.error);
      }

      const isHoliday = !!holidayResult.data;
      const dayAvailability: DayAvailability = {
        date,
        is_holiday: isHoliday,
        holiday_name: holidayResult.data?.name,
        available_slots: [],
        blocked_slots: [],
        existing_appointments: []
      };

      // Si es día festivo, no hay disponibilidad
      if (isHoliday) {
        return createSupabaseResponse(dayAvailability);
      }

      // Obtener día de la semana (0 = domingo, 1 = lunes, etc.)
      const dayOfWeek = new Date(date).getDay() as WeekDay;

      // Obtener horario del veterinario para ese día y especialidad
      const scheduleResult = await vetScheduleService.getVetSchedulesBySpeciality(vetId, specialityId);
      if (scheduleResult.error) {
        return createSupabaseResponse(null, scheduleResult.error);
      }

      const todaySchedule = (scheduleResult.data || []).find(
        schedule => schedule.weekday === dayOfWeek
      );

      // Si no hay horario para ese día, no hay disponibilidad
      if (!todaySchedule) {
        return createSupabaseResponse(dayAvailability);
      }

      // Obtener bloqueos para esa fecha
      const blocksResult = await appointmentBlockService.getBlocksByDate(vetId, date);
      if (blocksResult.error) {
        return createSupabaseResponse(null, blocksResult.error);
      }
      dayAvailability.blocked_slots = blocksResult.data || [];

      // Obtener citas existentes para esa fecha
      const appointmentsResult = await this.getExistingAppointments(vetId, date);
      if (appointmentsResult.error) {
        return createSupabaseResponse(null, appointmentsResult.error);
      }
      dayAvailability.existing_appointments = appointmentsResult.data || [];

      // Generar slots disponibles
      const availableSlots = this.generateAvailableSlots(
        todaySchedule,
        dayAvailability.blocked_slots,
        dayAvailability.existing_appointments,
        specialityId,
        durationMinutes
      );

      dayAvailability.available_slots = availableSlots;

      return createSupabaseResponse(dayAvailability);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Obtiene disponibilidad para múltiples veterinarios en un rango de fechas
   */
  async getMultipleVetsAvailability(
    query: AvailabilityQuery
  ): Promise<ApiResponse<WeekAvailability[]>> {
    try {
      const { vet_id, speciality_id, branch_id, date_from, date_to, duration_minutes = 30 } = query;

      // Obtener veterinarios según filtros
      let vetIds: number[] = [];
      
      if (vet_id) {
        vetIds = [vet_id];
      } else {
        const vetsResult = await this.getVetsByFilters(speciality_id, branch_id);
        if (vetsResult.error) {
          return createSupabaseResponse(null, vetsResult.error);
        }
        vetIds = vetsResult.data || [];
      }

      const weekAvailabilities: WeekAvailability[] = [];
      
      // Generar semanas en el rango de fechas
      const weeks = this.generateWeekRanges(date_from, date_to);

      for (const week of weeks) {
        const weekAvailability: WeekAvailability = {
          week_start: week.start,
          week_end: week.end,
          days: []
        };

        // Para cada día de la semana
        const dates = this.generateDateRange(week.start, week.end);
        
        for (const date of dates) {
          const dayAvailabilities: DayAvailability[] = [];

          // Para cada veterinario
          for (const vetIdItem of vetIds) {
            const vetAvailability = await this.getVetAvailability(
              vetIdItem,
              speciality_id || 1, // Default speciality
              date,
              duration_minutes
            );

            if (vetAvailability.data) {
              dayAvailabilities.push(vetAvailability.data);
            }
          }

          // Combinar disponibilidades de todos los veterinarios para este día
          const combinedDayAvailability = this.combineDayAvailabilities(date, dayAvailabilities);
          weekAvailability.days.push(combinedDayAvailability);
        }

        weekAvailabilities.push(weekAvailability);
      }

      return createSupabaseResponse(weekAvailabilities);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Verifica si un slot específico está disponible
   */
  async isSlotAvailable(
    vetId: number,
    specialityId: number,
    date: string,
    startTime: string,
    durationMinutes: number
  ): Promise<ApiResponse<boolean>> {
    try {
      const endTime = this.addMinutesToTime(startTime, durationMinutes);
      
      // Verificar día festivo
      const holidayResult = await holidayService.isHoliday(date);
      if (holidayResult.data) {
        return createSupabaseResponse(false, 'Date is a holiday');
      }

      // Verificar horario del veterinario
      const dayOfWeek = new Date(date).getDay() as WeekDay;
      const scheduleResult = await vetScheduleService.getVetSchedulesBySpeciality(vetId, specialityId);
      
      const schedule = (scheduleResult.data || []).find(s => s.weekday === dayOfWeek);
      if (!schedule) {
        return createSupabaseResponse(false, 'Veterinarian not available on this day');
      }

      if (startTime < schedule.start_time || endTime > schedule.end_time) {
        return createSupabaseResponse(false, 'Time slot outside working hours');
      }

      // Verificar bloqueos
      const blockResult = await appointmentBlockService.isTimeSlotBlocked(
        vetId, date, startTime, endTime
      );
      if (blockResult.data) {
        return createSupabaseResponse(false, 'Time slot is blocked');
      }

      // Verificar citas existentes
      const conflictResult = await this.hasAppointmentConflict(
        vetId, date, startTime, endTime
      );
      if (conflictResult.data) {
        return createSupabaseResponse(false, 'Time slot has appointment conflict');
      }

      return createSupabaseResponse(true);
    } catch (error) {
      return createSupabaseResponse(false, error);
    }
  }

  /**
   * Encuentra el próximo slot disponible para un veterinario
   */
  async findNextAvailableSlot(
    vetId: number,
    specialityId: number,
    fromDate: string,
    durationMinutes: number,
    maxDaysToSearch: number = 30
  ): Promise<ApiResponse<ScheduleSlot | null>> {
    try {
      const searchEndDate = this.addDaysToDate(fromDate, maxDaysToSearch);
      
      for (let currentDate = fromDate; currentDate <= searchEndDate; 
           currentDate = this.addDaysToDate(currentDate, 1)) {
        
        const availabilityResult = await this.getVetAvailability(
          vetId, specialityId, currentDate, durationMinutes
        );

        if (availabilityResult.data && availabilityResult.data.available_slots.length > 0) {
          return createSupabaseResponse(availabilityResult.data.available_slots[0]);
        }
      }

      return createSupabaseResponse(null, 'No available slots found in search range');
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Obtiene estadísticas de disponibilidad
   */
  async getAvailabilityStatistics(
    vetId: number,
    specialityId: number,
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<{
    total_days: number;
    available_days: number;
    blocked_days: number;
    holiday_days: number;
    total_available_slots: number;
    average_slots_per_day: number;
  }>> {
    try {
      const dates = this.generateDateRange(startDate, endDate);
      let availableDays = 0;
      let blockedDays = 0;
      let holidayDays = 0;
      let totalAvailableSlots = 0;

      for (const date of dates) {
        const availability = await this.getVetAvailability(vetId, specialityId, date);
        
        if (availability.data) {
          if (availability.data.is_holiday) {
            holidayDays++;
          } else if (availability.data.blocked_slots.length > 0) {
            blockedDays++;
          } else if (availability.data.available_slots.length > 0) {
            availableDays++;
            totalAvailableSlots += availability.data.available_slots.length;
          }
        }
      }

      const statistics = {
        total_days: dates.length,
        available_days: availableDays,
        blocked_days: blockedDays,
        holiday_days: holidayDays,
        total_available_slots: totalAvailableSlots,
        average_slots_per_day: availableDays > 0 ? Math.round((totalAvailableSlots / availableDays) * 100) / 100 : 0
      };

      return createSupabaseResponse(statistics);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  // ========================================
  // MÉTODOS PRIVADOS
  // ========================================

  /**
   * Obtiene citas existentes para un veterinario en una fecha
   */
  private async getExistingAppointments(
    vetId: number,
    date: string
  ): Promise<ApiResponse<Appointment[]>> {
    try {
      const { data, error } = await supabase
        .from('appointment')
        .select('*')
        .eq('vet_id', vetId)
        .eq('date', date)
        .not('status', 'eq', 'cancelada')
        .order('hour', { ascending: true });

      if (error) throw error;

      return createSupabaseResponse(data || []);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Verifica conflictos con citas existentes
   */
  private async hasAppointmentConflict(
    vetId: number,
    date: string,
    startTime: string,
    endTime: string
  ): Promise<ApiResponse<boolean>> {
    try {
      const { data, error } = await supabase
        .from('appointment')
        .select('hour, duration_minutes')
        .eq('vet_id', vetId)
        .eq('date', date)
        .not('status', 'eq', 'cancelada');

      if (error) throw error;

      for (const appointment of data || []) {
        const appointmentEnd = this.addMinutesToTime(
          appointment.hour, 
          appointment.duration_minutes || 30
        );

        // Verificar solapamiento
        if (this.timesOverlap(startTime, endTime, appointment.hour, appointmentEnd)) {
          return createSupabaseResponse(true);
        }
      }

      return createSupabaseResponse(false);
    } catch (error) {
      return createSupabaseResponse(false, error);
    }
  }

  /**
   * Obtiene veterinarios por filtros
   */
  private async getVetsByFilters(
    specialityId?: number,
    branchId?: number
  ): Promise<ApiResponse<number[]>> {
    try {
      let query = supabase.from('vet').select('id');

      if (specialityId) {
        const { data: vetData, error } = await supabase
          .from('vets_by_specialities')
          .select('vet')
          .eq('speciality', specialityId);
        
        if (error) {
          return { data: null, error: error.message, success: false };
        }
        
        const vetIds = vetData?.map(item => item.vet) || [];
        return { data: vetIds, error: null, success: true };
      }

      if (branchId && specialityId) {
        // Combinar filtros de especialidad y sucursal
        const { data: branchSpecialities } = await supabase
          .from('branch_by_specialities')
          .select('speciality')
          .eq('branch', branchId);

        const specialityIds = (branchSpecialities || []).map(bs => bs.speciality);
        
        if (!specialityIds.includes(specialityId)) {
          return createSupabaseResponse([]);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      const vetIds = specialityId 
        ? (data || []).map((item: any) => item.vet)
        : (data || []).map((item: any) => item.id);

      return createSupabaseResponse(vetIds);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Genera slots disponibles para un día
   */
  private generateAvailableSlots(
    schedule: VetSchedule,
    blocks: AppointmentBlock[],
    appointments: Appointment[],
    specialityId: number,
    durationMinutes: number
  ): ScheduleSlot[] {
    const slots: ScheduleSlot[] = [];
    const startTime = schedule.start_time;
    const endTime = schedule.end_time;

    let currentTime = startTime;

    while (this.addMinutesToTime(currentTime, durationMinutes) <= endTime) {
      const slotEndTime = this.addMinutesToTime(currentTime, durationMinutes);

      // Verificar si el slot no está bloqueado o ocupado
      const isBlocked = blocks.some(block =>
        this.timesOverlap(currentTime, slotEndTime, block.start_time, block.end_time)
      );

      const hasAppointment = appointments.some(appointment => {
        const appointmentEnd = this.addMinutesToTime(
          appointment.hour,
          appointment.duration_minutes || 30
        );
        return this.timesOverlap(currentTime, slotEndTime, appointment.hour, appointmentEnd);
      });

      if (!isBlocked && !hasAppointment) {
        slots.push({
          date: '', // Se asignará por el caller
          start_time: currentTime,
          end_time: slotEndTime,
          is_available: true,
          vet_id: schedule.vet_id,
          speciality_id: specialityId,
          branch_id: 0, // Se puede obtener de otra consulta si es necesario
          duration_minutes: durationMinutes
        });
      }

      currentTime = this.addMinutesToTime(currentTime, durationMinutes);
    }

    return slots;
  }

  /**
   * Combina disponibilidades de múltiples veterinarios para un día
   */
  private combineDayAvailabilities(
    date: string,
    dayAvailabilities: DayAvailability[]
  ): DayAvailability {
    if (dayAvailabilities.length === 0) {
      return {
        date,
        is_holiday: false,
        available_slots: [],
        blocked_slots: [],
        existing_appointments: []
      };
    }

    const combined: DayAvailability = {
      date,
      is_holiday: dayAvailabilities[0].is_holiday,
      holiday_name: dayAvailabilities[0].holiday_name,
      available_slots: [],
      blocked_slots: [],
      existing_appointments: []
    };

    // Combinar todos los slots, bloqueos y citas
    dayAvailabilities.forEach(day => {
      combined.available_slots.push(...day.available_slots);
      combined.blocked_slots.push(...day.blocked_slots);
      combined.existing_appointments.push(...day.existing_appointments);
    });

    // Ordenar por hora
    combined.available_slots.sort((a, b) => a.start_time.localeCompare(b.start_time));
    combined.blocked_slots.sort((a, b) => a.start_time.localeCompare(b.start_time));
    combined.existing_appointments.sort((a, b) => a.hour.localeCompare(b.hour));

    return combined;
  }

  /**
   * Genera rangos de semanas
   */
  private generateWeekRanges(startDate: string, endDate: string): { start: string; end: string }[] {
    const weeks: { start: string; end: string }[] = [];
    let currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
      const weekStart = new Date(currentDate);
      const weekEnd = new Date(currentDate);
      weekEnd.setDate(weekEnd.getDate() + 6);

      if (weekEnd > end) {
        weekEnd.setTime(end.getTime());
      }

      weeks.push({
        start: weekStart.toISOString().split('T')[0],
        end: weekEnd.toISOString().split('T')[0]
      });

      currentDate.setDate(currentDate.getDate() + 7);
    }

    return weeks;
  }

  /**
   * Genera rango de fechas
   */
  private generateDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    let currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
      dates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  }

  /**
   * Añade minutos a una hora
   */
  private addMinutesToTime(time: string, minutes: number): string {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  }

  /**
   * Añade días a una fecha
   */
  private addDaysToDate(date: string, days: number): string {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }

  /**
   * Verifica si dos rangos de tiempo se solapan
   */
  private timesOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean {
    return start1 < end2 && end1 > start2;
  }
}

export const availabilityService = new AvailabilityService();