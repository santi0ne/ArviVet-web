'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/services/auth-service';
import { usePermissions } from '@/hooks/use-permissions';
import { NewWeeklyCalendar } from '@/components/calendar/new-weekly-calendar';
import { EditAppointmentModal } from '@/components/calendar/edit-appointment-modal';
import type { Appointment } from '@/types/appointment';

function CalendarPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { permissions, loading: permissionsLoading } = usePermissions();
  const [editingAppointment, setEditingAppointment] =
    useState<Appointment | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedVetId, setSelectedVetId] = useState<number | null>(null);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }

    // Obtener veterinario específico desde URL si existe
    const vetParam = searchParams.get('vet');
    if (vetParam) {
      setSelectedVetId(parseInt(vetParam, 10));
    } else if (permissions.isVet && permissions.currentVetId) {
      // Si es veterinario, mostrar solo sus citas
      setSelectedVetId(permissions.currentVetId);
    }
  }, [router, searchParams, permissions]);

  const handleAppointmentClick = (appointment: Appointment) => {
    // El modal se maneja internamente en el nuevo componente
  };

  const handleEditAppointment = (appointment: Appointment) => {
    // Verificar permisos antes de permitir edición
    if (
      permissions.canEditAppointment &&
      permissions.canEditAppointment(appointment)
    ) {
      setEditingAppointment(appointment);
      setIsEditModalOpen(true);
    }
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingAppointment(null);
  };

  const handleSaveAppointment = (updatedAppointment: Appointment) => {
    // Aquí se podría actualizar el estado global o hacer una llamada a la API
    setIsEditModalOpen(false);
    setEditingAppointment(null);
  };

  if (permissionsLoading) {
    return (
      <div className="calendar-container">
        <div className="calendar-overlay" />
        <div className="loading-message">
          <p>Cargando calendario...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <NewWeeklyCalendar
        onAppointmentClick={handleAppointmentClick}
        permissions={permissions}
        onEditAppointment={handleEditAppointment}
        selectedVetId={selectedVetId}
      />

      {editingAppointment && (
        <EditAppointmentModal
          appointment={editingAppointment}
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          onSave={handleSaveAppointment}
          canEdit={permissions.canEditAppointment(editingAppointment)}
        />
      )}
    </>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={
      <div className="calendar-container">
        <div className="calendar-overlay" />
        <div className="loading-message">
          <p>Cargando calendario...</p>
        </div>
      </div>
    }>
      <CalendarPageContent />
    </Suspense>
  );
}
