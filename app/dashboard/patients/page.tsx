// app/dashboard/patients/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowLeft } from 'lucide-react';
import { authService } from '@/services/auth-service';
import { petsService } from '@/services/pets-service';
import { PetWithOwner } from '@/types/database';

export default function PatientsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [pets, setPets] = useState<PetWithOwner[]>([]);
  const [filteredPets, setFilteredPets] = useState<PetWithOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Verificar autenticación
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }

    // Cargar mascotas desde Supabase
    loadPets();
  }, [router]);

  const loadPets = async () => {
    try {
      setLoading(true);
      setError(null);
      const petsData = await petsService.getAllPets();
      setPets(petsData);
      setFilteredPets(petsData);
    } catch (err) {
      setError('Error al cargar las mascotas');
      console.error('Error loading pets:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar mascotas por término de búsqueda
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredPets(pets);
      return;
    }

    const filtered = pets.filter(
      pet =>
        pet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (pet.users?.nombre || '')
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        pet.breed.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredPets(filtered);
  }, [searchTerm, pets]);

  const handlePetClick = (petId: number) => {
    router.push(`/dashboard/patients/${petId}`);
  };

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  const calculateAge = (birthDate: string): string => {
    const birth = new Date(birthDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - birth.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return months > 0
        ? `${months} ${months === 1 ? 'mes' : 'meses'}`
        : `${diffDays} días`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} ${years === 1 ? 'año' : 'años'}`;
    }
  };

  if (loading) {
    return (
      <main className="patients-container">
        <div className="patients-overlay" />
        <div className="loading-message">
          <p>Cargando mascotas...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="patients-container">
        <div className="patients-overlay" />
        <div className="error-message">
          <p>{error}</p>
          <button onClick={loadPets} className="retry-button">
            Reintentar
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="patients-container">
      <div className="patients-overlay" />

      {/* Header */}
      <header className="patients-header">
        <button
          onClick={handleBackToDashboard}
          className="back-button"
          title="Volver al Dashboard"
        >
          <ArrowLeft className="back-icon" />
        </button>
        <h1 className="patients-title">Historial de Pacientes</h1>
      </header>

      {/* Barra de búsqueda */}
      <div className="search-container">
        <div className="search-input-wrapper">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por nombre, dueño, especie o raza..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Grid de mascotas */}
      <div className="pets-grid">
        {filteredPets.map(pet => (
          <div
            key={pet.id}
            className="pet-card"
            onClick={() => handlePetClick(pet.id)}
          >
            <div className="pet-image-container">
              <div className="pet-image-placeholder">
                {pet.pic ? (
                  <img src={pet.pic} alt={pet.name} className="pet-image" />
                ) : (
                  <div className="pet-avatar">{pet.name.charAt(0)}</div>
                )}
              </div>
              <span className="pet-status">Activo</span>
            </div>
            <div className="pet-info">
              <h3 className="pet-name">{pet.name}</h3>
              <p className="pet-details">
                {pet.sex} • {pet.breed}
              </p>
              <p className="pet-owner">
                Dueño: {pet.users?.nombre || 'No asignado'}
              </p>
              <p className="pet-age">Edad: {calculateAge(pet.birth_date)}</p>
              <p className="pet-weight">Peso: {pet.weigth} kg</p>
            </div>
          </div>
        ))}
      </div>

      {!loading && filteredPets.length === 0 && (
        <div className="no-results">
          <p>No se encontraron mascotas que coincidan con tu búsqueda.</p>
        </div>
      )}
    </main>
  );
}
