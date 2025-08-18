# 🐾 ARVI VET SYSTEM

Aplicación web para la gestión veterinaria desarrollada con **Next.js**, **TypeScript**, **App Router** y soporte para íconos de `lucide-react`. Este README contiene todos los pasos necesarios para correr el proyecto en tu entorno local.

---

## 🚀 Requisitos Previos

Asegúrate de tener instalado lo siguiente:

- **Node.js** (v18 o superior)
- **npm** (v9 o superior)

Verifica con:

node -v
npm -v

## 📦 Instalación del Proyecto

### 1. Crear el proyecto base (solo si aún no existe)

npx create-next-app@latest arvi-vet-system --typescript --eslint --app --no-src-dir --import-alias "@/\*"

Selecciona lo siguiente durante la configuración interactiva:

- ✔ Would you like to use Tailwind CSS? → No
- ✔ Would you like to use `src/` directory? → No
- ✔ Would you like to use experimental `app/` directory? → Yes
- ✔ Would you like to use import alias? → Yes (usa @/\*)

### 2. Instalar las dependencias iniciales

npm install

### 3. Instalar lucide-react (íconos)

npm install lucide-react@0.263.1 --legacy-peer-deps

Nota: Usamos --legacy-peer-deps porque esta versión aún no es totalmente compatible con React 19.

## Ejecutar la aplicación

Para iniciar el servidor en modo desarrollo:
npm run dev

Luego abre tu navegador en:
http://localhost:3000

## Estructura del Proyecto

- arvi-vet-system/
- │
- ├── app/ # Rutas y páginas del sistema (Next.js App Router)
- │ ├── page.tsx # Página principal
- │ └── layout.tsx # Layout general
- │
- ├── public/ # Archivos estáticos
- ├── styles/ # Estilos globale (si se usan)
- ├── .eslintrc.json # Configuración ESLint
- ├── tsconfig.json # Configuración TypeScript con alias "@/\*"
- ├── package.json # Scripts y dependencias
- └── README.md # Este documento

## 🧩 Dependencias principales

- Next.js
- React
- TypeScript
- Lucide React
