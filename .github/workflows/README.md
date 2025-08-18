# GitHub Actions CI/CD Documentation

## 📋 Workflows Overview

Este proyecto utiliza GitHub Actions para implementar un pipeline completo de CI/CD. Los workflows están diseñados para garantizar la calidad del código y automatizar el proceso de despliegue.

### 🔧 Workflows Configurados

#### 1. **CI Pipeline** (`ci.yml`)

**Trigger:** Push y Pull Requests a `main` y `develop`

**Jobs:**

- **code-quality**: Verificación de tipos TypeScript, ESLint y formato con Prettier
- **unit-tests**: Ejecución de pruebas unitarias con Jest
- **build**: Compilación de la aplicación Next.js
- **security-scan**: Análisis de vulnerabilidades con npm audit, CodeQL y Snyk
- **integration-tests**: Pruebas de integración básicas
- **performance-tests**: Análisis de rendimiento con Lighthouse (solo PRs)
- **notify-success**: Notificación de éxito del pipeline

#### 2. **E2E Tests** (`e2e-tests.yml`)

**Trigger:** Push y Pull Requests a `main`

**Funciones:**

- Pruebas end-to-end con Playwright
- Verificación de funcionalidades críticas
- Capturas de pantalla en caso de fallos

#### 3. **Deploy** (`deploy.yml`)

**Trigger:** Push a `main` o manual

**Funciones:**

- Despliegue condicional tras pasar todas las pruebas
- Empaquetado de artefactos de build
- Soporte para Vercel y AWS S3 (comentado)

## 🚀 Comandos Disponibles

### Testing

```bash
npm test                # Ejecutar pruebas
npm run test:watch     # Pruebas en modo watch
npm run test:coverage  # Pruebas con cobertura
npm run test:ci        # Pruebas para CI
```

### Code Quality

```bash
npm run lint           # ESLint
npm run type-check     # TypeScript checking
npm run format         # Formatear código
npm run format:check   # Verificar formato
```

### Build

```bash
npm run build          # Compilar aplicación
npm run start          # Iniciar aplicación compilada
```

## 🔒 Secrets Requeridos

Para habilitar todas las funcionalidades, configure estos secrets en GitHub:

### Seguridad (Opcional)

- `SNYK_TOKEN`: Token de Snyk para análisis de seguridad
- `CODECOV_TOKEN`: Token de Codecov para reportes de cobertura

### Deployment (Opcional)

- `VERCEL_TOKEN`: Token de Vercel
- `VERCEL_ORG_ID`: ID de organización Vercel
- `VERCEL_PROJECT_ID`: ID del proyecto Vercel

### AWS (Opcional)

- `AWS_ACCESS_KEY_ID`: Access Key ID de AWS
- `AWS_SECRET_ACCESS_KEY`: Secret Access Key de AWS
- `AWS_S3_BUCKET`: Nombre del bucket S3

## 📊 Coverage y Reportes

- **Cobertura de código**: Generada con Jest, disponible en `/coverage`
- **Reportes de seguridad**: CodeQL genera reportes automáticos
- **Performance**: Lighthouse CI genera reportes de rendimiento

## 🛠 Configuración Local

### 1. Instalar dependencias

```bash
npm install --legacy-peer-deps
```

### 2. Ejecutar pruebas localmente

```bash
npm test
```

### 3. Verificar calidad de código

```bash
npm run lint
npm run type-check
npm run format:check
```

### 4. Build local

```bash
npm run build
npm run start
```

## 🎯 Best Practices

### Commits

- Cada commit debe pasar todas las verificaciones de CI
- Use mensajes de commit descriptivos
- Mantenga commits pequeños y enfocados

### Pull Requests

- Asegúrese de que todas las verificaciones pasen
- Incluya tests para nuevas funcionalidades
- Actualice documentación si es necesario

### Testing

- Escriba tests para nuevas funcionalidades
- Mantenga alta cobertura de código (>80%)
- Use nombres descriptivos para tests

## 🐛 Troubleshooting

### Tests Fallando

1. Ejecute tests localmente: `npm test`
2. Verifique configuración de Jest
3. Revise mocks y setup

### Build Errors

1. Ejecute build localmente: `npm run build`
2. Verifique errores de TypeScript: `npm run type-check`
3. Revise configuración de Next.js

### Linting Errors

1. Ejecute ESLint: `npm run lint`
2. Auto-fix: `npm run lint -- --fix`
3. Formatee código: `npm run format`

## 📈 Monitoreo

- **GitHub Actions**: Revise el estado de workflows en la pestaña "Actions"
- **Pull Requests**: Verificaciones automáticas en cada PR
- **Main Branch**: Deployment automático tras merge exitoso

## 🔄 Actualización de Workflows

Para modificar los workflows:

1. Edite archivos en `.github/workflows/`
2. Teste cambios en branch de feature
3. Revise logs de GitHub Actions
4. Merge tras verificación exitosa

---

**Nota**: Esta configuración está optimizada para proyectos Next.js con TypeScript. Ajuste según las necesidades específicas de su proyecto.
