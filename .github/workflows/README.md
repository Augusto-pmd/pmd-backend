# CI/CD Pipeline - Configuración

Este pipeline automatiza el build y deploy del backend (NestJS) y frontend (Next.js).

## 🚀 Características

- ✅ Checkout automático del repositorio
- ✅ Setup de Node.js con caché de dependencias
- ✅ Instalación de dependencias (npm/yarn/pnpm)
- ✅ Type check y lint para backend y frontend
- ✅ Build de backend (NestJS) y frontend (Next.js)
- ✅ Deploy automático a Render (backend) y Vercel (frontend)
- ✅ Logs detallados y resumen de deployment

## 📋 Requisitos Previos

### Variables de Entorno en GitHub Secrets

Configura las siguientes variables en tu repositorio de GitHub:
**Settings → Secrets and variables → Actions → New repository secret**

#### Para Render (Backend):
- `RENDER_TOKEN`: Token de API de Render
  - Obtener en: https://dashboard.render.com → Account Settings → API Tokens
- `RENDER_SERVICE_ID`: ID del servicio en Render
  - Encontrar en: https://dashboard.render.com → Tu servicio → Settings → Service ID

#### Para Vercel (Frontend):
- `VERCEL_TOKEN`: Token de API de Vercel
  - Obtener en: https://vercel.com/account/tokens
- `VERCEL_ORG_ID`: ID de la organización (opcional, se detecta automáticamente)
- `VERCEL_PROJECT_ID`: ID del proyecto (opcional, se detecta automáticamente)

## 📁 Estructura del Proyecto

El pipeline espera una de las siguientes estructuras:

### Opción 1: Monorepo
```
.
├── package.json (backend)
├── src/ (backend)
├── frontend/
│   ├── package.json
│   └── next.config.js
└── .github/workflows/
```

### Opción 2: Frontend en raíz
```
.
├── package.json (backend)
├── src/ (backend)
├── package.json (frontend - si es monorepo)
├── next.config.js
└── .github/workflows/
```

Si tu frontend está en otro directorio, ajusta la variable `FRONTEND_DIR` en el workflow.

## 🔄 Triggers

El pipeline se ejecuta automáticamente en:
- Push a `main`, `master`, o `develop`
- Pull requests a `main` o `master`
- Ejecución manual (workflow_dispatch)

**Nota**: Los deploys solo se ejecutan en push (no en PRs).

## 📊 Outputs del Pipeline

El pipeline genera los siguientes outputs:
- `backend-build-status`: Estado del build del backend
- `frontend-build-status`: Estado del build del frontend
- `backend-deploy-status`: Estado del deploy a Render
- `frontend-deploy-status`: Estado del deploy a Vercel

## 🛠️ Comandos del Pipeline

### Backend (NestJS)
1. `npm ci` - Instalar dependencias
2. `npx tsc --noEmit` - Type check
3. `npm run lint` - Lint (no bloquea si hay errores)
4. `npm run build` - Build

### Frontend (Next.js)
1. `npm ci` / `yarn install` / `pnpm install` - Instalar dependencias
2. `npx tsc --noEmit` - Type check (si existe tsconfig.json)
3. `npm run lint` - Lint (si existe script)
4. `npm run build` - Build

## 🔍 Troubleshooting

### El frontend no se detecta
- Verifica que exista `frontend/package.json` o `package.json` con `next.config.*` en la raíz
- Ajusta `FRONTEND_DIR` en el workflow si está en otro directorio

### Error en deploy a Render
- Verifica que `RENDER_TOKEN` y `RENDER_SERVICE_ID` estén configurados
- Asegúrate de que el token tenga permisos de deploy

### Error en deploy a Vercel
- Verifica que `VERCEL_TOKEN` esté configurado
- Si es la primera vez, puede necesitar vincular el proyecto manualmente primero

### Caché de dependencias
- El pipeline usa caché automático de npm
- Si hay problemas, el caché se regenera automáticamente

## 📝 Notas

- Los fallos en cualquier paso detienen el pipeline (excepto lint que es no-bloqueante)
- Los deploys solo ocurren en push a ramas principales (no en PRs)
- El pipeline detecta automáticamente si el frontend existe


