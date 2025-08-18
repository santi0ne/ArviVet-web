import type React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // Importa tus estilos CSS puros

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ARVI VET - Sistema Veterinario',
  description:
    'Sistema de gestión veterinaria ARVI VET - Consultorio Veterinario',
  keywords: 'veterinario, mascotas, consulta, ARVI VET',
  generator: 'v0.dev',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
