// Define el esquema de validación para el formulario de login usando Zod
import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('Ingrese un email válido'), // Email debe ser string, no vacío y formato de email
  password: z
    .string()
    .min(1, 'La contraseña es requerida')
    .min(6, 'La contraseña debe tener al menos 6 caracteres'), // Contraseña debe ser string, no vacía y al menos 6 caracteres
});

// Define el tipo de datos para el formulario de login, incluyendo un campo opcional para el tipo de usuario
export type LoginFormData = z.infer<typeof loginSchema> & {
  userType?: string; // Campo opcional para el tipo de usuario (administrativo, veterinario)
};
