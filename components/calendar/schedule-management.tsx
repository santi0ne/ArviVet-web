'use client';

import { useState, useEffect } from 'react';
import { Clock, Plus, Edit, Trash2, Save, X, AlertCircle } from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';
import { vetScheduleService } from '@/services/vet-schedule-service';
import { specialityService, type Speciality } from '@/services/speciality-service';
import type { VetSchedule } from '@/types/database';

interface ScheduleManagementProps {
  vetId: number;
  onScheduleChange?: () => void;
}

interface ScheduleForm {
  weekday: number;
  start_time: string;
  end_time: string;
  speciality_id: number;
}

const WEEKDAYS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

export function ScheduleManagement({
  vetId,
  onScheduleChange,
}: ScheduleManagementProps) {
  const { permissions } = usePermissions();
  const [schedules, setSchedules] = useState<VetSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<VetSchedule | null>(
    null
  );
  const [isCreating, setIsCreating] = useState(false);
  const [specialities, setSpecialities] = useState<Speciality[]>([]);

  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>({
    weekday: 1,
    start_time: '08:00',
    end_time: '17:00',
    speciality_id: 0,
  });

  useEffect(() => {
    loadSchedules();
    loadSpecialities();
  }, [vetId]);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await vetScheduleService.getVetSchedules(vetId);

      if (response.success && response.data) {
        setSchedules(response.data);
      } else {
        setError(response.error || 'Error cargando horarios');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error loading schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSpecialities = async () => {
    try {
      const response = await specialityService.getAllSpecialities();
      if (response.error) {
        console.error('Error loading specialities:', response.error);
        setSpecialities([]);
      } else {
        setSpecialities(response.data || []);
      }
    } catch (err) {
      console.error('Error loading specialities:', err);
      setSpecialities([]);
    }
  };

  const handleCreateSchedule = async () => {
    try {
      if (!permissions.canCreateScheduleFor(vetId)) {
        setError('Sin permisos para crear horarios');
        return;
      }

      const newScheduleData = {
        vet_id: vetId,
        ...scheduleForm,
      };

      const response = await vetScheduleService.createSchedule(newScheduleData);

      if (response.success && response.data) {
        setSchedules(prev => [...prev, response.data!]);
        setIsCreating(false);
        setScheduleForm({
          weekday: 1,
          start_time: '08:00',
          end_time: '17:00',
          speciality_id: 0,
        });
        onScheduleChange?.();
      } else {
        setError(response.error || 'Error creando horario');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error creating schedule:', err);
    }
  };

  const handleUpdateSchedule = async (schedule: VetSchedule) => {
    try {
      if (!permissions.canCreateScheduleFor(vetId)) {
        setError('Sin permisos para actualizar horarios');
        return;
      }

      const updateData = {
        weekday: schedule.weekday,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        speciality_id: schedule.speciality_id,
      };

      const response = await vetScheduleService.updateSchedule(
        schedule.id,
        updateData
      );

      if (response.success && response.data) {
        setSchedules(prev =>
          prev.map(s => (s.id === schedule.id ? response.data! : s))
        );
        setEditingSchedule(null);
        setIsEditing(false);
        onScheduleChange?.();
      } else {
        setError(response.error || 'Error actualizando horario');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error updating schedule:', err);
    }
  };

  const handleDeleteSchedule = async (scheduleId: number) => {
    try {
      if (!permissions.canCreateScheduleFor(vetId)) {
        setError('Sin permisos para eliminar horarios');
        return;
      }

      if (!confirm('¿Está seguro de eliminar este horario?')) {
        return;
      }

      const response = await vetScheduleService.deleteSchedule(scheduleId);

      if (response.success) {
        setSchedules(prev => prev.filter(s => s.id !== scheduleId));
        onScheduleChange?.();
      } else {
        setError(response.error || 'Error eliminando horario');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error deleting schedule:', err);
    }
  };

  const getWeekdayName = (weekday: number) => {
    return WEEKDAYS.find(w => w.value === weekday)?.label || 'N/A';
  };

  const getSpecialityName = (specialityId: number) => {
    return specialities.find(s => s.id === specialityId)?.name || 'General';
  };

  if (loading) {
    return (
      <div className="schedule-management loading">
        <Clock className="loading-icon" />
        <p>Cargando horarios...</p>
      </div>
    );
  }

  return (
    <div className="schedule-management">
      <div className="schedule-header">
        <h3>
          <Clock className="header-icon" />
          Gestión de Horarios
        </h3>
        {permissions.canCreateScheduleFor(vetId) && (
          <button
            onClick={() => setIsCreating(true)}
            className="btn-add-schedule"
            disabled={isCreating}
          >
            <Plus className="btn-icon" />
            Agregar Horario
          </button>
        )}
      </div>

      {error && (
        <div className="error-alert">
          <AlertCircle className="alert-icon" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="close-error">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Crear nuevo horario */}
      {isCreating && (
        <div className="schedule-form-card">
          <h4>Crear Nuevo Horario</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Día de la semana</label>
              <select
                value={scheduleForm.weekday}
                onChange={e =>
                  setScheduleForm(prev => ({
                    ...prev,
                    weekday: parseInt(e.target.value),
                  }))
                }
                className="form-select"
              >
                {WEEKDAYS.map(day => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Especialidad</label>
              <select
                value={scheduleForm.speciality_id}
                onChange={e =>
                  setScheduleForm(prev => ({
                    ...prev,
                    speciality_id: parseInt(e.target.value),
                  }))
                }
                className="form-select"
              >
                <option value={0}>General</option>
                {specialities.map(spec => (
                  <option key={spec.id} value={spec.id}>
                    {spec.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Hora de inicio</label>
              <input
                type="time"
                value={scheduleForm.start_time}
                onChange={e =>
                  setScheduleForm(prev => ({
                    ...prev,
                    start_time: e.target.value,
                  }))
                }
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Hora de fin</label>
              <input
                type="time"
                value={scheduleForm.end_time}
                onChange={e =>
                  setScheduleForm(prev => ({
                    ...prev,
                    end_time: e.target.value,
                  }))
                }
                className="form-input"
              />
            </div>
          </div>

          <div className="form-actions">
            <button onClick={handleCreateSchedule} className="btn-save">
              <Save className="btn-icon" />
              Guardar
            </button>
            <button onClick={() => setIsCreating(false)} className="btn-cancel">
              <X className="btn-icon" />
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de horarios */}
      <div className="schedules-list">
        {schedules.length === 0 ? (
          <div className="no-schedules">
            <Clock className="no-schedules-icon" />
            <p>No hay horarios configurados</p>
          </div>
        ) : (
          schedules.map(schedule => (
            <div key={schedule.id} className="schedule-card">
              {editingSchedule?.id === schedule.id ? (
                /* Modo edición */
                <div className="schedule-edit-form">
                  <div className="edit-grid">
                    <select
                      value={editingSchedule.weekday}
                      onChange={e =>
                        setEditingSchedule(prev =>
                          prev
                            ? {
                                ...prev,
                                weekday: parseInt(e.target.value),
                              }
                            : null
                        )
                      }
                      className="form-select small"
                    >
                      {WEEKDAYS.map(day => (
                        <option key={day.value} value={day.value}>
                          {day.label}
                        </option>
                      ))}
                    </select>

                    <input
                      type="time"
                      value={editingSchedule.start_time}
                      onChange={e =>
                        setEditingSchedule(prev =>
                          prev
                            ? {
                                ...prev,
                                start_time: e.target.value,
                              }
                            : null
                        )
                      }
                      className="form-input small"
                    />

                    <input
                      type="time"
                      value={editingSchedule.end_time}
                      onChange={e =>
                        setEditingSchedule(prev =>
                          prev
                            ? {
                                ...prev,
                                end_time: e.target.value,
                              }
                            : null
                        )
                      }
                      className="form-input small"
                    />
                  </div>

                  <div className="edit-actions">
                    <button
                      onClick={() => handleUpdateSchedule(editingSchedule)}
                      className="btn-save small"
                    >
                      <Save size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingSchedule(null);
                        setIsEditing(false);
                      }}
                      className="btn-cancel small"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                /* Modo visualización */
                <>
                  <div className="schedule-info">
                    <div className="schedule-day">
                      {getWeekdayName(schedule.weekday)}
                    </div>
                    <div className="schedule-time">
                      {schedule.start_time} - {schedule.end_time}
                    </div>
                    <div className="schedule-specialty">
                      {getSpecialityName(schedule.speciality_id)}
                    </div>
                  </div>

                  {permissions.canCreateScheduleFor(vetId) && (
                    <div className="schedule-actions">
                      <button
                        onClick={() => {
                          setEditingSchedule(schedule);
                          setIsEditing(true);
                        }}
                        className="btn-edit"
                        title="Editar horario"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteSchedule(schedule.id)}
                        className="btn-delete"
                        title="Eliminar horario"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
