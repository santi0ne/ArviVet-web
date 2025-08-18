'use client'; // Marca este componente como un Client Component de React

import { useRouter } from 'next/navigation'; // Hook de Next.js para navegación
import { ChevronDown } from 'lucide-react'; // Icono de flecha hacia abajo

export function UserSelection() {
  const router = useRouter(); // Inicializa el router para navegación

  // Función que se ejecuta al seleccionar un tipo de usuario
  const handleUserTypeSelect = (userType: string) => {
    // Guarda el tipo de usuario seleccionado en localStorage (solo en el navegador)
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedUserType', userType);
    }
    // Redirige a la página de login
    router.push('/login');
  };

  return (
    <div className="welcome-content">
      {' '}
      {/* Contenedor principal del contenido de bienvenida */}
      <div className="welcome-text">
        {' '}
        {/* Contenedor para los textos de bienvenida */}
        <h1 className="welcome-title">Bienvenidos al</h1>{' '}
        {/* Título principal */}
        <h2 className="welcome-subtitle">Veterinario</h2> {/* Subtítulo */}
        <div className="arvi-brand">
          {' '}
          {/* Contenedor para el logo ARVI VET */}
          <span className="arvi-text glow-effect">ARVI</span>{' '}
          {/* Texto "ARVI" con efecto glow */}
          <span className="vet-text glow-effect">VET</span>{' '}
          {/* Texto "VET" con efecto glow */}
        </div>
      </div>
      <div className="user-selector">
        {' '}
        {/* Contenedor del selector de usuario (dropdown) */}
        <button className="user-button">
          {' '}
          {/* Botón principal del dropdown */}
          Usuario
          <ChevronDown className="dropdown-icon" /> {/* Icono de flecha */}
        </button>
        <div className="dropdown-menu">
          {' '}
          {/* Menú desplegable */}
          {/* Opción para usuario Administrativo */}
          <button
            className="dropdown-item"
            onClick={() => handleUserTypeSelect('administrativo')}
          >
            Administrativo
          </button>
          {/* Opción para usuario Veterinario */}
          <button
            className="dropdown-item"
            onClick={() => handleUserTypeSelect('veterinario')}
          >
            Veterinario
          </button>
        </div>
      </div>
    </div>
  );
}
