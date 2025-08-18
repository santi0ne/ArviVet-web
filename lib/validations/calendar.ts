import { z } from 'zod';

// ========================================
// VALIDACIONES BÁSICAS
// ========================================

const timeSchema = z
  .string()
  .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format');

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine(date => !isNaN(Date.parse(date)), 'Invalid date');

const futureDateSchema = dateSchema.refine(date => {
  const inputDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return inputDate >= today;
}, 'Date cannot be in the past');

const weekdaySchema = z.number().int().min(0).max(6);

const positiveIntSchema = z.number().int().positive();

// ========================================
// VALIDACIONES PARA HORARIOS DE VETERINARIOS
// ========================================

export const createScheduleSchema = z
  .object({
    vet_id: positiveIntSchema,
    speciality_id: positiveIntSchema,
    weekday: weekdaySchema,
    start_time: timeSchema,
    end_time: timeSchema,
  })
  .refine(data => data.start_time < data.end_time, {
    message: 'Start time must be before end time',
    path: ['end_time'],
  });

export const updateScheduleSchema = z
  .object({
    weekday: weekdaySchema.optional(),
    start_time: timeSchema.optional(),
    end_time: timeSchema.optional(),
  })
  .refine(
    data => {
      if (data.start_time && data.end_time) {
        return data.start_time < data.end_time;
      }
      return true;
    },
    {
      message: 'Start time must be before end time',
      path: ['end_time'],
    }
  );

export const bulkScheduleSchema = z
  .array(createScheduleSchema)
  .min(1, 'At least one schedule is required');

// ========================================
// VALIDACIONES PARA BLOQUEOS
// ========================================

export const createBlockSchema = z
  .object({
    vet_id: positiveIntSchema,
    date: futureDateSchema,
    start_time: timeSchema,
    end_time: timeSchema,
    reason: z
      .string()
      .min(3, 'Reason must be at least 3 characters')
      .max(255, 'Reason must be less than 255 characters'),
  })
  .refine(data => data.start_time < data.end_time, {
    message: 'Start time must be before end time',
    path: ['end_time'],
  });

export const updateBlockSchema = z
  .object({
    date: futureDateSchema.optional(),
    start_time: timeSchema.optional(),
    end_time: timeSchema.optional(),
    reason: z.string().min(3).max(255).optional(),
  })
  .refine(
    data => {
      if (data.start_time && data.end_time) {
        return data.start_time < data.end_time;
      }
      return true;
    },
    {
      message: 'Start time must be before end time',
      path: ['end_time'],
    }
  );

export const recurringBlockSchema = z
  .object({
    vet_id: positiveIntSchema,
    dates: z.array(futureDateSchema).min(1, 'At least one date is required'),
    start_time: timeSchema,
    end_time: timeSchema,
    reason: z.string().min(3).max(255),
  })
  .refine(data => data.start_time < data.end_time, {
    message: 'Start time must be before end time',
    path: ['end_time'],
  });

// ========================================
// VALIDACIONES PARA DÍAS FESTIVOS
// ========================================

export const createHolidaySchema = z.object({
  name: z
    .string()
    .min(3, 'Holiday name must be at least 3 characters')
    .max(100, 'Holiday name must be less than 100 characters'),
  date: dateSchema,
});

export const updateHolidaySchema = z.object({
  name: z.string().min(3).max(100).optional(),
  date: dateSchema.optional(),
});

export const bulkHolidaySchema = z
  .array(createHolidaySchema)
  .min(1, 'At least one holiday is required');

// ========================================
// VALIDACIONES PARA CITAS
// ========================================

export const createAppointmentSchema = z.object({
  user_id: positiveIntSchema,
  date: futureDateSchema,
  hour: timeSchema,
  duration_minutes: z
    .number()
    .int()
    .min(15, 'Duration must be at least 15 minutes')
    .max(480, 'Duration cannot exceed 8 hours'),
  speciality_id: positiveIntSchema,
  pet_id: positiveIntSchema,
  branch_id: positiveIntSchema,
  vet_id: positiveIntSchema,
  status: z
    .enum([
      'programada',
      'confirmada',
      'en_curso',
      'completada',
      'cancelada',
      'no_asistio',
      'reprogramada',
    ])
    .optional(),
});

