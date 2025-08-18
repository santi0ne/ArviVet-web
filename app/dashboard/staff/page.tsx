'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  Users,
  Clock,
  Plus,
} from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';
import { supabase } from '@/lib/supabase';
import { authService } from '@/services/auth-service';

interface VeterinarianData {
  id: number;
  name: string;
  email: string;
  telephone: string;
  specialities: string[];
  totalAppointments: number;
  nextAppointment?: string;
  workingHours: Array<{
    day: string;
    hours: string;
  }>;
  isActive: boolean;
}

export default function StaffPage() {
  const router = useRouter();
  const { permissions, loading: permissionsLoading } = usePermissions();
  const [veterinarians, setVeterinarians] = useState<VeterinarianData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }

    // Solo proceder cuando los permisos hayan cargado
    if (permissionsLoading) {
      return;
    }

    // Verificar permisos
    if (!permissions.canManageStaff) {
      router.push('/dashboard');
      return;
    }

    // Cargar veterinarios solo una vez cuando los permisos están listos
    if (permissions.canManageStaff && veterinarians.length === 0) {
      loadVeterinarians();
    }
  }, [permissions.canManageStaff, permissionsLoading, router]);

  const loadVeterinarians = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener veterinarios con sus especialidades
      const { data: vetsData, error: vetsError } = await supabase
        .from('vet')
        .select(
          `
          id,
          name,
          email,
          telephone,
          vets_by_specialities (
            speciality (
              id,
              name
            )
          )
        `
        )
        .order('name');

      if (vetsError) {
        throw new Error(`Error cargando veterinarios: ${vetsError.message}`);
      }

      if (!vetsData) {
        setVeterinarians([]);
        return;
      }

      // Procesar datos de veterinarios
      const processedVets = await Promise.all(
        vetsData.map(async vet => {
          // Obtener especialidades
          const specialities =
            vet.vets_by_specialities
              ?.map((vs: any) => vs.speciality?.name)
              .filter(Boolean) || [];

          // Obtener estadísticas de citas
          const { data: appointmentsData } = await supabase
            .from('appointment')
            .select('id, date, hour, status')
            .eq('vet_id', vet.id)
            .not('status', 'eq', 'cancelada');

          const totalAppointments = appointmentsData?.length || 0;

          // Obtener próxima cita
          const { data: nextAppointmentData } = await supabase
            .from('appointment')
            .select('date, hour')
            .eq('vet_id', vet.id)
            .in('status', ['programada', 'confirmada'])
            .gte('date', new Date().toISOString().split('T')[0])
            .order('date', { ascending: true })
            .order('hour', { ascending: true })
            .limit(1)
            .single();

          let nextAppointment: string | undefined;
          if (nextAppointmentData) {
            const date = new Date(
              `${nextAppointmentData.date}T${nextAppointmentData.hour}`
            );
            nextAppointment = date.toLocaleDateString('es-ES', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });
          }

          // Obtener horarios de trabajo
          const { data: schedulesData } = await supabase
            .from('vet_schedule')
            .select('weekday, start_time, end_time')
            .eq('vet_id', vet.id)
            .order('weekday');

          const workingHours =
            schedulesData?.map(schedule => ({
              day: getDayName(schedule.weekday),
              hours: `${schedule.start_time} - ${schedule.end_time}`,
            })) || [];

          return {
            id: vet.id,
            name: vet.name,
            email: vet.email,
            telephone: vet.telephone,
            specialities,
            totalAppointments,
            nextAppointment,
            workingHours,
            isActive: true,
          };
        })
      );

      setVeterinarians(processedVets);
    } catch (err) {
      console.error('Error loading veterinarians:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const getDayName = (weekday: number): string => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return days[weekday] || 'N/A';
  };

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  const handleVetScheduleClick = (vetId: number) => {
    router.push(`/dashboard/calendar?vet=${vetId}`);
  };

  const handleAddVeterinarian = () => {
    // Implementar modal para agregar veterinario
    console.log('Agregar nuevo veterinario');
  };

  if (permissionsLoading || loading) {
    return (
      <div className="staff-container">
        <div className="staff-overlay" />
        <div className="loading-message">
          <p>Cargando personal médico...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="staff-container">
        <div className="staff-overlay" />
        <div className="error-message">
          <p>{error}</p>
          <button onClick={loadVeterinarians} className="retry-button">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!permissions.canManageStaff) {
    return (
      <div className="staff-container">
        <div className="staff-overlay" />
        <div className="error-message">
          <p>No tienes permisos para acceder a esta sección.</p>
          <button onClick={handleBackToDashboard} className="retry-button">
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="staff-container">
      <div className="staff-overlay" />

      {/* Header */}
      <header className="staff-header">
        <button
          onClick={handleBackToDashboard}
          className="back-button"
          title="Volver al Dashboard"
        >
          <ArrowLeft className="back-icon" />
        </button>
        <h1 className="staff-title">Personal Médico</h1>
        <button
          onClick={handleAddVeterinarian}
          className="add-vet-button"
          title="Agregar Veterinario"
        >
          <Plus className="add-icon" />
          Agregar Veterinario
        </button>
      </header>

      {/* Stats */}
      <div className="staff-stats">
        <div className="stat-card">
          <Users className="stat-icon" />
          <div className="stat-info">
            <span className="stat-number">{veterinarians.length}</span>
            <span className="stat-label">Veterinarios</span>
          </div>
        </div>
        <div className="stat-card">
          <Clock className="stat-icon" />
          <div className="stat-info">
            <span className="stat-number">
              {veterinarians.filter(v => v.isActive).length}
            </span>
            <span className="stat-label">Activos</span>
          </div>
        </div>
        <div className="stat-card">
          <Calendar className="stat-icon" />
          <div className="stat-info">
            <span className="stat-number">
              {veterinarians.reduce((acc, v) => acc + v.totalAppointments, 0)}
            </span>
            <span className="stat-label">Total Citas</span>
          </div>
        </div>
      </div>

      {/* Veterinarians Grid */}
      <div className="veterinarians-grid">
        {veterinarians.map(vet => (
          <div key={vet.id} className="vet-card">
            <div className="vet-card-header">
              <div className="vet-avatar">
                {vet.name.charAt(0).toUpperCase()}
              </div>
              <div className="vet-basic-info">
                <h3 className="vet-name">{vet.name}</h3>
                <div className="vet-specialities">
                  {vet.specialities.length > 0 ? (
                    vet.specialities.map((spec, index) => (
                      <span key={index} className="speciality-tag">
                        {spec}
                      </span>
                    ))
                  ) : (
                    <span className="no-speciality">
                      Sin especialidad asignada
                    </span>
                  )}
                </div>
              </div>
              <div
                className={`vet-status ${vet.isActive ? 'active' : 'inactive'}`}
              >
                {vet.isActive ? 'Activo' : 'Inactivo'}
              </div>
            </div>

            <div className="vet-card-body">
              {/* Información de contacto */}
              <div className="contact-info">
                <div className="contact-item">
                  <Mail className="contact-icon" />
                  <span>{vet.email}</span>
                </div>
                <div className="contact-item">
                  <Phone className="contact-icon" />
                  <span>{vet.telephone}</span>
                </div>
              </div>

              {/* Horarios de trabajo */}
              <div className="working-hours">
                <h4>Horarios:</h4>
                {vet.workingHours.length > 0 ? (
                  <div className="hours-list">
                    {vet.workingHours.map((schedule, index) => (
                      <div key={index} className="hour-item">
                        <span className="day">{schedule.day}:</span>
                        <span className="hours">{schedule.hours}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-schedule">Sin horarios asignados</p>
                )}
              </div>

              {/* Estadísticas */}
              <div className="vet-stats">
                <div className="stat">
                  <span className="stat-value">{vet.totalAppointments}</span>
                  <span className="stat-description">Citas totales</span>
                </div>
                {vet.nextAppointment && (
                  <div className="next-appointment">
                    <Clock className="appointment-icon" />
                    <span>Próxima: {vet.nextAppointment}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="vet-card-actions">
              <button
                onClick={() => handleVetScheduleClick(vet.id)}
                className="action-button primary"
              >
                <Calendar className="button-icon" />
                Ver Calendario
              </button>
              <button className="action-button secondary">
                Editar Horarios
              </button>
            </div>
          </div>
        ))}
      </div>

      {veterinarians.length === 0 && (
        <div className="no-vets-message">
          <Users className="no-vets-icon" />
          <h3>No hay veterinarios registrados</h3>
          <p>
            Agrega veterinarios para comenzar a gestionar el personal médico.
          </p>
          <button onClick={handleAddVeterinarian} className="add-vet-cta">
            Agregar Primer Veterinario
          </button>
        </div>
      )}
    </main>
  );
}
