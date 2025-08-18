// Esta es la página principal que muestra la selección de usuario
import { UserSelection } from '@/components/auth/user-selection'; // Importa el componente de selección de usuario

export default function HomePage() {
  return (
    <main className="welcome-container">
      <UserSelection />
    </main>
  );
}