export const updateAppointmentSchema = z.object({
  date: futureDateSchema.optional(),
  hour: timeSchema.optional(),
  duration_minutes: z.number().int().min(15).max(480).optional(),
  status: z
    .enum([
      'programada',
      'confirmada',
      'en_curso',
      'completada',
      'cancelada',
      'no_asistio',
      'reprogramada',
    ])
    .optional(),
  vet_id: positiveIntSchema.optional(),
});

// ========================================
// VALIDACIONES PARA CONSULTAS DE DISPONIBILIDAD
// ========================================

export const availabilityQuerySchema = z
  .object({
    vet_id: positiveIntSchema.optional(),
    speciality_id: positiveIntSchema.optional(),
    branch_id: positiveIntSchema.optional(),
    date_from: dateSchema,
    date_to: dateSchema,
    duration_minutes: z.number().int().min(15).max(480).optional(),
  })
  .refine(data => data.date_from <= data.date_to, {
    message: 'Start date must be before or equal to end date',
    path: ['date_to'],
  });

export const slotAvailabilitySchema = z.object({
  vet_id: positiveIntSchema,
  speciality_id: positiveIntSchema,
  date: futureDateSchema,
  start_time: timeSchema,
  duration_minutes: z.number().int().min(15).max(480),
});

export const calendarFiltersSchema = z.object({
  vet_id: positiveIntSchema.optional(),
  speciality_id: positiveIntSchema.optional(),
  branch_id: positiveIntSchema.optional(),
  status: z
    .array(
      z.enum([
        'programada',
        'confirmada',
        'en_curso',
        'completada',
        'cancelada',
        'no_asistio',
        'reprogramada',
      ])
    )
    .optional(),
  date_range: z
    .object({
      start: dateSchema,
      end: dateSchema,
    })
    .refine(data => data.start <= data.end, {
      message: 'Start date must be before or equal to end date',
      path: ['end'],
    })
    .optional(),
});

// ========================================
// VALIDACIONES PARA ESTADÍSTICAS
// ========================================

export const statisticsQuerySchema = z
  .object({
    vet_id: positiveIntSchema.optional(),
    speciality_id: positiveIntSchema.optional(),
    start_date: dateSchema,
    end_date: dateSchema,
    year: z.number().int().min(2020).max(2030).optional(),
  })
  .refine(data => data.start_date <= data.end_date, {
    message: 'Start date must be before or equal to end date',
    path: ['end_date'],
  });

// ========================================
// VALIDACIONES PARA BÚSQUEDAS
// ========================================

