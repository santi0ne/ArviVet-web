'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { Save, X, Calendar, Clock, User, Heart } from 'lucide-react';
import {
  format,
  parseISO,
  addDays,
  isBefore,
  isAfter,
  isSameDay,
  getDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import type { Appointment } from '@/types/appointment';
import { appointmentService } from '@/services/appointment-service';

const editAppointmentSchema = z.object({
  date: z.string().min(1, 'La fecha es obligatoria'),
  time: z.string().min(1, 'La hora es obligatoria'),
  duration: z
    .number()
    .min(15, 'La duración mínima es 15 minutos')
    .max(240, 'La duración máxima es 4 horas'),
  status: z.enum([
    'programada',
    'en_curso',
    'completada',
    'cancelada',
    'no_asistio',
  ]),
  type: z.enum([
    'consulta_general',
    'vacunacion',
    'cirugia',
    'revision',
    'emergencia',
    'control',
    'otros',
  ]),
  reason: z.string().min(1, 'El motivo es obligatorio'),
  notes: z.string().optional(),
  veterinarianId: z.string().optional(),
  ownerName: z.string().min(1, 'El nombre del propietario es obligatorio'),
  ownerPhone: z.string().min(1, 'El teléfono es obligatorio'),
  ownerEmail: z.string().email('Email inválido').optional().or(z.literal('')),
  petName: z.string().min(1, 'El nombre de la mascota es obligatorio'),
  petType: z.enum(['perro', 'gato', 'ave', 'roedor', 'reptil', 'otro']),
  petBreed: z.string().optional(),
  petAge: z.number().min(0).max(30).optional(),
  petWeight: z.number().min(0).max(200).optional(),
});

type EditAppointmentFormData = z.infer<typeof editAppointmentSchema>;

interface EditAppointmentModalProps {
  appointment: Appointment;
  isOpen: boolean;
  onClose: () => void;
  onSave: (appointment: Appointment) => void;
  canEdit?: boolean;
}

export function EditAppointmentModal({
  appointment,
  isOpen,
  onClose,
  onSave,
}: EditAppointmentModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [existingAppointments, setExistingAppointments] = useState<
    Appointment[]
  >([]);
  const [conflictError, setConflictError] = useState<string>('');

  // Timezone y horarios de trabajo
  const TIMEZONE = 'America/Guayaquil';
  const WORKING_HOURS = Array.from({ length: 13 }, (_, i) => {
    const hour = i + 9; // 9:00 AM a 21:00 PM (9 PM)
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  // Función para obtener la fecha actual en Ecuador
  const getCurrentEcuadorTime = () => toZonedTime(new Date(), TIMEZONE);

  // Función para validar días de la semana (sin domingo)
  const isWeekdayAndValid = (date: Date): boolean => {
    const dayOfWeek = getDay(date); // 0 = domingo, 1 = lunes, etc.
    const today = getCurrentEcuadorTime();

    // No permitir domingo (día 0) y no permitir fechas pasadas
    return dayOfWeek !== 0 && !isBefore(date, today);
  };

  const form = useForm<EditAppointmentFormData>({
    resolver: zodResolver(editAppointmentSchema),
    defaultValues: {
      date: appointment.date,
      time: appointment.time,
      duration: appointment.duration,
      status: appointment.status,
      type: appointment.type,
      reason: appointment.reason,
      notes: appointment.notes || '',
      veterinarianId: appointment.veterinarian?.id || '',
      ownerName: appointment.owner.name,
      ownerPhone: appointment.owner.phone,
      ownerEmail: appointment.owner.email || '',
      petName: appointment.pet.name,
      petType: appointment.pet.type,
      petBreed: appointment.pet.breed || '',
      petAge: appointment.pet.age,
      petWeight: appointment.pet.weight,
    },
  });

  useEffect(() => {
    if (isOpen) {
      const appointmentDate = parseISO(appointment.date);
      setSelectedDate(appointmentDate);

      form.reset({
        date: appointment.date,
        time: appointment.time,
        duration: appointment.duration,
        status: appointment.status,
        type: appointment.type,
        reason: appointment.reason,
        notes: appointment.notes || '',
        veterinarianId: appointment.veterinarian?.id || '',
        ownerName: appointment.owner.name,
        ownerPhone: appointment.owner.phone,
        ownerEmail: appointment.owner.email || '',
        petName: appointment.pet.name,
        petType: appointment.pet.type,
        petBreed: appointment.pet.breed || '',
        petAge: appointment.pet.age,
        petWeight: appointment.pet.weight,
      });
    }
  }, [appointment, isOpen, form]);

  // Cargar citas existentes para detectar conflictos
  useEffect(() => {
    if (isOpen) {
      appointmentService.getAppointments().then(setExistingAppointments);
    }
  }, [isOpen]);

  // Función para detectar conflictos de horario
  const checkTimeConflict = (
    date: string,
    time: string,
    duration: number
  ): boolean => {
    const selectedDateTime = new Date(`${date}T${time}:00`);
    const selectedEndTime = new Date(
      selectedDateTime.getTime() + duration * 60000
    );

    return existingAppointments.some(apt => {
      // Excluir la cita actual
      if (apt.id === appointment.id) return false;

      if (apt.date === date) {
        const aptDateTime = new Date(`${apt.date}T${apt.time}:00`);
        const aptEndTime = new Date(
          aptDateTime.getTime() + apt.duration * 60000
        );

        // Verificar superposición de horarios
        return selectedDateTime < aptEndTime && selectedEndTime > aptDateTime;
      }
      return false;
    });
  };

  // Manejar selección de fecha del calendario
  const handleDateSelect = (date: Date | undefined) => {
    if (date && isWeekdayAndValid(date)) {
      setSelectedDate(date);
      const dateString = format(date, 'yyyy-MM-dd');
      form.setValue('date', dateString);
      setShowCalendar(false);
      setConflictError('');

      // Verificar conflictos con la hora actual
      const currentTime = form.getValues('time');
      const currentDuration = form.getValues('duration');
      if (currentTime && currentDuration) {
        if (checkTimeConflict(dateString, currentTime, currentDuration)) {
          setConflictError(
            'Ya existe una cita en este horario. Por favor, selecciona otra hora.'
          );
        }
      }
    }
  };

  // Manejar cambio de hora
  const handleTimeChange = (time: string) => {
    form.setValue('time', time);
    setConflictError('');

    const currentDate = form.getValues('date');
    const currentDuration = form.getValues('duration');

    if (currentDate && currentDuration) {
      if (checkTimeConflict(currentDate, time, currentDuration)) {
        setConflictError(
          'Ya existe una cita en este horario. Por favor, selecciona otra hora.'
        );
      }
    }
  };

  const onSubmit = async (data: EditAppointmentFormData) => {
    // Verificar conflictos antes de enviar
    if (checkTimeConflict(data.date, data.time, data.duration)) {
      setConflictError(
        'Ya existe una cita en este horario. Por favor, selecciona otra hora.'
      );
      return;
    }

    setIsSaving(true);
    setConflictError('');

    try {
      const updatedAppointment: Appointment = {
        ...appointment,
        date: data.date,
        time: data.time,
        duration: data.duration,
        status: data.status,
        type: data.type,
        reason: data.reason,
        notes: data.notes,
        owner: {
          ...appointment.owner,
          name: data.ownerName,
          phone: data.ownerPhone,
          email: data.ownerEmail || undefined,
        },
        pet: {
          ...appointment.pet,
          name: data.petName,
          type: data.petType,
          breed: data.petBreed || undefined,
          age: data.petAge,
          weight: data.petWeight,
        },
        veterinarian: data.veterinarianId
          ? {
              id: data.veterinarianId,
              name:
                data.veterinarianId === 'vet1'
                  ? 'Dr. Carlos Rodríguez'
                  : 'Dra. Ana López',
            }
          : undefined,
        updatedAt: new Date().toISOString(),
      };

      await new Promise(resolve => setTimeout(resolve, 800));
      onSave(updatedAppointment);
    } catch (error) {
      console.error('Error updating appointment:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'programada':
        return 'bg-blue-500';
      case 'en_curso':
        return 'bg-yellow-500';
      case 'completada':
        return 'bg-green-500';
      case 'cancelada':
        return 'bg-red-500';
      case 'no_asistio':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-800 border-gray-600 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="text-xl">Editar Cita</span>
            <div className="flex items-center gap-2">
              <Badge
                className={`${getStatusColor(appointment.status)} text-white`}
              >
                ID: {appointment.id}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Date and Time Section - Enhanced */}
          <div className="p-4 bg-gray-700/30 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-400" />
              Re-agendar Cita
            </h3>

            <div className="space-y-4">
              {/* Current Appointment Info */}
              <div className="p-3 bg-gray-600/30 rounded-lg">
                <p className="text-sm text-gray-300 mb-1">Cita actual:</p>
                <p className="text-white font-medium">
                  {format(
                    parseISO(appointment.date),
                    "EEEE, d 'de' MMMM 'de' yyyy",
                    { locale: es }
                  )}{' '}
                  a las {appointment.time}
                </p>
              </div>

              {/* Date Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Nueva Fecha</Label>
                  <div className="relative">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCalendar(!showCalendar)}
                      className="w-full bg-gray-700 border-gray-600 text-white hover:bg-gray-600 justify-start"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      {selectedDate
                        ? format(selectedDate, 'dd/MM/yyyy', { locale: es })
                        : 'Seleccionar fecha'}
                    </Button>

                    {showCalendar && (
                      <div className="absolute top-full left-0 z-50 mt-2 p-3 bg-white border border-gray-200 rounded-lg shadow-xl">
                        <CalendarUI
                          mode="single"
                          selected={selectedDate}
                          onSelect={handleDateSelect}
                          disabled={date => !isWeekdayAndValid(date)}
                          locale={es}
                          modifiersClassNames={{
                            disabled:
                              'opacity-50 cursor-not-allowed line-through',
                          }}
                        />
                        <div className="mt-2 text-xs text-gray-600">
                          <p>• No se puede seleccionar domingos</p>
                          <p>• Solo fechas futuras disponibles</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {form.formState.errors.date && (
                    <p className="text-red-400 text-sm mt-1">
                      {form.formState.errors.date.message}
                    </p>
                  )}
                </div>

                {/* Time Selection */}
                <div>
                  <Label className="text-gray-300">Nueva Hora</Label>
                  <Select
                    value={form.watch('time')}
                    onValueChange={handleTimeChange}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <Clock className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Seleccionar hora" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {WORKING_HOURS.map(hour => (
                        <SelectItem
                          key={hour}
                          value={hour}
                          className="text-white hover:bg-gray-700"
                        >
                          {hour}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.time && (
                    <p className="text-red-400 text-sm mt-1">
                      {form.formState.errors.time.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Duration */}
              <div>
                <Label htmlFor="duration" className="text-gray-300">
                  Duración (minutos)
                </Label>
                <Select
                  value={form.watch('duration')?.toString()}
                  onValueChange={value =>
                    form.setValue('duration', parseInt(value))
                  }
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Duración" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="15">15 minutos</SelectItem>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="45">45 minutos</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="90">1.5 horas</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                    <SelectItem value="180">3 horas</SelectItem>
                    <SelectItem value="240">4 horas</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.duration && (
                  <p className="text-red-400 text-sm mt-1">
                    {form.formState.errors.duration.message}
                  </p>
                )}
              </div>
            </div>

            {/* Conflict Error Display */}
            {conflictError && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                <p className="text-red-300 text-sm font-medium flex items-center gap-2">
                  <X className="w-4 h-4" />
                  {conflictError}
                </p>
              </div>
            )}
          </div>

          {/* Status and Type Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-gray-300">Estado</Label>
              <Select
                value={form.watch('status')}
                onValueChange={value => form.setValue('status', value as any)}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="programada">Programada</SelectItem>
                  <SelectItem value="en_curso">En Curso</SelectItem>
                  <SelectItem value="completada">Completada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                  <SelectItem value="no_asistio">No Asistió</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300">Tipo de Consulta</Label>
              <Select
                value={form.watch('type')}
                onValueChange={value => form.setValue('type', value as any)}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="consulta_general">
                    Consulta General
                  </SelectItem>
                  <SelectItem value="vacunacion">Vacunación</SelectItem>
                  <SelectItem value="cirugia">Cirugía</SelectItem>
                  <SelectItem value="revision">Revisión</SelectItem>
                  <SelectItem value="emergencia">Emergencia</SelectItem>
                  <SelectItem value="control">Control</SelectItem>
                  <SelectItem value="otros">Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className="bg-gray-600" />

          {/* Owner Information */}
          <div className="p-4 bg-gray-700/30 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-400" />
              Información del Propietario
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ownerName" className="text-gray-300">
                  Nombre *
                </Label>
                <Input
                  id="ownerName"
                  {...form.register('ownerName')}
                  className="bg-gray-700 border-gray-600 text-white"
                />
                {form.formState.errors.ownerName && (
                  <p className="text-red-400 text-sm mt-1">
                    {form.formState.errors.ownerName.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="ownerPhone" className="text-gray-300">
                  Teléfono *
                </Label>
                <Input
                  id="ownerPhone"
                  {...form.register('ownerPhone')}
                  className="bg-gray-700 border-gray-600 text-white"
                />
                {form.formState.errors.ownerPhone && (
                  <p className="text-red-400 text-sm mt-1">
                    {form.formState.errors.ownerPhone.message}
                  </p>
                )}
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="ownerEmail" className="text-gray-300">
                  Email
                </Label>
                <Input
                  id="ownerEmail"
                  type="email"
                  {...form.register('ownerEmail')}
                  className="bg-gray-700 border-gray-600 text-white"
                />
                {form.formState.errors.ownerEmail && (
                  <p className="text-red-400 text-sm mt-1">
                    {form.formState.errors.ownerEmail.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Pet Information */}
          <div className="p-4 bg-gray-700/30 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-green-400" />
              Información de la Mascota
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="petName" className="text-gray-300">
                  Nombre *
                </Label>
                <Input
                  id="petName"
                  {...form.register('petName')}
                  className="bg-gray-700 border-gray-600 text-white"
                />
                {form.formState.errors.petName && (
                  <p className="text-red-400 text-sm mt-1">
                    {form.formState.errors.petName.message}
                  </p>
                )}
              </div>
              <div>
                <Label className="text-gray-300">Tipo *</Label>
                <Select
                  value={form.watch('petType')}
                  onValueChange={value =>
                    form.setValue('petType', value as any)
                  }
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="perro">Perro</SelectItem>
                    <SelectItem value="gato">Gato</SelectItem>
                    <SelectItem value="ave">Ave</SelectItem>
                    <SelectItem value="roedor">Roedor</SelectItem>
                    <SelectItem value="reptil">Reptil</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="petBreed" className="text-gray-300">
                  Raza
                </Label>
                <Input
                  id="petBreed"
                  {...form.register('petBreed')}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="petAge" className="text-gray-300">
                  Edad (años)
                </Label>
                <Input
                  id="petAge"
                  type="number"
                  min="0"
                  max="30"
                  {...form.register('petAge', { valueAsNumber: true })}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="petWeight" className="text-gray-300">
                  Peso (kg)
                </Label>
                <Input
                  id="petWeight"
                  type="number"
                  min="0"
                  max="200"
                  step="0.1"
                  {...form.register('petWeight', { valueAsNumber: true })}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>
          </div>

          {/* Appointment Details */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason" className="text-gray-300">
                Motivo de la Consulta *
              </Label>
              <Textarea
                id="reason"
                {...form.register('reason')}
                className="bg-gray-700 border-gray-600 text-white min-h-[100px]"
                placeholder="Describe el motivo de la consulta..."
              />
              {form.formState.errors.reason && (
                <p className="text-red-400 text-sm mt-1">
                  {form.formState.errors.reason.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="notes" className="text-gray-300">
                Notas Adicionales
              </Label>
              <Textarea
                id="notes"
                {...form.register('notes')}
                className="bg-gray-700 border-gray-600 text-white min-h-[100px]"
                placeholder="Notas adicionales, observaciones, etc..."
              />
            </div>
          </div>

          {/* Veterinarian */}
          <div>
            <Label className="text-gray-300">Veterinario Asignado</Label>
            <Select
              value={form.watch('veterinarianId')}
              onValueChange={value => form.setValue('veterinarianId', value)}
            >
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Seleccionar veterinario" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                <SelectItem value="">Sin asignar</SelectItem>
                <SelectItem value="vet1">Dr. Carlos Rodríguez</SelectItem>
                <SelectItem value="vet2">Dra. Ana López</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isSaving || !!conflictError}
              className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Cambios
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
