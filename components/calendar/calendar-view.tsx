'use client';

import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarDays, Clock, User, Heart, Filter } from 'lucide-react';
import { appointmentService } from '@/services/appointment-service';
import { format, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Appointment, AppointmentFilter } from '@/types/appointment';

interface CalendarViewProps {
  onAppointmentClick: (appointment: Appointment) => void;
  userRole: string;
}

export function CalendarView({
  onAppointmentClick,
  userRole,
}: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<
    Appointment[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AppointmentFilter>({});
  const [viewMode, setViewMode] = useState<'calendar' | 'agenda'>('calendar');

  useEffect(() => {
    loadAppointments();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [appointments, filter, selectedDate]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const data = await appointmentService.getAppointments();
      setAppointments(data);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = appointments;

    if (viewMode === 'calendar') {
      filtered = appointments.filter(appointment =>
        isSameDay(parseISO(appointment.date), selectedDate)
      );
    }

    if (filter.status && filter.status.length > 0) {
      filtered = filtered.filter(apt => filter.status?.includes(apt.status));
    }

    if (filter.type && filter.type.length > 0) {
      filtered = filtered.filter(apt => filter.type?.includes(apt.type));
    }

    if (filter.searchTerm) {
      const searchLower = filter.searchTerm.toLowerCase();
      filtered = filtered.filter(
        apt =>
          apt.owner.name.toLowerCase().includes(searchLower) ||
          apt.pet.name.toLowerCase().includes(searchLower) ||
          apt.reason.toLowerCase().includes(searchLower)
      );
    }

    filtered.sort((a, b) => a.time.localeCompare(b.time));
    setFilteredAppointments(filtered);
  };

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(appointment =>
      isSameDay(parseISO(appointment.date), date)
    );
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

  const getStatusText = (status: string) => {
    const statusMap = {
      programada: 'Programada',
      en_curso: 'En Curso',
      completada: 'Completada',
      cancelada: 'Cancelada',
      no_asistio: 'No Asistió',
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  const getTypeText = (type: string) => {
    const typeMap = {
      consulta_general: 'Consulta General',
      vacunacion: 'Vacunación',
      cirugia: 'Cirugía',
      revision: 'Revisión',
      emergencia: 'Emergencia',
      control: 'Control',
      otros: 'Otros',
    };
    return typeMap[type as keyof typeof typeMap] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white text-lg">Cargando calendario...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'outline'}
            onClick={() => setViewMode('calendar')}
            className="text-white border-white hover:bg-white hover:text-black"
          >
            <CalendarDays className="w-4 h-4 mr-2" />
            Vista Calendario
          </Button>
          <Button
            variant={viewMode === 'agenda' ? 'default' : 'outline'}
            onClick={() => setViewMode('agenda')}
            className="text-white border-white hover:bg-white hover:text-black"
          >
            <Clock className="w-4 h-4 mr-2" />
            Vista Agenda
          </Button>
        </div>

        <div className="flex gap-2">
          <Select
            value={filter.status?.[0] || 'all'}
            onValueChange={value =>
              setFilter(prev => ({
                ...prev,
                status: value === 'all' ? undefined : [value as any],
              }))
            }
          >
            <SelectTrigger className="w-40 bg-gray-800 border-gray-600 text-white">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="programada">Programada</SelectItem>
              <SelectItem value="en_curso">En Curso</SelectItem>
              <SelectItem value="completada">Completada</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filter.type?.[0] || 'all'}
            onValueChange={value =>
              setFilter(prev => ({
                ...prev,
                type: value === 'all' ? undefined : [value as any],
              }))
            }
          >
            <SelectTrigger className="w-40 bg-gray-800 border-gray-600 text-white">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="consulta_general">Consulta General</SelectItem>
              <SelectItem value="vacunacion">Vacunación</SelectItem>
              <SelectItem value="cirugia">Cirugía</SelectItem>
              <SelectItem value="emergencia">Emergencia</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        {viewMode === 'calendar' && (
          <div className="lg:col-span-1">
            <Card className="bg-gray-800/90 border-gray-600 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CalendarDays className="w-5 h-5" />
                  Calendario
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={date => date && setSelectedDate(date)}
                  className="text-white"
                  locale={es}
                  modifiers={{
                    hasAppointments: date =>
                      getAppointmentsForDate(date).length > 0,
                  }}
                  modifiersStyles={{
                    hasAppointments: {
                      backgroundColor: 'rgba(59, 130, 246, 0.3)',
                      borderRadius: '50%',
                    },
                  }}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Appointments List */}
        <div
          className={
            viewMode === 'calendar' ? 'lg:col-span-2' : 'lg:col-span-3'
          }
        >
          <Card className="bg-gray-800/90 border-gray-600 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {viewMode === 'calendar'
                  ? `Citas del ${format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}`
                  : 'Todas las Citas'}
                <Badge variant="secondary" className="ml-2">
                  {filteredAppointments.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredAppointments.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>
                    No hay citas{' '}
                    {viewMode === 'calendar'
                      ? 'para esta fecha'
                      : 'disponibles'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredAppointments.map(appointment => (
                    <div
                      key={appointment.id}
                      onClick={() => onAppointmentClick(appointment)}
                      className="p-4 rounded-lg bg-gray-700/50 hover:bg-gray-700/80 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-3 h-3 rounded-full ${getStatusColor(appointment.status)}`}
                          />
                          <div>
                            <p className="text-white font-medium">
                              {appointment.time} -{' '}
                              {getTypeText(appointment.type)}
                            </p>
                            <p className="text-gray-300 text-sm">
                              {appointment.reason}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-xs border-gray-500 text-gray-300"
                        >
                          {getStatusText(appointment.status)}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>{appointment.owner.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          <span>
                            {appointment.pet.name} ({appointment.pet.type})
                          </span>
                        </div>
                        {appointment.veterinarian && (
                          <div className="flex items-center gap-1">
                            <span>Dr. {appointment.veterinarian.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
