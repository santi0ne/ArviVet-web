import { supabase, createSupabaseResponse } from '@/lib/supabase';
import type {
  AppointmentBlock,
  CreateBlockData,
  ApiResponse,
  BlockReason
} from '@/types/database';

/**
 * Servicio para gestión de bloqueos de horarios
 * Permite bloquear franjas horarias específicas para veterinarios
 */
class AppointmentBlockService {

  /**
   * Obtiene todos los bloqueos de un veterinario
   */
  async getVetBlocks(vetId: number): Promise<ApiResponse<AppointmentBlock[]>> {
    try {
      const { data, error } = await supabase
        .from('appointment_block')
        .select('*')
        .eq('vet_id', vetId)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      return createSupabaseResponse(data || []);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Obtiene bloqueos en un rango de fechas
   */
  async getBlocksByDateRange(
    vetId: number,
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<AppointmentBlock[]>> {
    try {
      const { data, error } = await supabase
        .from('appointment_block')
        .select('*')
        .eq('vet_id', vetId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      return createSupabaseResponse(data || []);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Obtiene bloqueos para una fecha específica
   */
  async getBlocksByDate(
    vetId: number, 
    date: string
  ): Promise<ApiResponse<AppointmentBlock[]>> {
    try {
      const { data, error } = await supabase
        .from('appointment_block')
        .select('*')
        .eq('vet_id', vetId)
        .eq('date', date)
        .order('start_time', { ascending: true });

      if (error) throw error;

      return createSupabaseResponse(data || []);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Obtiene todos los bloqueos para múltiples veterinarios en un rango de fechas
   */
  async getBlocksForMultipleVets(
    vetIds: number[],
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<AppointmentBlock[]>> {
    try {
      const { data, error } = await supabase
        .from('appointment_block')
        .select(`
          *,
          vet!inner(id, name, email, telephone)
        `)
        .in('vet_id', vetIds)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })
        .order('vet_id', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      return createSupabaseResponse(data || []);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Crea un nuevo bloqueo de horario
   */
  async createBlock(blockData: CreateBlockData): Promise<ApiResponse<AppointmentBlock>> {
    try {
      // Validar que no exista conflicto con otros bloqueos
      const conflict = await this.checkBlockConflict(
        blockData.vet_id,
        blockData.date,
        blockData.start_time,
        blockData.end_time
      );

      if (conflict.data && conflict.data.length > 0) {
        return createSupabaseResponse(null, 'Conflict with existing block');
      }

      // Validar formato de datos
      const validationErrors = this.validateBlockData(blockData);
      if (validationErrors.length > 0) {
        return createSupabaseResponse(null, validationErrors.join(', '));
      }

      const { data, error } = await supabase
        .from('appointment_block')
        .insert(blockData)
        .select()
        .single();

      if (error) throw error;

      return createSupabaseResponse(data);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Actualiza un bloqueo existente
   */
  async updateBlock(
    blockId: number, 
    updateData: Partial<CreateBlockData>
  ): Promise<ApiResponse<AppointmentBlock>> {
    try {
      // Si se actualizan tiempos o fecha, verificar conflictos
      if (updateData.date || updateData.start_time || updateData.end_time) {
        const existingBlock = await this.getBlockById(blockId);
        if (!existingBlock.data) {
          return createSupabaseResponse(null, 'Block not found');
        }

        const conflict = await this.checkBlockConflict(
          existingBlock.data.vet_id,
          updateData.date || existingBlock.data.date,
          updateData.start_time || existingBlock.data.start_time,
          updateData.end_time || existingBlock.data.end_time,
          blockId
        );

        if (conflict.data && conflict.data.length > 0) {
          return createSupabaseResponse(null, 'Conflict with existing block');
        }
      }

      // Validar datos actualizados
      if (updateData.date || updateData.start_time || updateData.end_time) {
        const validationErrors = this.validateBlockData(updateData as CreateBlockData);
        if (validationErrors.length > 0) {
          return createSupabaseResponse(null, validationErrors.join(', '));
        }
      }

      const { data, error } = await supabase
        .from('appointment_block')
        .update(updateData)
        .eq('id', blockId)
        .select()
        .single();

      if (error) throw error;

      return createSupabaseResponse(data);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Elimina un bloqueo
   */
  async deleteBlock(blockId: number): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('appointment_block')
        .delete()
        .eq('id', blockId);

      if (error) throw error;

      return createSupabaseResponse(true);
    } catch (error) {
      return createSupabaseResponse(false, error);
    }
  }

  /**
   * Obtiene un bloqueo por ID
   */
  async getBlockById(blockId: number): Promise<ApiResponse<AppointmentBlock>> {
    try {
      const { data, error } = await supabase
        .from('appointment_block')
        .select('*')
        .eq('id', blockId)
        .single();

      if (error) throw error;

      return createSupabaseResponse(data);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Verifica conflictos con otros bloqueos
   */
  private async checkBlockConflict(
    vetId: number,
    date: string,
    startTime: string,
    endTime: string,
    excludeId?: number
  ): Promise<ApiResponse<AppointmentBlock[]>> {
    try {
      let query = supabase
        .from('appointment_block')
        .select('*')
        .eq('vet_id', vetId)
        .eq('date', date)
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
   * Crea múltiples bloqueos en lote
   */
  async createBulkBlocks(blocks: CreateBlockData[]): Promise<ApiResponse<AppointmentBlock[]>> {
    try {
      // Verificar conflictos para todos los bloqueos
      for (const block of blocks) {
        const conflict = await this.checkBlockConflict(
          block.vet_id,
          block.date,
          block.start_time,
          block.end_time
        );

        if (conflict.data && conflict.data.length > 0) {
          return createSupabaseResponse(
            null, 
            `Conflict found for ${block.date} at ${block.start_time}-${block.end_time}`
          );
        }

        // Validar cada bloqueo
        const validationErrors = this.validateBlockData(block);
        if (validationErrors.length > 0) {
          return createSupabaseResponse(null, validationErrors.join(', '));
        }
      }

      const { data, error } = await supabase
        .from('appointment_block')
        .insert(blocks)
        .select();

      if (error) throw error;

      return createSupabaseResponse(data || []);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Elimina todos los bloqueos de un veterinario en un rango de fechas
   */
  async deleteBlocksByDateRange(
    vetId: number,
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<number>> {
    try {
      const { data, error } = await supabase
        .from('appointment_block')
        .delete()
        .eq('vet_id', vetId)
        .gte('date', startDate)
        .lte('date', endDate)
        .select('id');

      if (error) throw error;

      return createSupabaseResponse(data?.length || 0);
    } catch (error) {
      return createSupabaseResponse(0, error);
    }
  }

  /**
   * Verifica si una franja horaria está bloqueada
   */
  async isTimeSlotBlocked(
    vetId: number,
    date: string,
    startTime: string,
    endTime: string
  ): Promise<ApiResponse<boolean>> {
    try {
      const { data, error } = await supabase
        .from('appointment_block')
        .select('id')
        .eq('vet_id', vetId)
        .eq('date', date)
        .or(`start_time.lte.${endTime},end_time.gte.${startTime}`)
        .limit(1);

      if (error) throw error;

      return createSupabaseResponse((data && data.length > 0));
    } catch (error) {
      return createSupabaseResponse(false, error);
    }
  }

  /**
   * Obtiene bloqueos agrupados por fecha
   */
  async getBlocksGroupedByDate(
    vetId: number,
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<Record<string, AppointmentBlock[]>>> {
    try {
      const { data, error } = await supabase
        .from('appointment_block')
        .select('*')
        .eq('vet_id', vetId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Agrupar por fecha
      const grouped = (data || []).reduce((acc, block) => {
        if (!acc[block.date]) {
          acc[block.date] = [];
        }
        acc[block.date].push(block);
        return acc;
      }, {} as Record<string, AppointmentBlock[]>);

      return createSupabaseResponse(grouped);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Crea un bloqueo recurrente (múltiples fechas con mismo horario)
   */
  async createRecurringBlock(
    vetId: number,
    dates: string[],
    startTime: string,
    endTime: string,
    reason: string
  ): Promise<ApiResponse<AppointmentBlock[]>> {
    try {
      const blocks: CreateBlockData[] = dates.map(date => ({
        vet_id: vetId,
        date,
        start_time: startTime,
        end_time: endTime,
        reason
      }));

      return await this.createBulkBlocks(blocks);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Valida el formato de fecha
   */
  private isValidDateFormat(date: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    return dateRegex.test(date) && !isNaN(Date.parse(date));
  }

  /**
   * Valida el formato de tiempo
   */
  private isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  /**
   * Valida que la fecha no sea en el pasado
   */
  private isValidFutureDate(date: string): boolean {
    const today = new Date().toISOString().split('T')[0];
    return date >= today;
  }

  /**
   * Valida que la hora de inicio sea menor que la hora de fin
   */
  private isValidTimeRange(startTime: string, endTime: string): boolean {
    return startTime < endTime;
  }

  /**
   * Valida los datos de un bloqueo
   */
  validateBlockData(data: CreateBlockData): string[] {
    const errors: string[] = [];

    if (!data.vet_id || data.vet_id <= 0) {
      errors.push('Valid vet_id is required');
    }

    if (!data.date || !this.isValidDateFormat(data.date)) {
      errors.push('Valid date in YYYY-MM-DD format is required');
    } else if (!this.isValidFutureDate(data.date)) {
      errors.push('Date cannot be in the past');
    }

    if (!data.start_time || !this.isValidTimeFormat(data.start_time)) {
      errors.push('Valid start_time in HH:MM format is required');
    }

    if (!data.end_time || !this.isValidTimeFormat(data.end_time)) {
      errors.push('Valid end_time in HH:MM format is required');
    }

    if (data.start_time && data.end_time && !this.isValidTimeRange(data.start_time, data.end_time)) {
      errors.push('Start time must be before end time');
    }

    if (!data.reason || data.reason.trim().length === 0) {
      errors.push('Reason is required');
    }

    return errors;
  }

  /**
   * Obtiene estadísticas de bloqueos
   */
  async getBlockStatistics(
    vetId: number,
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<{
    total_blocks: number;
    total_hours_blocked: number;
    blocks_by_reason: Record<string, number>;
  }>> {
    try {
      const { data, error } = await supabase
        .from('appointment_block')
        .select('start_time, end_time, reason')
        .eq('vet_id', vetId)
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;

      const blocks = data || [];
      const totalBlocks = blocks.length;
      
      let totalHours = 0;
      const blocksByReason: Record<string, number> = {};

      blocks.forEach(block => {
        // Calcular horas bloqueadas
        const [startHour, startMin] = block.start_time.split(':').map(Number);
        const [endHour, endMin] = block.end_time.split(':').map(Number);
        const startTotalMin = startHour * 60 + startMin;
        const endTotalMin = endHour * 60 + endMin;
        const durationHours = (endTotalMin - startTotalMin) / 60;
        totalHours += durationHours;

        // Contar por razón
        blocksByReason[block.reason] = (blocksByReason[block.reason] || 0) + 1;
      });

      const statistics = {
        total_blocks: totalBlocks,
        total_hours_blocked: Math.round(totalHours * 100) / 100,
        blocks_by_reason: blocksByReason
      };

      return createSupabaseResponse(statistics);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }
}

export const appointmentBlockService = new AppointmentBlockService();