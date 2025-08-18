// app/dashboard/patients/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Calendar, User, Heart, Activity } from 'lucide-react';
import { authService } from '@/services/auth-service';
import { petsService } from '@/services/pets-service';
import { PatientHistory } from '@/types/database';

export default function PatientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [patientData, setPatientData] = useState<PatientHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Verificar autenticación
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }

    // Cargar datos del paciente
    loadPatientData();
  }, [router, params.id]);

  const loadPatientData = async () => {
    try {
      setLoading(true);
      setError(null);
      const petId = parseInt(params.id as string);

      if (isNaN(petId)) {
        setError('ID de paciente inválido');
        return;
      }

      const data = await petsService.getPatientHistory(petId);
      setPatientData(data);
    } catch (err) {
      setError('Error al cargar los datos del paciente');
      console.error('Error loading patient data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToPatients = () => {
    router.push('/dashboard/patients');
  };

  const calculateAge = (birthDate: string): string => {
    const birth = new Date(birthDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - birth.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return months > 0
        ? `${months} ${months === 1 ? 'mes' : 'meses'}`
        : `${diffDays} días`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} ${years === 1 ? 'año' : 'años'}`;
    }
  };

  if (loading) {
    return (
      <main className="patient-detail-container">
        <div className="patient-detail-overlay" />
        <div className="loading-message">
          <p>Cargando datos del paciente...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="patient-detail-container">
        <div className="patient-detail-overlay" />
        <div className="error-message">
          <p>{error}</p>
          <button onClick={loadPatientData} className="retry-button">
            Reintentar
          </button>
          <button
            onClick={handleBackToPatients}
            className="back-to-patients-btn"
          >
            Volver a Pacientes
          </button>
        </div>
      </main>
    );
  }

  if (!patientData) {
    return (
      <main className="patient-detail-container">
        <div className="patient-detail-overlay" />
        <div className="error-message">
          <p>Paciente no encontrado</p>
          <button
            onClick={handleBackToPatients}
            className="back-to-patients-btn"
          >
            Volver a Pacientes
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="patient-detail-container">
      <div className="patient-detail-overlay" />

      {/* Header */}
      <header className="patient-detail-header">
        <button
          onClick={handleBackToPatients}
          className="back-button"
          title="Volver a Pacientes"
        >
          <ArrowLeft className="back-icon" />
        </button>
        <h1 className="patient-detail-title">
          Historial Médico - {patientData.pet.name}
        </h1>
      </header>

      <div className="patient-detail-content">
        {/* Información del paciente */}
        <div className="patient-info-card">
          <div className="patient-avatar">
            {patientData.pet.pic ? (
              <img
                src={patientData.pet.pic}
                alt={patientData.pet.name}
                className="patient-image"
              />
            ) : (
              patientData.pet.name.charAt(0)
            )}
          </div>
          <div className="patient-basic-info">
            <h2 className="patient-name">{patientData.pet.name}</h2>
            <div className="patient-details-grid">
              <div className="detail-item">
                <span className="detail-label">Sexo:</span>
                <span className="detail-value">{patientData.pet.sex}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Raza:</span>
                <span className="detail-value">{patientData.pet.breed}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Edad:</span>
                <span className="detail-value">
                  {calculateAge(patientData.pet.birth_date)}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Peso actual:</span>
                <span className="detail-value">
                  {patientData.pet.weigth} kg
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">País de origen:</span>
                <span className="detail-value">
                  {patientData.pet.country_origin}
                </span>
              </div>
              {patientData.pet.sterilization_date && (
                <div className="detail-item">
                  <span className="detail-label">Fecha de esterilización:</span>
                  <span className="detail-value">
                    {new Date(
                      patientData.pet.sterilization_date
                    ).toLocaleDateString('es-ES')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Información del dueño */}
        {patientData.pet.users && (
          <div className="owner-info-card">
            <h3 className="section-title">
              <User className="section-icon" />
              Información del Dueño
            </h3>
            <div className="owner-details">
              <p>
                <strong>Nombre:</strong> {patientData.pet.users.nombre}
              </p>
              {patientData.pet.users.telefono && (
                <p>
                  <strong>Teléfono:</strong> {patientData.pet.users.telefono}
                </p>
              )}
              {patientData.pet.users.correo && (
                <p>
                  <strong>Email:</strong> {patientData.pet.users.correo}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Historial de citas */}
        <div className="visits-section">
          <h3 className="section-title">
            <Activity className="section-icon" />
            Historial de Citas
          </h3>

          <div className="visits-timeline">
            {patientData.appointments.length > 0 ? (
              patientData.appointments.map((appointment, index: number) => (
                <div key={appointment.id} className="visit-card">
                  <div className="visit-header">
                    <div className="visit-date">
                      <Calendar className="date-icon" />
                      {new Date(appointment.date).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                      <span className="visit-time">
                        {appointment.hour.substring(0, 5)}
                      </span>
                    </div>
                    <span
                      className={`visit-type visit-type-${appointment.status
                        .toLowerCase()
                        .replace(' ', '-')}`}
                    >
                      {appointment.status}
                    </span>
                  </div>

                  <div className="visit-content">
                    <div className="visit-info-grid">
                      <div className="visit-detail">
                        <strong>Veterinario:</strong>{' '}
                        {appointment.vet?.name || 'No asignado'}
                      </div>
                      {appointment.speciality && (
                        <div className="visit-detail">
                          <strong>Especialidad:</strong>{' '}
                          {appointment.speciality.name}
                        </div>
                      )}
                      <div className="visit-detail">
                        <strong>Sucursal:</strong>{' '}
                        {appointment.branch?.direction || 'No especificada'}
                      </div>
                      <div className="visit-detail">
                        <strong>Duración:</strong>{' '}
                        {appointment.duration_minutes || 20} minutos
                      </div>
                    </div>

                    {appointment.branch?.telephone && (
                      <div className="branch-info">
                        <strong>Teléfono sucursal:</strong>{' '}
                        {appointment.branch.telephone}
                      </div>
                    )}

                    {appointment.speciality?.description && (
                      <div className="speciality-description">
                        <strong>Sobre la especialidad:</strong>
                        <p>{appointment.speciality.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-appointments">
                <p>No hay citas registradas para esta mascota.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
