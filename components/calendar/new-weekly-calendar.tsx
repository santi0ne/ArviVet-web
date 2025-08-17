'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Maximize2,
  TrendingUp,
  Printer,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  FileText,
  X,
  Bell,
  MapPin,
  ChevronDown,
  Camera,
  Settings,
  Home,
} from 'lucide-react';
import { calendarService } from '../../services/calendar-service';
import {
  format,
  addDays,
  subDays,
  isSameDay,
  parseISO,
  isToday,
  getDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import type { Appointment } from '@/types/appointment';
import type { UserPermissions } from '@/hooks/use-permissions';

interface NewWeeklyCalendarProps {
  onAppointmentClick?: (appointment: Appointment) => void;
  permissions: UserPermissions;
  onEditAppointment?: (appointment: Appointment) => void;
  selectedVetId?: number | null;
}

export function NewWeeklyCalendar({
  onAppointmentClick,
  permissions,
  onEditAppointment,
  selectedVetId,
}: NewWeeklyCalendarProps) {
  const router = useRouter();
  const TIMEZONE = 'America/Guayaquil';

  // Obtener fecha/hora actual en zona horaria de Ecuador
  const getCurrentEcuadorTime = () => toZonedTime(new Date(), TIMEZONE);

  const [currentDate, setCurrentDate] = useState(getCurrentEcuadorTime());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(
    getCurrentEcuadorTime()
  );
  const [activeSection, setActiveSection] = useState('calendario');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showBranchSelector, setShowBranchSelector] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState('principal');
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const notificationRef = useRef<HTMLDivElement>(null);
  const branchRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Actualizar fecha y hora cada segundo usando zona horaria de Ecuador
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(getCurrentEcuadorTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Horarios de 9:00 a 21:00
  const timeSlots = [
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
    '18:00',
    '19:00',
    '20:00',
    '21:00',
  ];

  // Días de la semana (sin domingo - solo lunes a sábado)
  const weekDays = [
    { name: 'Lunes', short: 'Lun' },
    { name: 'Martes', short: 'Mar' },
    { name: 'Miércoles', short: 'Mié' },
    { name: 'Jueves', short: 'Jue' },
    { name: 'Viernes', short: 'Vie' },
    { name: 'Sábado', short: 'Sáb' },
  ];

  useEffect(() => {
    loadAppointments();
  }, [currentDate, selectedVetId, permissions]);

  // Cargar datos del usuario al inicializar
  useEffect(() => {
    const loadUserData = () => {
      try {
        const savedUserData = localStorage.getItem('user-data');
        if (savedUserData) {
          setUserData(JSON.parse(savedUserData));
        }

        const savedPhoto = localStorage.getItem('user-photo');
        if (savedPhoto) {
          setUserPhoto(savedPhoto);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, []);

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
      if (
        branchRef.current &&
        !branchRef.current.contains(event.target as Node)
      ) {
        setShowBranchSelector(false);
      }
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setShowUserProfile(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      
      // Calculate week start and end dates
      const startDate = format(getDateForDayIndex(0), 'yyyy-MM-dd');
      const endDate = format(getDateForDayIndex(5), 'yyyy-MM-dd');
      
      const response = await calendarService.getAppointments({
        startDate,
        endDate,
        vetId: selectedVetId || undefined
      }, permissions);
      
      if (response.error) {
        console.error('Error loading appointments:', response.error);
        setAppointments([]);
      } else {
        // Transform the data to match the Appointment interface
        const transformedAppointments = (response.data || []).map(apt => ({
          id: apt.id.toString(),
          date: apt.date,
          time: apt.hour,
          duration: apt.duration_minutes || 60,
          status: apt.status,
          type: 'consulta_general', // Map from speciality if needed
          reason: apt.speciality?.name || 'Consulta veterinaria',
          notes: '', // Not available in current schema
          owner: {
            id: 'unknown',
            name: apt.pet?.owner?.nombre || 'Cliente',
            phone: apt.pet?.owner?.telefono || '',
            email: apt.pet?.owner?.correo || ''
          },
          pet: {
            id: apt.pet?.id?.toString() || 'unknown',
            name: apt.pet?.name || 'Mascota',
            type: apt.pet?.specie === 'canino' ? 'perro' : apt.pet?.specie === 'felino' ? 'gato' : 'otro',
            breed: apt.pet?.breed || 'Mestizo',
            age: 0, // Not available in current schema
            weight: 0 // Not available in current schema
          },
          veterinarian: {
            id: apt.vet?.id?.toString() || 'unknown',
            name: apt.vet?.name || 'Veterinario'
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
        
        setAppointments(transformedAppointments as Appointment[]);
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    setCurrentDate(current =>
      direction === 'prev' ? subDays(current, 1) : addDays(current, 1)
    );
  };

  const goToToday = () => {
    setCurrentDate(getCurrentEcuadorTime());
  };

  const goToHome = () => {
    router.push('/dashboard');
  };

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    // Aquí puedes agregar navegación a otras secciones cuando estén implementadas
    if (section === 'inicio') {
      router.push('/dashboard');
    }
    // Placeholder para otras secciones cuando estén implementadas
  };

  const getDateForDayIndex = (dayIndex: number) => {
    const today = new Date(currentDate);
    const currentDayOfWeek = getDay(today); // 0 = domingo, 1 = lunes, etc.
    const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const monday = addDays(today, mondayOffset);
    return addDays(monday, dayIndex);
  };

  const getAppointmentsForTimeAndDay = (timeSlot: string, dayIndex: number) => {
    const date = getDateForDayIndex(dayIndex);
    const dateString = format(date, 'yyyy-MM-dd');

    return appointments.filter(appointment => {
      if (appointment.date !== dateString) return false;
      const appointmentHour = appointment.time.substring(0, 2);
      const slotHour = timeSlot.substring(0, 2);
      return appointmentHour === slotHour;
    });
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowModal(true);
    if (onAppointmentClick) {
      onAppointmentClick(appointment);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedAppointment(null);
  };

  const handleEditAppointment = (appointment: Appointment) => {
    setShowModal(false);
    setSelectedAppointment(null);
    if (onEditAppointment) {
      onEditAppointment(appointment);
    }
  };

  const handleGoToPatientRecord = (appointment: Appointment) => {
    // Simulate going to patient record with alert for now
    // In a real application, this would navigate to a patient details page
    setShowModal(false);
    setSelectedAppointment(null);

    // Create a URL-friendly patient ID or use existing ID
    const patientId = appointment.pet.id || 'new';
    const message = `Navegando a la ficha del paciente:\n\nMascota: ${appointment.pet.name}\nPropietario: ${appointment.owner.name}\nTipo: ${appointment.pet.type.charAt(0).toUpperCase() + appointment.pet.type.slice(1)}\n\nEn una aplicación real, esto abriría la ficha completa del paciente.`;

    alert(message);

    // TODO: Implement actual navigation to patient record page
    // router.push(`/dashboard/patients/${patientId}`)
  };

  const getCurrentTimePosition = () => {
    const now = getCurrentEcuadorTime();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    if (hours < 9 || hours > 21) return null;

    const hourIndex = hours - 9;
    const minutePercentage = minutes / 60;
    const position = (hourIndex + minutePercentage) * 60; // 60px por hora

    return position;
  };

  const shouldShowTimeLine = () => {
    const now = getCurrentEcuadorTime();
    const todayInEcuador = getCurrentEcuadorTime();
    return (
      isSameDay(currentDate, todayInEcuador) &&
      now.getHours() >= 9 &&
      now.getHours() <= 17
    );
  };

  const getStatusText = (status: string) => {
    const statusMap = {
      programada: 'Reservado',
      en_curso: 'En Consulta',
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

  // Datos mock de sucursales
  const branches = [
    {
      id: 'principal',
      name: 'Sucursal Principal',
      address: 'Av. Principal 123',
    },
    { id: 'norte', name: 'Sucursal Norte', address: 'Calle Norte 456' },
    { id: 'sur', name: 'Sucursal Sur', address: 'Av. Sur 789' },
  ];

  // Función para obtener estadísticas de notificaciones
  const getNotificationStats = () => {
    const reservadas = appointments.filter(
      apt => apt.status === 'programada'
    ).length;
    const canceladas = appointments.filter(
      apt => apt.status === 'cancelada'
    ).length;
    const postergadas = appointments.filter(
      apt => apt.status === 'no_asistio'
    ).length;
    return { reservadas, canceladas, postergadas };
  };

  // Función para manejar cambio de foto con validaciones
  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo (solo JPG, PNG, WEBP)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Por favor seleccione una imagen JPG, PNG o WEBP');
      return;
    }

    // Validar tamaño (2MB máximo)
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen debe ser menor a 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      const imageUrl = e.target?.result as string;
      setUserPhoto(imageUrl);
      localStorage.setItem('user-photo', imageUrl);
      setShowUserProfile(false);
    };
    reader.readAsDataURL(file);
  };

  // Función para quitar foto de perfil
  const removePhoto = () => {
    setUserPhoto(null);
    localStorage.removeItem('user-photo');
    setShowUserProfile(false);
  };

  // Función para formatear fecha y hora con AM/PM y segundos
  const formatDateTime = (date: Date) => {
    const dateStr = formatInTimeZone(date, TIMEZONE, 'dd/MM/yyyy', {
      locale: es,
    });
    const timeStr = formatInTimeZone(date, TIMEZONE, 'hh:mm:ss', {
      locale: es,
    });
    const ampm = formatInTimeZone(date, TIMEZONE, 'a', {
      locale: es,
    }).toUpperCase();

    return { dateStr, timeStr, ampm };
  };

  if (loading) {
    return (
      <div
        className="new-calendar-container"
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
    <>
      {/* Header Principal ARVI VET */}
      <div className="arvi-header">
        <div className="arvi-header-content">
          <div
            className="arvi-logo"
            onClick={() => handleSectionChange('inicio')}
          >
            ARVI VET
          </div>

          <nav className="arvi-nav">
            <button
              className={`arvi-nav-item ${activeSection === 'calendario' ? 'active' : ''}`}
              onClick={() => handleSectionChange('calendario')}
            >
              Calendario de consultas
            </button>
            <button
              className={`arvi-nav-item ${activeSection === 'historial' ? 'active' : ''}`}
              onClick={() => handleSectionChange('historial')}
            >
              Historial de pacientes
            </button>
            <button
              className={`arvi-nav-item ${activeSection === 'personal' ? 'active' : ''}`}
              onClick={() => handleSectionChange('personal')}
            >
              Personal médico
            </button>
          </nav>

          <div className="arvi-user-controls">
            {/* Hora - primer elemento de derecha a izquierda */}
            <div className="arvi-datetime" key={currentDateTime.getTime()}>
              <span>{formatDateTime(currentDateTime).dateStr}</span>
              <div className="datetime-separator"></div>
              <span>
                {formatDateTime(currentDateTime).timeStr}{' '}
                {formatDateTime(currentDateTime).ampm}
              </span>
            </div>

            {/* Notificaciones con dropdown */}
            <div className="arvi-notification-container" ref={notificationRef}>
              <button
                className="arvi-icon-button-clean arvi-bell-button"
                onClick={() => setShowNotifications(!showNotifications)}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                <Bell size={20} />
                {getNotificationStats().reservadas > 0 && (
                  <span className="notification-badge">
                    {getNotificationStats().reservadas}
                  </span>
                )}
                {showTooltip && getNotificationStats().reservadas > 0 && (
                  <div className="notification-tooltip">
                    Tienes {getNotificationStats().reservadas} cita
                    {getNotificationStats().reservadas !== 1 ? 's' : ''} nueva
                    {getNotificationStats().reservadas !== 1 ? 's' : ''}
                  </div>
                )}
              </button>

              {showNotifications && (
                <div className="arvi-dropdown notification-dropdown apple-popover">
                  <div className="dropdown-header">
                    <h4>Notificaciones</h4>
                  </div>
                  <div className="notification-stats">
                    <div className="stat-item">
                      <span className="stat-number">
                        {getNotificationStats().reservadas}
                      </span>
                      <span className="stat-label">Reservadas</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-number">
                        {getNotificationStats().canceladas}
                      </span>
                      <span className="stat-label">Canceladas</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-number">
                        {getNotificationStats().postergadas}
                      </span>
                      <span className="stat-label">Postergadas</span>
                    </div>
                  </div>
                  <div className="notification-list">
                    {appointments.slice(0, 5).map(appointment => (
                      <div key={appointment.id} className="notification-item">
                        <div className="notification-content">
                          <div className="notification-title">
                            {appointment.owner.name}
                          </div>
                          <div className="notification-subtitle">
                            {appointment.pet.name} -{' '}
                            {getTypeText(appointment.type)}
                          </div>
                          <div className="notification-time">
                            {format(parseISO(appointment.date), 'dd/MM', {
                              locale: es,
                            })}{' '}
                            - {appointment.time}
                          </div>
                        </div>
                        <div
                          className={`notification-status ${appointment.status}`}
                        >
                          {getStatusText(appointment.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                  {appointments.length > 5 && (
                    <div className="dropdown-footer">
                      Ver todas las notificaciones
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Selector de sucursal */}
            <div className="arvi-branch-container" ref={branchRef}>
              <button
                className="arvi-icon-button-clean arvi-branch-button"
                onClick={() => setShowBranchSelector(!showBranchSelector)}
              >
                <MapPin size={20} />
                <span className="branch-text">
                  {branches.find(b => b.id === selectedBranch)?.name ||
                    'Sucursal'}
                </span>
                <ChevronDown size={14} />
              </button>

              {showBranchSelector && (
                <div className="arvi-dropdown branch-dropdown apple-popover">
                  <div className="dropdown-header">
                    <h4>Sucursales</h4>
                  </div>
                  <div className="branch-list">
                    {branches.map(branch => (
                      <button
                        key={branch.id}
                        className={`branch-item ${selectedBranch === branch.id ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedBranch(branch.id);
                          setShowBranchSelector(false);
                        }}
                      >
                        <div className="branch-name">{branch.name}</div>
                        <div className="branch-address">{branch.address}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Perfil de usuario */}
            <div className="arvi-profile-container" ref={profileRef}>
              <button
                className="arvi-user-avatar-clean"
                onClick={() => setShowUserProfile(!showUserProfile)}
              >
                {userPhoto ? (
                  <img
                    src={userPhoto}
                    alt="Profile"
                    className="profile-photo apple-avatar"
                  />
                ) : (
                  <div className="arvi-user-avatar-fallback apple-avatar">
                    {userData?.name?.charAt(0) || (permissions.isAdmin ? 'A' : permissions.isVet ? 'V' : 'U')}
                  </div>
                )}
              </button>

              {showUserProfile && (
                <div className="arvi-dropdown profile-dropdown apple-popover">
                  <div className="dropdown-header">
                    <h4>Perfil</h4>
                  </div>
                  <div className="profile-info">
                    <div className="profile-item">
                      <span className="profile-label">Nombre</span>
                      <span className="profile-value">
                        {userData?.name || 'Usuario'}
                      </span>
                    </div>
                    <div className="profile-item">
                      <span className="profile-label">Tipo</span>
                      <span className="profile-value">{permissions.isAdmin ? 'Administrador' : permissions.isVet ? 'Veterinario' : 'Usuario'}</span>
                    </div>
                    <div className="profile-item">
                      <span className="profile-label">ID</span>
                      <span className="profile-value">
                        {userData?.id || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="profile-actions">
                    <label className="change-photo-btn apple-button">
                      <Camera size={16} />
                      Cambiar Foto
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handlePhotoChange}
                        style={{ display: 'none' }}
                      />
                    </label>
                    {userPhoto && (
                      <button
                        className="remove-photo-btn"
                        onClick={removePhoto}
                      >
                        Quitar Foto
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="new-calendar-container">
        {/* Header Calendario */}
        <div className="new-calendar-header">
          <div className="new-calendar-nav">
            <button className="new-calendar-today-btn" onClick={goToToday}>
              Hoy
            </button>
            <div className="new-calendar-nav-arrows">
              <button
                className="new-calendar-nav-arrow"
                onClick={() => navigateDate('prev')}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="new-calendar-nav-arrow"
                onClick={() => navigateDate('next')}
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <h1 className="new-calendar-date-title">
              {format(getDateForDayIndex(0), 'd', { locale: es })} -{' '}
              {format(getDateForDayIndex(5), "d 'de' MMMM, yyyy", {
                locale: es,
              })}
            </h1>
          </div>

          <div className="new-calendar-controls">
            <button className="new-calendar-nav-arrow" onClick={goToHome}>
              <Home size={16} />
            </button>
            <button className="new-calendar-nav-arrow">
              <RefreshCw size={16} />
            </button>
            <button className="new-calendar-nav-arrow">
              <Maximize2 size={16} />
            </button>
            <button className="new-calendar-nav-arrow">
              <TrendingUp size={16} />
            </button>
            <button className="new-calendar-nav-arrow">
              <Printer size={16} />
            </button>
            <button
              style={{
                background: '#8b5cf6',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              Nuevo ▼
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="new-calendar-grid">
          {/* Days Header */}
          <div className="new-calendar-days-header">
            <div className="new-calendar-time-column">
              <Clock size={20} style={{ color: '#6b7280' }} />
            </div>
            {weekDays.map((day, index) => {
              const dayDate = getDateForDayIndex(index);
              return (
                <div key={index} className="new-calendar-day-column">
                  <div className="new-calendar-day-avatar">
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        background: isToday(dayDate) ? '#3b82f6' : '#e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isToday(dayDate) ? 'white' : '#374151',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                      }}
                    >
                      {format(dayDate, 'd', { locale: es })}
                    </div>
                  </div>
                  <div className="new-calendar-day-name">{day.name}</div>
                </div>
              );
            })}
          </div>

          {/* Time Grid */}
          <div className="new-calendar-time-grid">
            {/* Línea de tiempo actual */}
            {shouldShowTimeLine() && (
              <div
                className="new-calendar-current-time-line"
                style={{
                  top: `${90 + (getCurrentTimePosition() || 0)}px`,
                }}
              />
            )}

            {timeSlots.map((timeSlot, timeIndex) => (
              <div key={timeSlot} className="new-calendar-time-row">
                <div className="new-calendar-time-label">{timeSlot}</div>
                {weekDays.map((_, dayIndex) => {
                  const dayAppointments = getAppointmentsForTimeAndDay(
                    timeSlot,
                    dayIndex
                  );
                  return (
                    <div key={dayIndex} className="new-calendar-cell">
                      {dayAppointments.map(appointment => (
                        <div
                          key={appointment.id}
                          className={`new-calendar-appointment ${appointment.status}`}
                          onClick={() => handleAppointmentClick(appointment)}
                        >
                          <div className="new-calendar-appointment-content">
                            <div className="new-calendar-appointment-name">
                              {appointment.owner.name}
                            </div>
                            <div className="new-calendar-appointment-type">
                              {getTypeText(appointment.type)}
                            </div>
                            <div className="new-calendar-appointment-time">
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
                          </div>
                          <div className="new-calendar-appointment-icon">
                            {appointment.type === 'emergencia' && '⚡'}
                            {appointment.type === 'cirugia' && '🔧'}
                            {appointment.type === 'vacunacion' && '💉'}
                            {appointment.type === 'consulta_general' && '👨‍⚕️'}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Modal */}
        {showModal && selectedAppointment && (
          <div className="new-calendar-modal" onClick={closeModal}>
            <div
              className="new-calendar-modal-content"
              onClick={e => e.stopPropagation()}
            >
              <div className="new-calendar-modal-header">
                <h2 className="new-calendar-modal-title">
                  {selectedAppointment.owner.name}
                </h2>
                <button
                  className="new-calendar-modal-close"
                  onClick={closeModal}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="new-calendar-modal-body">
                <div className="new-calendar-modal-field">
                  <Calendar className="new-calendar-modal-field-icon" />
                  <div className="new-calendar-modal-field-content">
                    <div className="new-calendar-modal-field-label">
                      Fecha y hora
                    </div>
                    <div className="new-calendar-modal-field-value">
                      {format(
                        parseISO(selectedAppointment.date),
                        "EEEE dd 'de' MMMM",
                        { locale: es }
                      )}{' '}
                      - {selectedAppointment.time} a{' '}
                      {format(
                        new Date(
                          new Date().setHours(
                            parseInt(selectedAppointment.time.split(':')[0]),
                            parseInt(selectedAppointment.time.split(':')[1]) +
                              selectedAppointment.duration
                          )
                        ),
                        'HH:mm'
                      )}{' '}
                      hrs
                    </div>
                  </div>
                </div>

                <div className="new-calendar-modal-field">
                  <User className="new-calendar-modal-field-icon" />
                  <div className="new-calendar-modal-field-content">
                    <div className="new-calendar-modal-field-label">
                      Se atenderá con
                    </div>
                    <div className="new-calendar-modal-field-value">
                      {selectedAppointment.veterinarian?.name || 'No asignado'}
                    </div>
                  </div>
                </div>

                <div className="new-calendar-modal-field">
                  <Phone className="new-calendar-modal-field-icon" />
                  <div className="new-calendar-modal-field-content">
                    <div className="new-calendar-modal-field-label">
                      Teléfono
                    </div>
                    <div className="new-calendar-modal-field-value">
                      {selectedAppointment.owner.phone}
                    </div>
                  </div>
                </div>

                <div className="new-calendar-modal-field">
                  <Mail className="new-calendar-modal-field-icon" />
                  <div className="new-calendar-modal-field-content">
                    <div className="new-calendar-modal-field-label">Email</div>
                    <div className="new-calendar-modal-field-value">
                      {selectedAppointment.owner.email || 'No especificado'}
                    </div>
                  </div>
                </div>

                <div className="new-calendar-modal-field">
                  <FileText className="new-calendar-modal-field-icon" />
                  <div className="new-calendar-modal-field-content">
                    <div className="new-calendar-modal-field-label">Motivo</div>
                    <div className="new-calendar-modal-field-value">
                      {selectedAppointment.reason}
                    </div>
                  </div>
                </div>

                {selectedAppointment.notes && (
                  <div className="new-calendar-modal-field">
                    <FileText className="new-calendar-modal-field-icon" />
                    <div className="new-calendar-modal-field-content">
                      <div className="new-calendar-modal-field-label">
                        Comentario interno
                      </div>
                      <div className="new-calendar-modal-field-value">
                        {selectedAppointment.notes}
                      </div>
                    </div>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginTop: '1.5rem',
                  }}
                >
                  <div
                    className={`new-calendar-status-indicator ${selectedAppointment.status}`}
                  >
                    <div
                      className={`new-calendar-status-dot ${selectedAppointment.status}`}
                    ></div>
                    {getStatusText(selectedAppointment.status)}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '0.5rem',
                    marginTop: '1.5rem',
                    justifyContent: 'flex-end',
                  }}
                >
                  <button
                    onClick={() => handleEditAppointment(selectedAppointment)}
                    style={{
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                    }}
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => handleGoToPatientRecord(selectedAppointment)}
                    style={{
                      background: 'none',
                      border: '1px solid #e2e8f0',
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                    }}
                  >
                    📋 Ir a la ficha
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
