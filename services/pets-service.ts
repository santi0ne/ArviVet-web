import { supabase } from "@/lib/supabase";
import {
  Pet,
  PetWithOwner,
  Appointment,
  PatientHistory,
} from "@/types/database";

export const petsService = {
  // Obtener todas las mascotas con información del dueño
  async getAllPets(): Promise<PetWithOwner[]> {
    try {

      const { data, error } = await supabase
        .from("pet")
        .select(
          `
          *,
          users:owner_id (
            id,
            nombre,
            correo,
            telefono
          )
        `
        )
        .order("id", { ascending: false });

      if (error) {
        console.error("Error fetching pets:", error);
        console.error("Error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        // Si es un error de RLS, dar más información específica
        if (error.code === '42501' || error.message.includes('row-level security')) {
          throw new Error(`Sin permisos para ver las mascotas. Verifique las políticas RLS en Supabase.`);
        }
        
        if (error.code === 'PGRST116') {
          throw new Error("La tabla 'pet' no existe o no tiene permisos de lectura.");
        }
        
        throw error;
      }

      console.log("Pets fetched successfully:", data?.length || 0);
      console.log("Sample pet data:", data?.[0]);
      return data || [];
    } catch (error) {
      console.error("getAllPets error:", error);
      throw error;
    }
  },

  // Obtener una mascota por ID con información del dueño
  async getPetById(id: number): Promise<PetWithOwner | null> {
    const { data, error } = await supabase
      .from("pet")
      .select(
        `
        *,
        users:owner_id (
          id,
          nombre,
          correo,
          telefono
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching pet:", error);
      throw error;
    }

    return data;
  },

  // Obtener historial médico de una mascota (citas)
  async getMedicalHistory(petId: number): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from("appointment")
      .select(`
        *,
        vet:vet_id (
          id,
          name,
          email,
          telephone
        ),
        branch:branch_id (
          id,
          direction,
          telephone
        ),
        speciality:speciality_id (
          id,
          name,
          description
        )
      `)
      .eq("pet_id", petId)
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching medical history:", error);
      throw error;
    }

    return data || [];
  },

  // Obtener historial completo del paciente (mascota + citas)
  async getPatientHistory(petId: number): Promise<PatientHistory | null> {
    try {
      const [pet, appointments] = await Promise.all([
        this.getPetById(petId),
        this.getMedicalHistory(petId),
      ]);

      if (!pet) {
        return null;
      }

      return {
        pet,
        appointments,
      };
    } catch (error) {
      console.error("Error fetching patient history:", error);
      throw error;
    }
  },

  // Buscar mascotas por término
  async searchPets(searchTerm: string): Promise<PetWithOwner[]> {
    const { data, error } = await supabase
      .from("pet")
      .select(
        `
        *,
        users:owner_id (
          id,
          nombre,
          correo,
          telefono
        )
      `
      )
      .or(`name.ilike.%${searchTerm}%,breed.ilike.%${searchTerm}%`)
      .order("id", { ascending: false });

    if (error) {
      console.error("Error searching pets:", error);
      throw error;
    }

    return data || [];
  },
};
