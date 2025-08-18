// Esta es la página de login
import { LoginForm } from '@/components/auth/login-form'; // Importa el componente del formulario de login

export default function LoginPage() {
  return (
    <main className="main-container">
      <div className="background-overlay" />{' '}
      {/* Capa de superposición para el fondo */}
      {/* Logo de la marca en la esquina (opcional, puedes quitarlo si no lo quieres aquí) */}
      <div className="brand-logo"></div>
      {/* Contenedor del formulario de login */}
      <div className="form-container">
        <LoginForm />
      </div>
    </main>
  );
}
