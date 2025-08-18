export interface Pet {
  id: number;
  pic?: string;
  name: string;
  birth_date: string;
  breed: string;
  sex: string;
  weigth: number;
  country_origin: string;
  sterilization_date?: string;
  owner_id: number;
}

export interface MedicalVisit {
  id: number;
  pet_id: number;
  date: string;
  type: string;
  veterinarian: string;
  diagnosis: string;
  treatment: string;
  notes: string;
  weight?: string;
  temperature?: string;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: number;
  nombre: string;
  correo: string;
  contrasena: string;
  rol_id?: number;
  telefono: string;
  direccion: string;
  creado_en?: string;
}

export interface Vet {
  id: number;
  name: string;
  email?: string;
  telephone?: string;
}

export interface Branch {
  id: number;
  direction?: string;
  telephone?: string;
}

export interface Speciality {
  id: number;
  name: string;
  description?: string;
}

export interface Appointment {
  id: number;
  date: string;
  status: string;
  speciality_id?: number;
  user_id: number;
  pet_id: number;
  hour: string;
  branch_id: number;
  vet_id: number;
  duration_minutes?: number;
  // Relations
  vet?: Vet;
  branch?: Branch;
  speciality?: Speciality;
}

export interface PetWithOwner extends Pet {
  users?: User;
}

export interface PatientHistory {
  pet: PetWithOwner;
  appointments: Appointment[];
}

// ========================================
// TIPOS ADICIONALES PARA CALENDARIO
// ========================================

export interface VetSchedule {
  id: number;
  vet_id: number;
  speciality_id: number;
  weekday: number; // 0 = Domingo, 1 = Lunes, etc.
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
}

export interface AppointmentBlock {
  id: number;
  vet_id: number;
  date: string; // YYYY-MM-DD format
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  reason: string;
}

export interface Holiday {
  id: number;
  name: string;
  date: string; // YYYY-MM-DD format
}

export interface VetBySpeciality {
  id: number;
  vet: number; // FK to vet.id
  speciality: number; // FK to speciality.id
}

export interface BranchBySpeciality {
  id: number;
  branch: number; // FK to branch.id
  speciality: number; // FK to speciality.id
}

export interface HistoryPet {
  id_entry: number;
  id_pet: number; // FK to pet.id
  id_appointment: number; // FK to appointment.id
  record: string;
  observations?: string;
  treatment_detail?: string;
}

export interface UserRole {
  id: number;
  nombre: string;
  descripcion?: string;
}

// ========================================
// TIPOS EXTENDIDOS CON RELACIONES
// ========================================

export interface VetWithDetails extends Vet {
  specialities: Speciality[];
  schedules: VetSchedule[];
}

export interface AppointmentWithDetails extends Appointment {
  vet: Vet;
  pet: Pet;
  user: User;
  speciality: Speciality;
  branch: Branch;
  history?: HistoryPet[];
}

export interface ScheduleSlot {
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  vet_id: number;
  speciality_id: number;
  branch_id: number;
  duration_minutes: number;
}

export interface DayAvailability {
  date: string;
  is_holiday: boolean;
  holiday_name?: string;
  available_slots: ScheduleSlot[];
  blocked_slots: AppointmentBlock[];
  existing_appointments: Appointment[];
}

export interface WeekAvailability {
  week_start: string;
  week_end: string;
  days: DayAvailability[];
}

// ========================================
// TIPOS PARA FORMULARIOS Y OPERACIONES
// ========================================

export interface CreateAppointmentData {
  user_id: number;
  date: string;
  hour: string;
  duration_minutes: number;
  speciality_id: number;
  pet_id: number;
  branch_id: number;
  vet_id: number;
  status?: string;
}

export interface UpdateAppointmentData {
  date?: string;
  hour?: string;
  duration_minutes?: number;
  status?: string;
  vet_id?: number;
}

export interface CreateBlockData {
  vet_id: number;
  date: string;
  start_time: string;
  end_time: string;
  reason: string;
}

export interface CreateScheduleData {
  vet_id: number;
  speciality_id: number;
  weekday: number;
  start_time: string;
  end_time: string;
}

export interface UpdateScheduleData {
  weekday?: number;
  start_time?: string;
  end_time?: string;
}

export interface CreateHolidayData {
  name: string;
  date: string;
}

export interface AvailabilityQuery {
  vet_id?: number;
  speciality_id?: number;
  branch_id?: number;
  date_from: string;
  date_to: string;
  duration_minutes?: number;
}

export interface CalendarFilters {
  vet_id?: number;
  speciality_id?: number;
  branch_id?: number;
  status?: AppointmentStatus[];
  date_range?: {
    start: string;
    end: string;
  };
}

// ========================================
// TIPOS DE ESTADO Y ENUMS
// ========================================

export type AppointmentStatus =
  | 'programada'
  | 'confirmada'
  | 'en_curso'
  | 'completada'
  | 'cancelada'
  | 'no_asistio'
  | 'reprogramada';

export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Domingo, 1 = Lunes, etc.

export type UserRoleType = 'admin' | 'veterinario' | 'asistente' | 'cliente';

export type BlockReason =
  | 'vacaciones'
  | 'enfermedad'
  | 'capacitacion'
  | 'emergencia'
  | 'mantenimiento'
  | 'otros';

// ========================================
// TIPOS PARA RESPONSES DE API
// ========================================

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// ========================================
// TIPOS PARA SUPABASE DATABASE
// ========================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'creado_en'>;
        Update: Partial<Omit<User, 'id'>>;
      };
      u_roles: {
        Row: UserRole;
        Insert: Omit<UserRole, 'id'>;
        Update: Partial<Omit<UserRole, 'id'>>;
      };
      vet: {
        Row: Vet;
        Insert: Omit<Vet, 'id'>;
        Update: Partial<Omit<Vet, 'id'>>;
      };
      speciality: {
        Row: Speciality;
        Insert: Omit<Speciality, 'id'>;
        Update: Partial<Omit<Speciality, 'id'>>;
      };
      branch: {
        Row: Branch;
        Insert: Omit<Branch, 'id'>;
        Update: Partial<Omit<Branch, 'id'>>;
      };
      pet: {
        Row: Pet;
        Insert: Omit<Pet, 'id'>;
        Update: Partial<Omit<Pet, 'id'>>;
      };
      appointment: {
        Row: Appointment;
        Insert: Omit<Appointment, 'id'>;
        Update: Partial<Omit<Appointment, 'id'>>;
      };
      vet_schedule: {
        Row: VetSchedule;
        Insert: Omit<VetSchedule, 'id'>;
        Update: Partial<Omit<VetSchedule, 'id'>>;
      };
      appointment_block: {
        Row: AppointmentBlock;
        Insert: Omit<AppointmentBlock, 'id'>;
        Update: Partial<Omit<AppointmentBlock, 'id'>>;
      };
      holiday: {
        Row: Holiday;
        Insert: Omit<Holiday, 'id'>;
        Update: Partial<Omit<Holiday, 'id'>>;
      };
      vets_by_specialities: {
        Row: VetBySpeciality;
        Insert: Omit<VetBySpeciality, 'id'>;
        Update: Partial<Omit<VetBySpeciality, 'id'>>;
      };
      branch_by_specialities: {
        Row: BranchBySpeciality;
        Insert: Omit<BranchBySpeciality, 'id'>;
        Update: Partial<Omit<BranchBySpeciality, 'id'>>;
      };
      history_pet: {
        Row: HistoryPet;
        Insert: Omit<HistoryPet, 'id_entry'>;
        Update: Partial<Omit<HistoryPet, 'id_entry'>>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
