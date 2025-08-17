import { supabase, createSupabaseResponse } from '@/lib/supabase';
import type {
  Holiday,
  CreateHolidayData,
  ApiResponse
} from '@/types/database';

/**
 * Servicio para gestión de días festivos
 * Maneja la creación, actualización, eliminación y consulta de días festivos
 */
class HolidayService {

  /**
   * Obtiene todos los días festivos
   */
  async getAllHolidays(): Promise<ApiResponse<Holiday[]>> {
    try {
      const { data, error } = await supabase
        .from('holiday')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;

      return createSupabaseResponse(data || []);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Obtiene días festivos en un rango de fechas
   */
  async getHolidaysByDateRange(
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<Holiday[]>> {
    try {
      const { data, error } = await supabase
        .from('holiday')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (error) throw error;

      return createSupabaseResponse(data || []);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Obtiene días festivos para un año específico
   */
  async getHolidaysByYear(year: number): Promise<ApiResponse<Holiday[]>> {
    try {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      return await this.getHolidaysByDateRange(startDate, endDate);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Verifica si una fecha es día festivo
   */
  async isHoliday(date: string): Promise<ApiResponse<Holiday | null>> {
    try {
      const { data, error } = await supabase
        .from('holiday')
        .select('*')
        .eq('date', date)
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      return createSupabaseResponse(data || null);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Crea un nuevo día festivo
   */
  async createHoliday(holidayData: CreateHolidayData): Promise<ApiResponse<Holiday>> {
    try {
      // Validar que no exista ya un día festivo en esa fecha
      const existingHoliday = await this.isHoliday(holidayData.date);
      if (existingHoliday.data) {
        return createSupabaseResponse(null, `Holiday already exists for date ${holidayData.date}`);
      }

      // Validar formato de datos
      const validationErrors = this.validateHolidayData(holidayData);
      if (validationErrors.length > 0) {
        return createSupabaseResponse(null, validationErrors.join(', '));
      }

      const { data, error } = await supabase
        .from('holiday')
        .insert(holidayData)
        .select()
        .single();

      if (error) throw error;

      return createSupabaseResponse(data);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Actualiza un día festivo existente
   */
  async updateHoliday(
    holidayId: number, 
    updateData: Partial<CreateHolidayData>
  ): Promise<ApiResponse<Holiday>> {
    try {
      // Si se cambia la fecha, verificar que no exista conflicto
      if (updateData.date) {
        const existingHoliday = await this.isHoliday(updateData.date);
        if (existingHoliday.data && existingHoliday.data.id !== holidayId) {
          return createSupabaseResponse(null, `Holiday already exists for date ${updateData.date}`);
        }
      }

      // Validar datos actualizados
      const validationErrors = this.validateHolidayData(updateData as CreateHolidayData);
      if (validationErrors.length > 0) {
        return createSupabaseResponse(null, validationErrors.join(', '));
      }

      const { data, error } = await supabase
        .from('holiday')
        .update(updateData)
        .eq('id', holidayId)
        .select()
        .single();

      if (error) throw error;

      return createSupabaseResponse(data);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Elimina un día festivo
   */
  async deleteHoliday(holidayId: number): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('holiday')
        .delete()
        .eq('id', holidayId);

      if (error) throw error;

      return createSupabaseResponse(true);
    } catch (error) {
      return createSupabaseResponse(false, error);
    }
  }

  /**
   * Obtiene un día festivo por ID
   */
  async getHolidayById(holidayId: number): Promise<ApiResponse<Holiday>> {
    try {
      const { data, error } = await supabase
        .from('holiday')
        .select('*')
        .eq('id', holidayId)
        .single();

      if (error) throw error;

      return createSupabaseResponse(data);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Crea múltiples días festivos en lote
   */
  async createBulkHolidays(holidays: CreateHolidayData[]): Promise<ApiResponse<Holiday[]>> {
    try {
      // Verificar que no existan conflictos
      for (const holiday of holidays) {
        const existing = await this.isHoliday(holiday.date);
        if (existing.data) {
          return createSupabaseResponse(
            null, 
            `Holiday already exists for date ${holiday.date}: ${existing.data.name}`
          );
        }

        // Validar cada día festivo
        const validationErrors = this.validateHolidayData(holiday);
        if (validationErrors.length > 0) {
          return createSupabaseResponse(null, validationErrors.join(', '));
        }
      }

      const { data, error } = await supabase
        .from('holiday')
        .insert(holidays)
        .select();

      if (error) throw error;

      return createSupabaseResponse(data || []);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Elimina días festivos en un rango de fechas
   */
  async deleteHolidaysByDateRange(
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<number>> {
    try {
      const { data, error } = await supabase
        .from('holiday')
        .delete()
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
   * Obtiene días festivos agrupados por año
   */
  async getHolidaysGroupedByYear(): Promise<ApiResponse<Record<number, Holiday[]>>> {
    try {
      const { data, error } = await supabase
        .from('holiday')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;

      // Agrupar por año
      const grouped = (data || []).reduce((acc, holiday) => {
        const year = new Date(holiday.date).getFullYear();
        if (!acc[year]) {
          acc[year] = [];
        }
        acc[year].push(holiday);
        return acc;
      }, {} as Record<number, Holiday[]>);

      return createSupabaseResponse(grouped);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Obtiene días festivos que caen en días laborables (lunes a viernes)
   */
  async getWeekdayHolidays(
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<Holiday[]>> {
    try {
      const { data, error } = await supabase
        .from('holiday')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (error) throw error;

      // Filtrar solo días laborables (lunes=1 a viernes=5)
      const weekdayHolidays = (data || []).filter(holiday => {
        const dayOfWeek = new Date(holiday.date).getDay();
        return dayOfWeek >= 1 && dayOfWeek <= 5;
      });

      return createSupabaseResponse(weekdayHolidays);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Busca días festivos por nombre
   */
  async searchHolidaysByName(searchTerm: string): Promise<ApiResponse<Holiday[]>> {
    try {
      const { data, error } = await supabase
        .from('holiday')
        .select('*')
        .ilike('name', `%${searchTerm}%`)
        .order('date', { ascending: true });

      if (error) throw error;

      return createSupabaseResponse(data || []);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Obtiene próximos días festivos
   */
  async getUpcomingHolidays(limit: number = 5): Promise<ApiResponse<Holiday[]>> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('holiday')
        .select('*')
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(limit);

      if (error) throw error;

      return createSupabaseResponse(data || []);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Crea días festivos comunes para un año
   */
  async createCommonHolidays(year: number): Promise<ApiResponse<Holiday[]>> {
    try {
      const commonHolidays: CreateHolidayData[] = [
        { name: 'Año Nuevo', date: `${year}-01-01` },
        { name: 'Día del Trabajo', date: `${year}-05-01` },
        { name: 'Independencia de Guayaquil', date: `${year}-10-09` },
        { name: 'Independencia de Cuenca', date: `${year}-11-03` },
        { name: 'Navidad', date: `${year}-12-25` }
      ];

      return await this.createBulkHolidays(commonHolidays);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Verifica si múltiples fechas son días festivos
   */
  async checkMultipleDates(dates: string[]): Promise<ApiResponse<Record<string, Holiday | null>>> {
    try {
      const results: Record<string, Holiday | null> = {};

      for (const date of dates) {
        const holidayResult = await this.isHoliday(date);
        results[date] = holidayResult.data;
      }

      return createSupabaseResponse(results);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Obtiene estadísticas de días festivos
   */
  async getHolidayStatistics(year?: number): Promise<ApiResponse<{
    total_holidays: number;
    weekday_holidays: number;
    weekend_holidays: number;
    holidays_by_month: Record<number, number>;
  }>> {
    try {
      let startDate: string;
      let endDate: string;

      if (year) {
        startDate = `${year}-01-01`;
        endDate = `${year}-12-31`;
      } else {
        startDate = '1900-01-01';
        endDate = '2100-12-31';
      }

      const { data, error } = await supabase
        .from('holiday')
        .select('date')
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;

      const holidays = data || [];
      const totalHolidays = holidays.length;
      let weekdayHolidays = 0;
      let weekendHolidays = 0;
      const holidaysByMonth: Record<number, number> = {};

      holidays.forEach(holiday => {
        const date = new Date(holiday.date);
        const dayOfWeek = date.getDay();
        const month = date.getMonth() + 1; // getMonth() returns 0-11

        // Contar días laborables vs fin de semana
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          weekdayHolidays++;
        } else {
          weekendHolidays++;
        }

        // Contar por mes
        holidaysByMonth[month] = (holidaysByMonth[month] || 0) + 1;
      });

      const statistics = {
        total_holidays: totalHolidays,
        weekday_holidays: weekdayHolidays,
        weekend_holidays: weekendHolidays,
        holidays_by_month: holidaysByMonth
      };

      return createSupabaseResponse(statistics);
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
   * Valida los datos de un día festivo
   */
  validateHolidayData(data: CreateHolidayData): string[] {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Holiday name is required');
    } else if (data.name.trim().length < 3) {
      errors.push('Holiday name must be at least 3 characters long');
    }

    if (!data.date || !this.isValidDateFormat(data.date)) {
      errors.push('Valid date in YYYY-MM-DD format is required');
    }

    return errors;
  }
}

export const holidayService = new HolidayService();