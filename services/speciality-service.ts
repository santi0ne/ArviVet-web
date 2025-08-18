import { supabase, createSupabaseResponse } from '@/lib/supabase';
import type { ApiResponse } from '@/types/database';

export interface Speciality {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateSpecialityData {
  name: string;
  description?: string;
}

export interface UpdateSpecialityData {
  name?: string;
  description?: string;
}

/**
 * Servicio para gestión de especialidades veterinarias
 */
class SpecialityService {
  
  /**
   * Obtiene todas las especialidades
   */
  async getAllSpecialities(): Promise<ApiResponse<Speciality[]>> {
    try {
      const { data, error } = await supabase
        .from('speciality')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      return createSupabaseResponse(data || []);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Obtiene una especialidad por ID
   */
  async getSpecialityById(id: number): Promise<ApiResponse<Speciality>> {
    try {
      const { data, error } = await supabase
        .from('speciality')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return createSupabaseResponse(data);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Crea una nueva especialidad
   */
  async createSpeciality(specialityData: CreateSpecialityData): Promise<ApiResponse<Speciality>> {
    try {
      const { data, error } = await supabase
        .from('speciality')
        .insert(specialityData)
        .select()
        .single();

      if (error) throw error;

      return createSupabaseResponse(data);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Actualiza una especialidad existente
   */
  async updateSpeciality(
    id: number, 
    updateData: UpdateSpecialityData
  ): Promise<ApiResponse<Speciality>> {
    try {
      const { data, error } = await supabase
        .from('speciality')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return createSupabaseResponse(data);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Elimina una especialidad
   */
  async deleteSpeciality(id: number): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('speciality')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return createSupabaseResponse(true);
    } catch (error) {
      return createSupabaseResponse(false, error);
    }
  }

  /**
   * Obtiene especialidades con sus veterinarios asociados
   */
  async getSpecialitiesWithVets(): Promise<ApiResponse<Array<Speciality & { vets: any[] }>>> {
    try {
      const { data, error } = await supabase
        .from('speciality')
        .select(`
          *,
          vets_by_specialities!inner(
            vet!inner(id, name, email, telephone)
          )
        `)
        .order('name', { ascending: true });

      if (error) throw error;

      return createSupabaseResponse(data || []);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }

  /**
   * Busca especialidades por nombre
   */
  async searchSpecialities(query: string): Promise<ApiResponse<Speciality[]>> {
    try {
      const { data, error } = await supabase
        .from('speciality')
        .select('*')
        .ilike('name', `%${query}%`)
        .order('name', { ascending: true });

      if (error) throw error;

      return createSupabaseResponse(data || []);
    } catch (error) {
      return createSupabaseResponse(null, error);
    }
  }
}

export const specialityService = new SpecialityService();