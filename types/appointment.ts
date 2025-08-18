export interface Pet {
  id: string;
  name: string;
  type: 'perro' | 'gato' | 'ave' | 'roedor' | 'reptil' | 'otro';
  breed?: string;
  age?: number;
  weight?: number;
}

export interface Owner {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

export type AppointmentStatus =
  | 'programada'
  | 'en_curso'
  | 'completada'
  | 'cancelada'
  | 'no_asistio';

export type AppointmentType =
  | 'consulta_general'
  | 'vacunacion'
  | 'cirugia'
  | 'revision'
  | 'emergencia'
  | 'control'
  | 'otros';

export interface Appointment {
  id: string;
  date: string; // ISO date string
  time: string; // HH:MM format
  duration: number; // minutes
  status: AppointmentStatus;
  type: AppointmentType;
  reason: string;
  notes?: string;
  owner: Owner;
  pet: Pet;
  veterinarian?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  // Additional data for editing and database operations
  appointmentData?: {
    user_id: number;
    pet_id: number;
    vet_id: number;
    speciality_id: number;
    branch_id: number;
  };
}

export interface AppointmentFormData {
  date: string;
  time: string;
  duration: number;
  type: AppointmentType;
  reason: string;
  notes?: string;
  owner: {
    name: string;
    phone: string;
    email?: string;
  };
  pet: {
    name: string;
    type: Pet['type'];
    breed?: string;
    age?: number;
    weight?: number;
  };
  veterinarianId?: string;
}

export interface CalendarDay {
  date: Date;
  appointments: Appointment[];
  isCurrentMonth: boolean;
  isToday: boolean;
}

export interface AppointmentFilter {
  status?: AppointmentStatus[];
  type?: AppointmentType[];
  veterinarianId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchTerm?: string;
}
