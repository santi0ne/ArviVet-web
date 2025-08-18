'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  Clock,
  User,
  Heart,
  Phone,
  Mail,
  MapPin,
  FileText,
  Stethoscope,
  Edit,
  Scale,
  Gift,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Appointment } from '@/types/appointment';

interface AppointmentModalProps {
  appointment: Appointment;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (appointment: Appointment) => void;
  canEdit: boolean;
}

export function AppointmentModal({
  appointment,
  isOpen,
  onClose,
  onEdit,
  canEdit,
}: AppointmentModalProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'programada':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'en_curso':
        return 'bg-yellow-500 hover:bg-yellow-600';
      case 'completada':
        return 'bg-green-500 hover:bg-green-600';
      case 'cancelada':
        return 'bg-red-500 hover:bg-red-600';
      case 'no_asistio':
        return 'bg-gray-500 hover:bg-gray-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
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

  const getPetTypeText = (type: string) => {
    const petTypeMap = {
      perro: 'Perro',
      gato: 'Gato',
      ave: 'Ave',
      roedor: 'Roedor',
      reptil: 'Reptil',
      otro: 'Otro',
    };
    return petTypeMap[type as keyof typeof petTypeMap] || type;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-800 border-gray-600 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="text-xl">Detalles de la Cita</span>
            {canEdit && (
              <Button
                onClick={() => onEdit(appointment)}
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header with status and type */}
          <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Badge
                className={`${getStatusColor(appointment.status)} text-white`}
              >
                {getStatusText(appointment.status)}
              </Badge>
              <Badge
                variant="outline"
                className="border-gray-500 text-gray-300"
              >
                {getTypeText(appointment.type)}
              </Badge>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">ID: {appointment.id}</p>
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-sm text-gray-400">Fecha</p>
                <p className="font-medium">
                  {format(
                    parseISO(appointment.date),
                    "EEEE, d 'de' MMMM 'de' yyyy",
                    { locale: es }
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg">
              <Clock className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-sm text-gray-400">Hora y Duración</p>
                <p className="font-medium">
                  {appointment.time} ({appointment.duration} min)
                </p>
              </div>
            </div>
          </div>

          <Separator className="bg-gray-600" />

          {/* Owner Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-400" />
              Información del Propietario
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Nombre:</span>
                  <span className="font-medium">{appointment.owner.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{appointment.owner.phone}</span>
                </div>
              </div>
              <div className="space-y-2">
                {appointment.owner.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{appointment.owner.email}</span>
                  </div>
                )}
                {appointment.owner.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{appointment.owner.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator className="bg-gray-600" />

          {/* Pet Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Heart className="w-5 h-5 text-green-400" />
              Información de la Mascota
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Nombre:</span>
                  <span className="font-medium">{appointment.pet.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Tipo:</span>
                  <span>{getPetTypeText(appointment.pet.type)}</span>
                </div>
                {appointment.pet.breed && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Raza:</span>
                    <span>{appointment.pet.breed}</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {appointment.pet.age && (
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">
                      {appointment.pet.age} año
                      {appointment.pet.age !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
                {appointment.pet.weight && (
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{appointment.pet.weight} kg</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator className="bg-gray-600" />

          {/* Appointment Details */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-yellow-400" />
              Detalles de la Cita
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-400 mb-1">
                  Motivo de la consulta:
                </p>
                <p className="text-white bg-gray-700/30 p-3 rounded-lg">
                  {appointment.reason}
                </p>
              </div>
              {appointment.notes && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">
                    Notas adicionales:
                  </p>
                  <p className="text-white bg-gray-700/30 p-3 rounded-lg">
                    {appointment.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {appointment.veterinarian && (
            <>
              <Separator className="bg-gray-600" />
              {/* Veterinarian */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-purple-400" />
                  Veterinario Asignado
                </h3>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {appointment.veterinarian.name}
                  </span>
                </div>
              </div>
            </>
          )}

          <Separator className="bg-gray-600" />

          {/* Metadata */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>
              Creada:{' '}
              {format(parseISO(appointment.createdAt), 'dd/MM/yyyy HH:mm', {
                locale: es,
              })}
            </p>
            <p>
              Actualizada:{' '}
              {format(parseISO(appointment.updatedAt), 'dd/MM/yyyy HH:mm', {
                locale: es,
              })}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