export const searchQuerySchema = z.object({
  search_term: z
    .string()
    .min(2, 'Search term must be at least 2 characters')
    .max(100),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export const dateRangeSchema = z
  .object({
    start_date: dateSchema,
    end_date: dateSchema,
    max_days: z.number().int().min(1).max(365).optional(),
  })
  .refine(
    data => {
      const start = new Date(data.start_date);
      const end = new Date(data.end_date);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (data.max_days && diffDays > data.max_days) {
        return false;
      }

      return data.start_date <= data.end_date;
    },
    {
      message: 'Invalid date range or exceeds maximum allowed days',
      path: ['end_date'],
    }
  );

// ========================================
// VALIDACIONES PARA FORMULARIOS DE UI
// ========================================

export const scheduleFormSchema = z
  .object({
    veterinarian: z.string().min(1, 'Veterinarian is required'),
    speciality: z.string().min(1, 'Speciality is required'),
    weekdays: z
      .array(
        z.object({
          day: weekdaySchema,
          enabled: z.boolean(),
          start_time: timeSchema,
          end_time: timeSchema,
        })
      )
      .min(1, 'At least one day must be selected'),
  })
  .refine(data => data.weekdays.some(day => day.enabled), {
    message: 'At least one day must be enabled',
    path: ['weekdays'],
  });

export const blockFormSchema = z
  .object({
    veterinarian: z.string().min(1, 'Veterinarian is required'),
    dates: z.array(futureDateSchema).min(1, 'At least one date is required'),
    start_time: timeSchema,
    end_time: timeSchema,
    reason: z.string().min(3).max(255),
    is_recurring: z.boolean().optional(),
    recurring_pattern: z.enum(['daily', 'weekly', 'monthly']).optional(),
    recurring_until: dateSchema.optional(),
  })
  .refine(data => data.start_time < data.end_time, {
    message: 'Start time must be before end time',
    path: ['end_time'],
  });

export const appointmentFormSchema = z.object({
  client: z.string().min(1, 'Client is required'),
  pet: z.string().min(1, 'Pet is required'),
  veterinarian: z.string().min(1, 'Veterinarian is required'),
  speciality: z.string().min(1, 'Speciality is required'),
  branch: z.string().min(1, 'Branch is required'),
  date: futureDateSchema,
  time: timeSchema,
  duration: z.number().int().min(15).max(480),
  notes: z.string().max(500).optional(),
});

// ========================================
// FUNCIONES DE VALIDACIÓN PERSONALIZADAS
// ========================================

/**
 * Valida que un horario no tenga conflictos
 */
export function validateScheduleConflict(
  newSchedule: { weekday: number; start_time: string; end_time: string },
  existingSchedules: Array<{
    weekday: number;
    start_time: string;
    end_time: string;
  }>
): boolean {
  return !existingSchedules.some(
    existing =>
      existing.weekday === newSchedule.weekday &&
      !(
        newSchedule.end_time <= existing.start_time ||
        newSchedule.start_time >= existing.end_time
      )
  );
}

/**
 * Valida que un bloqueo no tenga conflictos
 */
export function validateBlockConflict(
  newBlock: { date: string; start_time: string; end_time: string },
  existingBlocks: Array<{ date: string; start_time: string; end_time: string }>
): boolean {
  return !existingBlocks.some(
    existing =>
      existing.date === newBlock.date &&
      !(
        newBlock.end_time <= existing.start_time ||
        newBlock.start_time >= existing.end_time
      )
  );
}

/**
 * Valida horarios de trabajo (no puede ser 24/7)
 */
export function validateWorkingHours(
  start_time: string,
  end_time: string
): boolean {
  const start = new Date(`1970-01-01T${start_time}:00`);
  const end = new Date(`1970-01-01T${end_time}:00`);
  const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

  return diffHours >= 0.5 && diffHours <= 12; // Mínimo 30 min, máximo 12 horas
}

/**
 * Valida que la fecha no sea muy lejana en el futuro
 */
export function validateReasonableFutureDate(
  date: string,
  maxMonthsAhead: number = 12
): boolean {
  const inputDate = new Date(date);
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + maxMonthsAhead);

  return inputDate <= maxDate;
}

// ========================================
// TIPOS DERIVADOS DE LOS ESQUEMAS
// ========================================

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
export type CreateBlockInput = z.infer<typeof createBlockSchema>;
export type UpdateBlockInput = z.infer<typeof updateBlockSchema>;
export type CreateHolidayInput = z.infer<typeof createHolidaySchema>;
export type UpdateHolidayInput = z.infer<typeof updateHolidaySchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type AvailabilityQueryInput = z.infer<typeof availabilityQuerySchema>;
export type CalendarFiltersInput = z.infer<typeof calendarFiltersSchema>;
export type ScheduleFormInput = z.infer<typeof scheduleFormSchema>;
export type BlockFormInput = z.infer<typeof blockFormSchema>;
export type AppointmentFormInput = z.infer<typeof appointmentFormSchema>;
