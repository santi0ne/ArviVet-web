'use client'; // Marca este componente como un Client Component de React

import { useState, useEffect } from 'react'; // Hooks de React
import { useForm } from 'react-hook-form'; // Librería para manejo de formularios
import { zodResolver } from '@hookform/resolvers/zod'; // Integración de Zod con React Hook Form
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react'; // Iconos
import { useRouter } from 'next/navigation'; // Hook de Next.js para navegación

import { loginSchema, type LoginFormData } from '@/lib/validations/auth'; // Esquema de validación y tipo de datos
import { useAuth } from '@/hooks/use-auth'; // Hook personalizado para lógica de autenticación

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false); // Estado para mostrar/ocultar contraseña
  const [userType, setUserType] = useState<string>(''); // Estado para el tipo de usuario seleccionado
  const { login, isLoading } = useAuth(); // Hook personalizado para login y estado de carga
  const router = useRouter(); // Inicializa el router para navegación

  // Efecto para obtener el tipo de usuario del localStorage al cargar el componente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Asegura que el código se ejecute solo en el navegador
      const selectedUserType = localStorage.getItem('selectedUserType');
      if (selectedUserType) {
        setUserType(selectedUserType);
      }
    }
  }, []); // Se ejecuta una sola vez al montar el componente

  // Configuración del formulario con React Hook Form y Zod
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema), // Usa Zod para la validación
    defaultValues: {
      // Valores iniciales del formulario
      email: '',
      password: '',
    },
    mode: 'onChange', // Valida al cambiar los campos
  });

  // Función que se ejecuta al enviar el formulario
  const onSubmit = async (data: LoginFormData) => {
    try {
      await login({ ...data, userType }); // Llama a la función de login con los datos y el tipo de usuario
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  // Función para alternar la visibilidad de la contraseña
  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  // Función para volver a la página de selección de usuario
  const handleBackToSelection = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('selectedUserType'); // Limpia el tipo de usuario del localStorage
    }
    router.push('/'); // Redirige a la página principal
  };

  // Función para obtener el título del formulario según el tipo de usuario
  const getUserTypeTitle = () => {
    switch (userType) {
      case 'administrativo':
        return 'Acceso Administrativo';
      case 'veterinario':
        return 'Acceso Veterinario';
      default:
        return 'Accede a tu cuenta';
    }
  };

  return (
    <div className="card">
      {' '}
      {/* Contenedor principal del formulario (estilo de tarjeta) */}
      <div className="card-header">
        {' '}
        {/* Cabecera de la tarjeta */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}
        >
          {/* Botón para volver a la selección de usuario */}
          <button
            onClick={handleBackToSelection}
            className="button button-ghost"
            style={{ padding: '0.5rem', borderRadius: '50%' }}
            title="Volver a selección de usuario"
          >
            <ArrowLeft className="icon" /> {/* Icono de flecha izquierda */}
          </button>
        </div>
        <h2 className="card-title">{getUserTypeTitle()}</h2>{' '}
        {/* Título del formulario */}
      </div>
      <div className="card-content">
        {' '}
        {/* Contenido del formulario */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="form">
          {' '}
          {/* Formulario */}
          {/* Campo de Email */}
          <div className="form-item">
            <label
              htmlFor="email"
              className={`form-label ${form.formState.errors.email ? 'error' : ''}`}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="Ingrese su correo electrónico"
              className="input"
              disabled={isLoading} // Deshabilita el campo si está cargando
              {...form.register('email')} // Registra el campo con React Hook Form
            />
            {form.formState.errors.email && (
              <p className="form-message">
                {form.formState.errors.email.message}
              </p>
            )}{' '}
            {/* Mensaje de error */}
          </div>
          {/* Campo de Contraseña */}
          <div className="form-item">
            <label
              htmlFor="password"
              className={`form-label ${form.formState.errors.password ? 'error' : ''}`}
            >
              Contraseña
            </label>
            <div className="input-container">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'} // Cambia el tipo para mostrar/ocultar
                placeholder="Ingrese su contraseña"
                className="input input-with-icon"
                disabled={isLoading}
                {...form.register('password')}
              />
              <button
                type="button"
                className="button button-ghost button-icon"
                onClick={togglePasswordVisibility}
                disabled={isLoading}
                aria-label={
                  showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                }
              >
                {showPassword ? (
                  <EyeOff className="icon" />
                ) : (
                  <Eye className="icon" />
                )}{' '}
                {/* Icono de ojo */}
              </button>
            </div>
            {form.formState.errors.password && (
              <p className="form-message">
                {form.formState.errors.password.message}
              </p>
            )}{' '}
            {/* Mensaje de error */}
          </div>
          {/* Botón de Enviar */}
          <button
            type="submit"
            className="button button-default button-full-width"
            disabled={isLoading}
          >
            {isLoading ? ( // Muestra spinner si está cargando
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="icon spinner" /> {/* Icono de carga */}
                Ingresando...
              </div>
            ) : (
              'Ingresar al Sistema'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
