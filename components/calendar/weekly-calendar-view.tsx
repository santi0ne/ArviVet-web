'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Bell,
  Settings,
  User as UserIcon,
  Home,
  Clock,
} from 'lucide-react';
import { appointmentService } from '@/services/appointment-service';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  isSameDay,
  parseISO,
  isToday,
} from 'date-fns';
import { es } from 'date-fns/locale';
import type { Appointment } from '@/types/appointment';

interface WeeklyCalendarViewProps {
  onAppointmentClick: (appointment: Appointment) => void;
  userRole: string;
}

export function WeeklyCalendarView({
  onAppointmentClick,
  userRole,
}: WeeklyCalendarViewProps) {
  const router = useRouter();
  const [currentWeek, setCurrentWeek] = useState(new Date()); // Usar fecha actual
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  const timeSlots = ['09', '10', '11', '12', '13', '14', '15', '16', '17'];

  // Actualizar fecha y hora cada minuto
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 60000); // Actualizar cada minuto

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadAppointments();
  }, []);

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

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(current =>
      direction === 'prev' ? subWeeks(current, 1) : addWeeks(current, 1)
    );
  };

  const goToToday = () => {
    setCurrentWeek(new Date());
  };

  const goToHome = () => {
    router.push('/dashboard');
  };

  const getAppointmentsForTimeSlot = (date: Date, hour: string) => {
    return appointments.filter(appointment => {
      if (!isSameDay(parseISO(appointment.date), date)) return false;
      const appointmentHour = appointment.time.split(':')[0];
      return appointmentHour === hour;
    });
  };

  const getAppointmentsForDay = (date: Date) => {
    return appointments
      .filter(appointment => isSameDay(parseISO(appointment.date), date))
      .sort((a, b) => a.time.localeCompare(b.time));
  };

  const getCurrentTimePosition = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    if (hours < 9 || hours > 17) return null;

    const hourIndex = hours - 9;
    const minutePercentage = minutes / 60;
    const position = (hourIndex + minutePercentage) * 100; // 100px por hora

    return position;
  };

  const isCurrentTimeSlot = (hour: string) => {
    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, '0');
    return currentHour === hour;
  };

  const displayedAppointments = selectedDay
    ? getAppointmentsForDay(selectedDay)
    : [];

  if (loading) {
    return (
      <div
        className="calendar-weekly-container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '600px',
        }}
      >
        <div style={{ color: '#6b7280', fontSize: '1.125rem' }}>
          Cargando calendario...
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-weekly-container">
      {/* Header Navigation */}
      <div className="calendar-header">
        <div className="calendar-header-content">
          <div className="calendar-logo-nav">
            <div className="calendar-logo" onClick={goToHome}>
              ARVI VET
            </div>
            <nav className="calendar-nav">
              <button className="calendar-nav-item active">
                Calendario de consultas
              </button>
              <button className="calendar-nav-item">
                Historial de pacientes
              </button>
              <button className="calendar-nav-item">Personal médico</button>
              <button className="calendar-nav-item">Pagos registrados</button>
            </nav>
          </div>

          <div className="calendar-user-controls">
            <div className="calendar-current-time">
              <Clock
                style={{
                  width: '1rem',
                  height: '1rem',
                  display: 'inline',
                  marginRight: '0.5rem',
                }}
              />
              {format(currentDateTime, 'dd/MM/yyyy HH:mm', { locale: es })}
            </div>
            <button className="calendar-home-button" onClick={goToHome}>
              <Home
                style={{
                  width: '1rem',
                  height: '1rem',
                  marginRight: '0.25rem',
                }}
              />
              Inicio
            </button>
            <button className="calendar-icon-button notification">
              <Bell style={{ width: '1.25rem', height: '1.25rem' }} />
            </button>
            <button className="calendar-icon-button settings">
              <Settings style={{ width: '1.25rem', height: '1.25rem' }} />
            </button>
            <div className="calendar-user-avatar">
              <UserIcon style={{ width: '1.25rem', height: '1.25rem' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Controls */}
      <div className="calendar-controls">
        <div className="calendar-controls-content">
          <div className="calendar-controls-left">
            <button className="calendar-today-button" onClick={goToToday}>
              Hoy
            </button>
            <div className="calendar-date-nav">
              <button
                onClick={() => navigateWeek('prev')}
                className="calendar-nav-arrow"
              >
                <ChevronLeft style={{ width: '1.25rem', height: '1.25rem' }} />
              </button>
              <span className="calendar-date-range">
                {format(weekStart, "d 'de' MMMM", { locale: es })} –{' '}
                {format(weekEnd, "d 'de' MMMM 'de' yyyy", { locale: es })}
              </span>
              <button
                onClick={() => navigateWeek('next')}
                className="calendar-nav-arrow"
              >
                <ChevronRight style={{ width: '1.25rem', height: '1.25rem' }} />
              </button>
            </div>
          </div>
          <button className="calendar-week-button">Semana</button>
        </div>
      </div>

      {/* Calendar Main Content */}
      <div className="calendar-main">
        <div className="calendar-main-content">
          <div className="calendar-layout">
            {/* Calendar Grid */}
            <div className="calendar-grid">
              {/* Days Header */}
              <div className="calendar-days-header">
                <div className="calendar-time-indicator">
                  <div className="calendar-time-dot">
                    <div className="calendar-time-dot-inner"></div>
                  </div>
                </div>
                {weekDays.map((day, index) => (
                  <div
                    key={index}
                    className={`calendar-day-header ${isToday(day) ? 'today' : ''}`}
                    onClick={() => setSelectedDay(day)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="calendar-day-name">
                      {format(day, 'EEEE d', { locale: es })}
                    </div>
                    {getAppointmentsForDay(day).length > 0 && (
                      <div className="calendar-appointments-count">
                        {getAppointmentsForDay(day).length}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Time Rows */}
              <div
                className="calendar-time-rows"
                style={{ position: 'relative' }}
              >
                {/* Línea de tiempo actual */}
                {isToday(weekStart) || isToday(weekEnd) ? (
                  <div
                    className="calendar-current-time-line"
                    style={{
                      top: `${getCurrentTimePosition()}px`,
                      display: getCurrentTimePosition() ? 'block' : 'none',
                    }}
                  />
                ) : null}

                {timeSlots.map(hour => (
                  <div key={hour} className="calendar-time-row">
                    <div className="calendar-time-label">
                      <span
                        className={`calendar-time-text ${isCurrentTimeSlot(hour) ? 'calendar-current-time' : ''}`}
                      >
                        {hour}
                      </span>
                    </div>

                    {weekDays.map((day, dayIndex) => {
                      const dayAppointments = getAppointmentsForTimeSlot(
                        day,
                        hour
                      );

                      return (
                        <div key={dayIndex} className="calendar-day-column">
                          {dayAppointments.length > 0 ? (
                            <div
                              className="calendar-simple-slot occupied"
                              onClick={() => setSelectedDay(day)}
                            >
                              {dayAppointments.length}
                            </div>
                          ) : (
                            <div className="calendar-simple-slot empty"></div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar con citas del día seleccionado */}
            <div className="calendar-sidebar">
              <div className="calendar-sidebar-title">
                {selectedDay ? (
                  <>
                    Citas del{' '}
                    {format(selectedDay, 'dd/MM/yyyy', { locale: es })}
                    <div className="calendar-appointments-count">
                      {displayedAppointments.length}
                    </div>
                  </>
                ) : (
                  'Selecciona un día'
                )}
              </div>

              <div className="calendar-appointments-list">
                {displayedAppointments.length > 0 ? (
                  displayedAppointments.map(appointment => (
                    <div
                      key={appointment.id}
                      className="calendar-appointment-item"
                      onClick={() => onAppointmentClick(appointment)}
                    >
                      <div className="calendar-appointment-time">
                        {appointment.time} -{' '}
                        {format(
                          new Date(
                            new Date().setHours(
                              parseInt(appointment.time.split(':')[0]),
                              parseInt(appointment.time.split(':')[1]) +
                                appointment.duration
                            )
                          ),
                          'HH:mm'
                        )}
                      </div>
                      <div className="calendar-appointment-owner">
                        {appointment.owner.name}
                      </div>
                      <div className="calendar-appointment-pet">
                        Mascota: {appointment.pet.name} ({appointment.pet.type})
                      </div>
                      <div className="calendar-appointment-reason">
                        {appointment.reason}
                      </div>
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      textAlign: 'center',
                      color: '#9ca3af',
                      fontSize: '0.875rem',
                      marginTop: '2rem',
                    }}
                  >
                    {selectedDay
                      ? 'No hay citas programadas para este día'
                      : 'Haz clic en un día para ver las citas'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
