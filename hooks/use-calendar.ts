import { useState, useEffect, useCallback } from 'react';
import { availabilityService } from '@/services/availability-service';
import { vetScheduleService } from '@/services/vet-schedule-service';
import { appointmentBlockService } from '@/services/appointment-block-service';
import { holidayService } from '@/services/holiday-service';
import type {
  DayAvailability,
  WeekAvailability,
  ScheduleSlot,
  CreateBlockData,
  CreateScheduleData,
  CreateHolidayData,
  AvailabilityQuery,
  CalendarFilters,
} from '@/types/database';

/**
 * Hook principal para manejo del calendario
 * Integra todos los servicios de disponibilidad
 */
export function useCalendar() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para almacenar datos del calendario
  const [currentAvailability, setCurrentAvailability] =
    useState<DayAvailability | null>(null);
  const [weekAvailability, setWeekAvailability] = useState<WeekAvailability[]>(
    []
  );
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedVet, setSelectedVet] = useState<number | null>(null);
  const [selectedSpeciality, setSelectedSpeciality] = useState<number | null>(
    null
  );

  /**
   * Obtiene disponibilidad para un veterinario en una fecha específica
   */
  const getVetAvailability = useCallback(
    async (
      vetId: number,
      specialityId: number,
      date: string,
      durationMinutes: number = 30
    ) => {
      setLoading(true);
      setError(null);

      try {
        const result = await availabilityService.getVetAvailability(
          vetId,
          specialityId,
          date,
          durationMinutes
        );

        if (result.error) {
          setError(result.error);
          return null;
        }

        setCurrentAvailability(result.data);
        return result.data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Obtiene disponibilidad para múltiples veterinarios
   */
  const getMultipleVetsAvailability = useCallback(
    async (query: AvailabilityQuery) => {
      setLoading(true);
      setError(null);

      try {
        const result =
          await availabilityService.getMultipleVetsAvailability(query);

        if (result.error) {
          setError(result.error);
          return null;
        }

        setWeekAvailability(result.data || []);
        return result.data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Verifica si un slot específico está disponible
   */
  const checkSlotAvailability = useCallback(
    async (
      vetId: number,
      specialityId: number,
      date: string,
      startTime: string,
      durationMinutes: number
    ) => {
      setLoading(true);
      setError(null);

      try {
        const result = await availabilityService.isSlotAvailable(
          vetId,
          specialityId,
          date,
          startTime,
          durationMinutes
        );

        if (result.error) {
          setError(result.error);
          return false;
        }

        return result.data || false;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Encuentra el próximo slot disponible
   */
  const findNextAvailableSlot = useCallback(
    async (
      vetId: number,
      specialityId: number,
      fromDate: string,
      durationMinutes: number,
      maxDaysToSearch: number = 30
    ) => {
      setLoading(true);
      setError(null);

      try {
        const result = await availabilityService.findNextAvailableSlot(
          vetId,
          specialityId,
          fromDate,
          durationMinutes,
          maxDaysToSearch
        );

        if (result.error) {
          setError(result.error);
          return null;
        }

        return result.data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Actualiza la disponibilidad cuando cambian los filtros
   */
  useEffect(() => {
    if (selectedVet && selectedSpeciality && selectedDate) {
      getVetAvailability(selectedVet, selectedSpeciality, selectedDate);
    }
  }, [selectedVet, selectedSpeciality, selectedDate, getVetAvailability]);

  /**
   * Limpia el estado de error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Resetea todos los estados
   */
  const resetCalendar = useCallback(() => {
    setCurrentAvailability(null);
    setWeekAvailability([]);
    setError(null);
    setLoading(false);
  }, []);

  return {
    // Estados
    loading,
    error,
    currentAvailability,
    weekAvailability,
    selectedDate,
    selectedVet,
    selectedSpeciality,

    // Setters
    setSelectedDate,
    setSelectedVet,
    setSelectedSpeciality,

    // Funciones
    getVetAvailability,
    getMultipleVetsAvailability,
    checkSlotAvailability,
    findNextAvailableSlot,
    clearError,
    resetCalendar,
  };
}

/**
 * Hook para manejo de horarios de veterinarios
 */
export function useVetSchedule() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSchedule = useCallback(
    async (scheduleData: CreateScheduleData) => {
      setLoading(true);
      setError(null);

      try {
        const result = await vetScheduleService.createSchedule(scheduleData);

        if (result.error) {
          setError(result.error);
          return null;
        }

        return result.data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateSchedule = useCallback(
    async (scheduleId: number, updateData: Partial<CreateScheduleData>) => {
      setLoading(true);
      setError(null);

      try {
        const result = await vetScheduleService.updateSchedule(
          scheduleId,
          updateData
        );

        if (result.error) {
          setError(result.error);
          return null;
        }

        return result.data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deleteSchedule = useCallback(async (scheduleId: number) => {
    setLoading(true);
    setError(null);

    try {
      const result = await vetScheduleService.deleteSchedule(scheduleId);

      if (result.error) {
        setError(result.error);
        return false;
      }

      return result.data || false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const getVetSchedules = useCallback(async (vetId: number) => {
    setLoading(true);
    setError(null);

    try {
      const result = await vetScheduleService.getVetSchedules(vetId);

      if (result.error) {
        setError(result.error);
        return null;
      }

      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    getVetSchedules,
    clearError: () => setError(null),
  };
}

/**
 * Hook para manejo de bloqueos de citas
 */
export function useAppointmentBlocks() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createBlock = useCallback(async (blockData: CreateBlockData) => {
    setLoading(true);
    setError(null);

    try {
      const result = await appointmentBlockService.createBlock(blockData);

      if (result.error) {
        setError(result.error);
        return null;
      }

      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateBlock = useCallback(
    async (blockId: number, updateData: Partial<CreateBlockData>) => {
      setLoading(true);
      setError(null);

      try {
        const result = await appointmentBlockService.updateBlock(
          blockId,
          updateData
        );

        if (result.error) {
          setError(result.error);
          return null;
        }

        return result.data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deleteBlock = useCallback(async (blockId: number) => {
    setLoading(true);
    setError(null);

    try {
      const result = await appointmentBlockService.deleteBlock(blockId);

      if (result.error) {
        setError(result.error);
        return false;
      }

      return result.data || false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const getVetBlocks = useCallback(
    async (vetId: number, startDate?: string, endDate?: string) => {
      setLoading(true);
      setError(null);

      try {
        const result =
          startDate && endDate
            ? await appointmentBlockService.getBlocksByDateRange(
                vetId,
                startDate,
                endDate
              )
            : await appointmentBlockService.getVetBlocks(vetId);

        if (result.error) {
          setError(result.error);
          return null;
        }

        return result.data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const createRecurringBlock = useCallback(
    async (
      vetId: number,
      dates: string[],
      startTime: string,
      endTime: string,
      reason: string
    ) => {
      setLoading(true);
      setError(null);

      try {
        const result = await appointmentBlockService.createRecurringBlock(
          vetId,
          dates,
          startTime,
          endTime,
          reason
        );

        if (result.error) {
          setError(result.error);
          return null;
        }

        return result.data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    error,
    createBlock,
    updateBlock,
    deleteBlock,
    getVetBlocks,
    createRecurringBlock,
    clearError: () => setError(null),
  };
}

/**
 * Hook para manejo de días festivos
 */
export function useHolidays() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [holidays, setHolidays] = useState<any[]>([]);

  const createHoliday = useCallback(async (holidayData: CreateHolidayData) => {
    setLoading(true);
    setError(null);

    try {
      const result = await holidayService.createHoliday(holidayData);

      if (result.error) {
        setError(result.error);
        return null;
      }

      // Actualizar lista de días festivos
      setHolidays(prev => [...prev, result.data]);
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteHoliday = useCallback(async (holidayId: number) => {
    setLoading(true);
    setError(null);

    try {
      const result = await holidayService.deleteHoliday(holidayId);

      if (result.error) {
        setError(result.error);
        return false;
      }

      // Actualizar lista de días festivos
      setHolidays(prev => prev.filter(h => h.id !== holidayId));
      return result.data || false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const getHolidays = useCallback(async (year?: number) => {
    setLoading(true);
    setError(null);

    try {
      const result = year
        ? await holidayService.getHolidaysByYear(year)
        : await holidayService.getAllHolidays();

      if (result.error) {
        setError(result.error);
        return null;
      }

      setHolidays(result.data || []);
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const isHoliday = useCallback(async (date: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await holidayService.isHoliday(date);

      if (result.error) {
        setError(result.error);
        return null;
      }

      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    holidays,
    createHoliday,
    deleteHoliday,
    getHolidays,
    isHoliday,
    clearError: () => setError(null),
  };
}

/**
 * Hook combinado para estadísticas del calendario
 */
export function useCalendarStatistics() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAvailabilityStatistics = useCallback(
    async (
      vetId: number,
      specialityId: number,
      startDate: string,
      endDate: string
    ) => {
      setLoading(true);
      setError(null);

      try {
        const result = await availabilityService.getAvailabilityStatistics(
          vetId,
          specialityId,
          startDate,
          endDate
        );

        if (result.error) {
          setError(result.error);
          return null;
        }

        return result.data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getBlockStatistics = useCallback(
    async (vetId: number, startDate: string, endDate: string) => {
      setLoading(true);
      setError(null);

      try {
        const result = await appointmentBlockService.getBlockStatistics(
          vetId,
          startDate,
          endDate
        );

        if (result.error) {
          setError(result.error);
          return null;
        }

        return result.data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getHolidayStatistics = useCallback(async (year?: number) => {
    setLoading(true);
    setError(null);

    try {
      const result = await holidayService.getHolidayStatistics(year);

      if (result.error) {
        setError(result.error);
        return null;
      }

      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getAvailabilityStatistics,
    getBlockStatistics,
    getHolidayStatistics,
    clearError: () => setError(null),
  };
}
