'use client'; // Este es un Client Component porque usa hooks de React y localStorage

import { useEffect, useState } from 'react';
import Image from 'next/image'; // Usamos el componente Image de Next.js para optimización [^2]
import { useRouter } from 'next/navigation'; // Para redireccionar
import { authService } from '@/services/auth-service'; // Nuestro servicio de autenticación

export default function DashboardPage() {
  const router = useRouter();
  const [greeting, setGreeting] = useState('');
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    // Asegurarse de que el código se ejecute solo en el cliente
    if (typeof window !== 'undefined') {
      // Verificar si el usuario está autenticado
      if (!authService.isAuthenticated()) {
        router.push('/login'); // Redirigir al login si no está autenticado
        return;
      }

      // Obtener datos del usuario

      const userType = authService.getUserType();
      const userData = authService.getUserData();

      if (userType && userData) {
        setUserName(userData.name);
        setUserRole(
          userType === 'administrativo' ? 'Administrador' : 'Veterinario'
        );
      }

      // Determinar el saludo según la hora del día en zona horaria de Guayaquil
      const guayaquilTime = new Date().toLocaleString('en-US', {
        timeZone: 'America/Guayaquil',
      });
      const currentHour = new Date(guayaquilTime).getHours();

      if (currentHour >= 5 && currentHour < 12) {
        setGreeting('Buenos días!');
      } else if (currentHour >= 12 && currentHour < 19) {
        setGreeting('Buenas tardes!');
      } else {
        setGreeting('Buenas noches!');
      }
    }
  }, [router]); // Dependencia del router para evitar warnings

  const handleLogout = async () => {
    await authService.logout();
    router.push('/'); // Redirigir a la página de selección de usuario o login
  };

  // Botones de navegación condicionales basados en permisos
  const adminButtons = [
    { label: 'Calendario de consultas', href: '/dashboard/calendar' },
    { label: 'Historial de pacientes', href: '/dashboard/patients' },
    { label: 'Personal médico', href: '/dashboard/staff' },
  ];

  const vetButtons = [
    { label: 'Calendario de consultas', href: '/dashboard/calendar' },
    { label: 'Historial de pacientes', href: '/dashboard/patients' },
    // Los veterinarios NO tienen acceso a Personal médico
  ];

  const buttonsToShow =
    userRole === 'Administrador' ? adminButtons : vetButtons;

  return (
    <main className="dashboard-container">
      <div className="dashboard-overlay" />{' '}
      {/* Capa de superposición para el fondo */}
      {/* Header con el logo y botón de cerrar sesión */}
      <header className="dashboard-header">
        <Image
          src="/images/logo_home.png"
          alt="Arvivet Clínica Veterinaria Logo"
          width={200}
          height={48}
          className="dashboard-logo"
          priority
        />
        <button onClick={handleLogout} className="dashboard-logout-button">
          Cerrar Sesión
        </button>
      </header>
      {/* Contenedor principal que engloba texto y botones */}
      <section className="dashboard-main-content">
        {/* Contenedor de textos */}
        <div className="dashboard-text-content">
          <div className="dashboard-welcome-text">
            <h1>BIENVENIDO AL SISTEMA ARVISOFT</h1>
          </div>
          <div className="greeting-and-role">
            <p className="greeting-text">{greeting}</p>
            <p className="role-text">{userName}</p>
          </div>
        </div>

        {/* Contenedor de botones */}
        <div className="dashboard-buttons-container">
          <nav
            className="dashboard-buttons"
            role="navigation"
            aria-label="Navegación principal"
          >
            {buttonsToShow.map(button => (
              <a
                key={button.label}
                href={button.href}
                className="dashboard-button"
                role="button"
                tabIndex={0}
              >
                {button.label}
              </a>
            ))}
          </nav>
        </div>
      </section>
    </main>
  );
}
